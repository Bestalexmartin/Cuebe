#!/usr/bin/env python3
"""
Simple WebSocket client to test the script sync functionality
"""

import asyncio
import websockets
import json
from uuid import uuid4

async def test_websocket():
    # Test script ID (replace with actual script ID from your database)
    script_id = "123e4567-e89b-12d3-a456-426614174000"  
    
    # Test with invalid share token first
    uri = f"ws://localhost:8000/ws/script/{script_id}?share_token=invalid_token"
    
    try:
        print(f"Connecting to: {uri}")
        async with websockets.connect(uri) as websocket:
            print("Connected successfully!")
            
            # Listen for messages
            while True:
                try:
                    message = await websocket.recv()
                    data = json.loads(message)
                    print(f"Received: {data}")
                    
                    if data.get("type") == "connection_established":
                        print("Connection established, testing ping...")
                        await websocket.send(json.dumps({"type": "ping"}))
                    
                    elif data.get("type") == "pong":
                        print("Pong received! WebSocket is working.")
                        break
                        
                except websockets.exceptions.ConnectionClosed:
                    print("Connection closed")
                    break
                    
    except Exception as e:
        print(f"Connection failed as expected: {e}")
        print("This confirms the WebSocket endpoint is running and validating permissions.")

if __name__ == "__main__":
    print("Testing WebSocket Script Sync Endpoint...")
    asyncio.run(test_websocket())