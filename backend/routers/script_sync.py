# backend/routers/script_sync.py

import json
import logging
from typing import Dict, Set, Optional
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime

import models
import schemas.websocket as websocket_schemas
from database import get_db
from .auth import get_current_user_from_token, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["script-sync"])

# Connection manager for WebSocket connections
class ScriptConnectionManager:
    def __init__(self):
        # Active connections organized by script_id
        self.connections: Dict[str, Set[WebSocket]] = {}
        # Track connection metadata (user info, permissions, etc.)
        self.connection_info: Dict[WebSocket, dict] = {}
        # Track current playback state per script for late joiner sync
        self.script_playback_state: Dict[str, dict] = {}
    
    async def connect(self, websocket: WebSocket, script_id: str, connection_info: dict):
        """Accept WebSocket connection and add to script room"""
        await websocket.accept()
        
        # Add to script room
        if script_id not in self.connections:
            self.connections[script_id] = set()
        self.connections[script_id].add(websocket)
        
        # Store connection metadata
        self.connection_info[websocket] = {
            "script_id": script_id,
            "connected_at": datetime.now(),
            **connection_info
        }
        
        logger.info(f"WebSocket connected to script {script_id}. Total connections: {len(self.connections[script_id])}")
        
        # Broadcast updated connection count to other existing clients
        if len(self.connections[script_id]) > 1:
            connection_update = websocket_schemas.ConnectionEstablishedResponse(
                script_id=script_id,
                access_type="connection_update", 
                connected_users=len(self.connections[script_id])
            )
            await self.broadcast_to_script(script_id, connection_update.model_dump_json(), exclude_websocket=websocket)
        
        # Send current playback state to new joiner if one exists
        if script_id in self.script_playback_state:
            current_state = self.script_playback_state[script_id]
            playback_message = {
                "type": "playback_command",
                "command": current_state["command"],
                "timestamp_ms": current_state["timestamp_ms"],
                "show_time_ms": current_state.get("show_time_ms"),
                "start_time": current_state.get("start_time"),
                "cumulative_delay_ms": current_state.get("cumulative_delay_ms")
            }
            await websocket.send_text(json.dumps(playback_message))
    
    async def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection from all rooms"""
        if websocket in self.connection_info:
            script_id = self.connection_info[websocket]["script_id"]
            
            # Remove from script room
            if script_id in self.connections:
                self.connections[script_id].discard(websocket)
                if not self.connections[script_id]:
                    del self.connections[script_id]
            
            # Remove metadata
            del self.connection_info[websocket]
            
            logger.debug(f"WebSocket disconnected from script {script_id}")
            
            # Broadcast updated connection count to remaining clients
            if script_id in self.connections and self.connections[script_id]:
                remaining_count = len(self.connections[script_id])
                connection_update = websocket_schemas.ConnectionEstablishedResponse(
                    script_id=script_id,
                    access_type="connection_update",
                    connected_users=remaining_count
                )
                await self.broadcast_to_script(script_id, connection_update.model_dump_json())
    
    async def broadcast_to_script(self, script_id: str, message_json: str, exclude_websocket: Optional[WebSocket] = None):
        """Broadcast message to all connections in a script room"""
        if script_id not in self.connections:
            return
        
        disconnected_websockets = []
        
        for websocket in self.connections[script_id]:
            if websocket == exclude_websocket:
                continue
                
            try:
                await websocket.send_text(message_json)
            except Exception as e:
                logger.error(f"Error sending message to WebSocket: {e}")
                disconnected_websockets.append(websocket)
        
        # Clean up disconnected websockets
        for websocket in disconnected_websockets:
            await self.disconnect(websocket)
    
    def get_connection_count(self, script_id: str) -> int:
        """Get number of active connections for a script"""
        return len(self.connections.get(script_id, []))
    
    def get_connection_info_for_script(self, script_id: str) -> list:
        """Get connection metadata for all users connected to a script"""
        if script_id not in self.connections:
            return []
        
        info_list = []
        for websocket in self.connections[script_id]:
            if websocket in self.connection_info:
                info = self.connection_info[websocket].copy()
                # Remove sensitive data
                info.pop("websocket", None)
                info_list.append(info)
        
        return info_list

# Global connection manager instance
connection_manager = ScriptConnectionManager()

async def validate_script_access(script_id: UUID, share_token: Optional[str], user_token: Optional[str], db: Session):
    """Validate that user has access to script via authentication OR share token"""
    
    # Try authentication first
    if user_token:
        try:
            user = await get_current_user_from_token(user_token, db)
            # Load script and its show in a single query
            script_show = (
                db.query(models.Script, models.Show)
                .join(models.Show, models.Show.show_id == models.Script.show_id)
                .filter(models.Script.script_id == script_id)
                .first()
            )
            if not script_show:
                raise HTTPException(status_code=404, detail="Script not found")
            script, show = script_show
            
            # Check if user owns the show that contains this script
            if show.owner_id == user.user_id:
                return {
                    "access_type": "owner",
                    "user_id": str(user.user_id),
                    "user_name": f"{user.fullname_first} {user.fullname_last}".strip(),
                    "share_token": None
                }
            
            # Check if user has crew assignment for this show
            crew_assignment = db.query(models.CrewAssignment).filter(
                models.CrewAssignment.show_id == script.show_id,
                models.CrewAssignment.user_id == user.user_id,
                models.CrewAssignment.is_active == True
            ).first()
            
            if crew_assignment:
                return {
                    "access_type": "crew_member",
                    "user_id": str(user.user_id),
                    "user_name": f"{user.fullname_first} {user.fullname_last}".strip(),
                    "share_token": None
                }
                
        except Exception as e:
            logger.debug(f"Auth validation failed: {e}")
            # Fall through to share token validation
    
    # Try share token access
    if share_token:
        crew_assignment = db.query(models.CrewAssignment).filter(
            models.CrewAssignment.share_token == share_token,
            models.CrewAssignment.is_active == True
        ).first()
        
        if crew_assignment:
            # Get the script to verify it belongs to the shared show
            script = db.query(models.Script).filter(
                models.Script.script_id == script_id,
                models.Script.show_id == crew_assignment.show_id,
                models.Script.is_shared == True  # Must be shared to access via token
            ).first()
            
            if script:
                # Get user info for the crew member
                user = db.query(models.User).filter(models.User.user_id == crew_assignment.user_id).first()
                user_name = f"{user.fullname_first} {user.fullname_last}".strip() if user else "Guest User"
                
                return {
                    "access_type": "shared_access",
                    "user_id": str(crew_assignment.user_id),
                    "user_name": user_name,
                    "share_token": share_token
                }
    
    # No valid access found
    raise HTTPException(status_code=403, detail="Access denied: Invalid authentication or share token")

@router.websocket("/script/{script_id}")
async def script_websocket(
    websocket: WebSocket,
    script_id: UUID,
    share_token: Optional[str] = Query(None),
    user_token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time script synchronization"""
    
    try:
        # Validate access permissions
        access_info = await validate_script_access(script_id, share_token, user_token, db)
        
        # Connect to WebSocket
        await connection_manager.connect(websocket, str(script_id), access_info)
        
        # Send connection confirmation
        connection_response = websocket_schemas.ConnectionEstablishedResponse(
            script_id=str(script_id),
            access_type=access_info["access_type"],
            connected_users=connection_manager.get_connection_count(str(script_id))
        )
        await websocket.send_text(connection_response.model_dump_json())
        
        # Listen for messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Validate message format
                if "type" not in message:
                    error_response = websocket_schemas.WebSocketErrorResponse(
                        message="Invalid message format: missing 'type' field"
                    )
                    await websocket.send_text(error_response.model_dump_json())
                    continue
                
                # Handle different message types
                await handle_script_update(websocket, str(script_id), message, access_info, db)
                
            except json.JSONDecodeError:
                error_response = websocket_schemas.WebSocketErrorResponse(
                    message="Invalid JSON format"
                )
                await websocket.send_text(error_response.model_dump_json())
                continue
                
    except HTTPException as e:
        # Send error and close connection
        await websocket.close(code=4003, reason=e.detail)
        
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket)
        
    except Exception as e:
        logger.error(f"Unexpected error in script WebSocket: {e}")
        await connection_manager.disconnect(websocket)
        await websocket.close(code=4000, reason="Internal server error")

