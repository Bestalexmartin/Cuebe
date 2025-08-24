// frontend/src/hooks/useScriptSync.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface ScriptUpdate {
  type: 'script_update' | 'connection_established' | 'update_confirmed' | 'error' | 'pong';
  script_id?: string;
  update_type?: 'element_change' | 'script_info' | 'element_order' | 'element_delete' | 'elements_updated';
  changes?: any;
  updated_by?: string;
  updated_by_id?: string;
  timestamp?: string;
  operation_id?: string;
  message?: string;
  access_type?: string;
  connected_users?: number;
}

interface OutgoingMessage {
  type: 'script_update' | 'ping' | 'get_connection_info';
  update_type?: string;
  changes?: any;
  operation_id?: string;
}

interface UseScriptSyncOptions {
  onUpdate?: (update: ScriptUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onDataReceived?: () => void; // Called when any data received
  onConnectionEstablished?: () => void; // Called when connection first established
  autoReconnect?: boolean;
}

interface UseScriptSyncReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionCount: number;
  lastUpdate: ScriptUpdate | null;
  connectionError: string | null;
  sendUpdate: (message: Partial<OutgoingMessage>) => void;
  sendPing: () => void;
  getConnectionInfo: () => void;
  connect: () => void;
  disconnect: () => void;
}

export const useScriptSync = (
  scriptId: string | null,
  shareToken?: string,
  options: UseScriptSyncOptions = {}
): UseScriptSyncReturn => {
  
  const { getToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<ScriptUpdate | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second
  
  const {
    onUpdate,
    onConnect,
    onDisconnect,
    onError,
    onDataReceived,
    onConnectionEstablished,
    autoReconnect = true
  } = options;

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: ScriptUpdate = JSON.parse(event.data);
      
      switch (message.type) {
        case 'connection_established':
          setIsConnected(true);
          setConnectionCount(message.connected_users || 0);
          setConnectionError(null);
          reconnectAttemptsRef.current = 0; // Reset reconnect attempts
          onConnect?.();
          break;
          
        case 'script_update':
          setLastUpdate(message);
          onDataReceived?.(); // Trigger rotation for script updates
          try {
            onUpdate?.(message);
          } catch (callbackError) {
          }
          break;
          
        case 'update_confirmed':
          // Optional: handle confirmation of sent updates
          break;
          
        case 'error':
          setConnectionError(message.message || 'Unknown error');
          onError?.(message.message || 'Unknown error');
          break;
          
        case 'pong':
          // Heartbeat response - connection is alive
          onDataReceived?.(); // Trigger rotation for heartbeat
          break;
          
        default:
      }
    } catch (error) {
    }
  }, [onUpdate, onConnect, onError, onDataReceived, onConnectionEstablished]);

  const handleClose = useCallback((_event: CloseEvent) => {
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionCount(0);
    onDisconnect?.();
    
    // Attempt reconnection if enabled and not manually disconnected
    if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts && scriptId) {
      const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current); // Exponential backoff
      
      reconnectTimeoutRef.current = window.setTimeout(() => {
        reconnectAttemptsRef.current++;
        connectToWebSocket();
      }, delay);
    }
  }, [autoReconnect, scriptId, onDisconnect]);

  const handleError = useCallback((_error: Event) => {
    setConnectionError('WebSocket connection error');
    onError?.('Connection error occurred');
  }, [onError, scriptId]);

  const connectToWebSocket = useCallback(async () => {
    if (!scriptId) {
      setConnectionError('No script ID provided');
      return;
    }

    // Clear any existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Build WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.NODE_ENV === 'development' ? 'localhost:8000' : window.location.host;
      let wsUrl = `${protocol}//${host}/ws/script/${scriptId}`;
      
      // Add authentication parameters
      const urlParams = new URLSearchParams();
      
      if (shareToken) {
        // Guest access with share token
        urlParams.append('share_token', shareToken);
      } else {
        // Authenticated user access
        const authToken = await getToken();
        if (authToken) {
          urlParams.append('user_token', authToken);
        }
      }
      
      if (urlParams.toString()) {
        wsUrl += `?${urlParams.toString()}`;
      }

      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnecting(false);
        setConnectionError(null);
      };
      
      ws.onmessage = handleMessage;
      ws.onclose = handleClose;
      ws.onerror = handleError;
      
      wsRef.current = ws;
      
    } catch (error) {
      setIsConnecting(false);
      setConnectionError('Failed to establish connection');
      onError?.('Failed to establish connection');
    }
  }, [scriptId, shareToken, getToken, handleMessage, handleClose, handleError, onError]);

  const sendMessage = useCallback((message: OutgoingMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        setConnectionError('Failed to send message');
      }
    } else {
      setConnectionError('Not connected to sync server');
    }
  }, []);

  const sendUpdate = useCallback((message: Partial<OutgoingMessage>) => {
    sendMessage({
      type: 'script_update',
      ...message
    });
  }, [sendMessage]);

  const sendPing = useCallback(() => {
    sendMessage({ type: 'ping' });
  }, [sendMessage]);

  const getConnectionInfo = useCallback(() => {
    sendMessage({ type: 'get_connection_info' });
  }, [sendMessage]);

  const connect = useCallback(() => {
    connectToWebSocket();
  }, [connectToWebSocket]);

  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset reconnect attempts to prevent automatic reconnection
    reconnectAttemptsRef.current = maxReconnectAttempts;
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionCount(0);
  }, []);

  // Auto-connect when scriptId changes
  useEffect(() => {
    if (scriptId) {
      connectToWebSocket();
    } else {
      disconnect();
    }
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [scriptId, shareToken]); // Note: Don't include connectToWebSocket in deps to avoid infinite reconnects

  // Ping interval to keep connection alive
  useEffect(() => {
    if (!isConnected) return;
    
    const pingInterval = setInterval(() => {
      sendPing();
    }, 30000); // Ping every 30 seconds
    
    return () => clearInterval(pingInterval);
  }, [isConnected, sendPing]);

  return {
    isConnected,
    isConnecting,
    connectionCount,
    lastUpdate,
    connectionError,
    sendUpdate,
    sendPing,
    getConnectionInfo,
    connect,
    disconnect
  };
};