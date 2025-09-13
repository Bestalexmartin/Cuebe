# backend/schemas/websocket.py

from datetime import datetime
from typing import Any, Dict, Optional, Union, List
from pydantic import BaseModel, Field
from uuid import UUID


class WebSocketBaseResponse(BaseModel):
    """Base response model for WebSocket messages"""
    type: str
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ConnectionEstablishedResponse(WebSocketBaseResponse):
    """Response sent when WebSocket connection is established"""
    type: str = "connection_established"
    script_id: str
    access_type: str
    connected_users: int


class ScriptUpdateResponse(WebSocketBaseResponse):
    """Response for script update broadcasts"""
    type: str = "script_update"
    script_id: str
    update_type: str
    changes: Union[Dict[str, Any], List[Dict[str, Any]]]  # Support both dict and list formats
    updated_by: str
    updated_by_id: str
    operation_id: Optional[str] = None


class UpdateConfirmedResponse(WebSocketBaseResponse):
    """Response confirming an update was received"""
    type: str = "update_confirmed"
    operation_id: Optional[str] = None


class PongResponse(WebSocketBaseResponse):
    """Response to ping messages"""
    type: str = "pong"


class ConnectionInfoResponse(WebSocketBaseResponse):
    """Response with connection information"""
    type: str = "connection_info"
    script_id: str
    connections: list
    total_connected: int


class PlaybackCommandResponse(WebSocketBaseResponse):
    """Response for playback synchronization commands"""
    type: str = "playback_command"
    script_id: str
    command: str  # PLAY, PAUSE, SAFETY, COMPLETE, STOP
    timestamp_ms: int  # Server timestamp for latency correction
    # No timing payloads here; late-joiners receive timing via playback_status


class PlaybackStatusResponse(WebSocketBaseResponse):
    """Response conveying current playback status metadata for late joiners"""
    type: str = "playback_status"
    script_id: str
    cumulative_delay_ms: int = 0  # Current accumulated pause duration in ms


class WebSocketErrorResponse(WebSocketBaseResponse):
    """Response for WebSocket errors"""
    type: str = "error"
    message: str


class ScriptConnectionsInfo(BaseModel):
    """Response model for HTTP endpoint to get connection info"""
    script_id: str
    total_connections: int
    connections: list