async def handle_script_update(websocket: WebSocket, script_id: str, message: dict, access_info: dict, db: Session):
    """Handle incoming script update messages"""
    
    message_type = message.get("type")
    logger.info(f"📨 WebSocket message received - type: {message_type}")
    
    # Allow certain message types for all users, restrict script_update for owners/crew only
    if message_type == "script_update" and access_info["access_type"] not in ["owner", "crew_member"]:
        error_response = websocket_schemas.WebSocketErrorResponse(
            message="Permission denied: Read-only access for script updates"
        )
        await websocket.send_text(error_response.model_dump_json())
        return
    
    if message_type == "script_update":
        # Validate required fields
        required_fields = ["update_type", "changes"]
        for field in required_fields:
            if field not in message:
                error_response = websocket_schemas.WebSocketErrorResponse(
                    message=f"Missing required field: {field}"
                )
                await websocket.send_text(error_response.model_dump_json())
                return
        
        # Create update message for broadcasting
        update_response = websocket_schemas.ScriptUpdateResponse(
            script_id=script_id,
            update_type=message["update_type"],
            changes=message["changes"],
            updated_by=access_info["user_name"],
            updated_by_id=access_info["user_id"],
            operation_id=message.get("operation_id")  # Optional: for edit queue integration
        )
        
        # Broadcast to all other connections in the script room
        await connection_manager.broadcast_to_script(script_id, update_response.model_dump_json(), exclude_websocket=websocket)
        
        # Send confirmation back to sender
        confirmation_response = websocket_schemas.UpdateConfirmedResponse(
            operation_id=message.get("operation_id")
        )
        await websocket.send_text(confirmation_response.model_dump_json())
        
        logger.info(f"Script update broadcast: {message_type} for script {script_id} by {access_info['user_name']}")
    
    elif message_type == "ping":
        # Heartbeat/keepalive
        pong_response = websocket_schemas.PongResponse()
        await websocket.send_text(pong_response.model_dump_json())
    
    elif message_type == "get_connection_info":
        # Request info about other connected users
        connections_info = connection_manager.get_connection_info_for_script(script_id)
        connection_info_response = websocket_schemas.ConnectionInfoResponse(
            script_id=script_id,
            connections=connections_info,
            total_connected=len(connections_info)
        )
        await websocket.send_text(connection_info_response.model_dump_json())
    
    elif message_type == "playback_command":
        # Handle playback synchronization commands (only from owners/crew)
        if access_info["access_type"] not in ["owner", "crew_member"]:
            error_response = websocket_schemas.WebSocketErrorResponse(
                message="Permission denied: Only script owners can control playback"
            )
            await websocket.send_text(error_response.model_dump_json())
            return
        
        command = message.get("command")
        cumulative_delay_ms = message.get("cumulative_delay_ms")
        logger.info(f"🎮 BACKEND: Received {command} command with cumulative_delay_ms: {cumulative_delay_ms}")
        
        if command not in ["PLAY", "PAUSE", "SAFETY", "COMPLETE", "STOP"]:
            error_response = websocket_schemas.WebSocketErrorResponse(
                message=f"Invalid playback command: {command}"
            )
            await websocket.send_text(error_response.model_dump_json())
            return
        
        # Create playback command response for broadcasting
        playback_response = websocket_schemas.PlaybackCommandResponse(
            script_id=script_id,
            command=command,
            timestamp_ms=int(datetime.now().timestamp() * 1000),
            show_time_ms=message.get("show_time_ms"),
            start_time=message.get("start_time"),
            cumulative_delay_ms=message.get("cumulative_delay_ms")
        )
        
        # Update server-side playback state for late joiner sync (exclude STOP commands)
        if command == "STOP":
            connection_manager.script_playback_state.pop(script_id, None)
        else:
            connection_manager.script_playback_state[script_id] = {
                "command": command,
                "timestamp_ms": playback_response.timestamp_ms,
                "show_time_ms": message.get("show_time_ms"),
                "start_time": message.get("start_time"),
                "cumulative_delay_ms": message.get("cumulative_delay_ms")
            }
        
        # Broadcast to all connections in the script room (including sender for confirmation)
        await connection_manager.broadcast_to_script(script_id, playback_response.model_dump_json())
        
        logger.info(f"Playback command broadcast: {command} for script {script_id} by {access_info['user_name']}")
    
    else:
        error_response = websocket_schemas.WebSocketErrorResponse(
            message=f"Unknown message type: {message_type}"
        )
        await websocket.send_text(error_response.model_dump_json())

# HTTP endpoint to get connection info (for debugging/monitoring)
@router.get("/script/{script_id}/connections", response_model=websocket_schemas.ScriptConnectionsInfo)
async def get_script_connections(
    script_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get information about active WebSocket connections for a script"""
    
    # Verify user has access to this script
    script = db.query(models.Script).filter(models.Script.script_id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    show = db.query(models.Show).filter(models.Show.show_id == script.show_id).first()
    if not show or show.owner_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    connections_info = connection_manager.get_connection_info_for_script(str(script_id))
    
    return websocket_schemas.ScriptConnectionsInfo(
        script_id=str(script_id),
        total_connections=len(connections_info),
        connections=connections_info
    )
