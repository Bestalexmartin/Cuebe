// frontend/src/hooks/useScriptSync.ts

import { useState, useEffect, useRef, useCallback } from 'react';
// debug logging removed for production sweep
import { useAuth } from '@clerk/clerk-react';

interface ScriptUpdate {
  type: 'script_update' | 'connection_established' | 'update_confirmed' | 'error' | 'pong' | 'playback_command';
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
  command?: 'PLAY' | 'PAUSE' | 'SAFETY' | 'COMPLETE' | 'STOP';
  timestamp_ms?: number;
  show_time_ms?: number;
  start_time?: string;
  cumulative_delay_ms?: number;
}

interface OutgoingMessage {
  type: 'script_update' | 'ping' | 'get_connection_info' | 'playback_command';
  update_type?: string;
  changes?: any;
  operation_id?: string;
  command?: string;
  show_time_ms?: number;
  start_time?: string;
  cumulative_delay_ms?: number;
}

interface UseScriptSyncOptions {
  onUpdate?: (update: ScriptUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onDataReceived?: () => void; // Called when any data received
  onConnectionEstablished?: () => void; // Called when connection first established
  onPlaybackCommand?: (command: ScriptUpdate) => void; // Called when playback command received
  autoReconnect?: boolean;
}

interface UseScriptSyncReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionCount: number;
  lastUpdate: ScriptUpdate | null;
  connectionError: string | null;
  sendUpdate: (message: Partial<OutgoingMessage>) => boolean;
  sendPlaybackCommand: (command: string, showTimeMs?: number, startTime?: string, cumulativeDelayMs?: number) => boolean;
  sendPing: () => void;
  getConnectionInfo: () => void;
  connect: () => void;
  disconnect: () => void;
}

export const useScriptSync = (
  scriptId: string | null,
  shareToken?: string,
  options: UseScriptSyncOptions & { autoConnect?: boolean } = {}
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
  const prevScriptIdRef = useRef(scriptId);
  const prevShareTokenRef = useRef(shareToken);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second
  

  // Use refs to capture latest callback values without triggering reconnections
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: ScriptUpdate = JSON.parse(event.data);
      // Update connection count if server provides it on any message type
      if (typeof message.connected_users === 'number') {
        setConnectionCount(message.connected_users);
      }
      
      switch (message.type) {
        case 'connection_established':
          setIsConnected(true);
          setConnectionCount(typeof message.connected_users === 'number' ? message.connected_users : 0);
          setConnectionError(null);
          reconnectAttemptsRef.current = 0; // Reset reconnect attempts
          optionsRef.current.onConnect?.();
          break;
          
        case 'script_update':
          // debug removed
          setLastUpdate(message);
          optionsRef.current.onDataReceived?.(); // Trigger rotation for script updates
          try {
            optionsRef.current.onUpdate?.(message);
          } catch (callbackError) {
          }
          break;
          
        case 'update_confirmed':
          // Optional: handle confirmation of sent updates
          break;
          
        case 'error':
          setConnectionError(message.message || 'Unknown error');
          optionsRef.current.onError?.(message.message || 'Unknown error');
          break;
          
        case 'pong':
          // debug removed
          // Heartbeat response - connection is alive
          optionsRef.current.onDataReceived?.(); // Trigger rotation to show connection is alive
          break;
          
        case 'playback_command':
          // debug removed
          optionsRef.current.onPlaybackCommand?.(message);
          optionsRef.current.onDataReceived?.(); // Trigger rotation for playback commands
          break;
          
        default:
      }
    } catch (error) {
    }
  }, []); // Remove callback dependencies to prevent reconnections

  const handleClose = useCallback((_event: CloseEvent) => {
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionCount(0);
    optionsRef.current.onDisconnect?.();
    
    // Attempt reconnection if enabled and not manually disconnected
    if (optionsRef.current.autoReconnect !== false && reconnectAttemptsRef.current < maxReconnectAttempts && prevScriptIdRef.current) {
      const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current); // Exponential backoff
      
      reconnectTimeoutRef.current = window.setTimeout(() => {
        reconnectAttemptsRef.current++;
        connectToWebSocket();
      }, delay);
    }
  }, []); // Remove dependencies to prevent reconnections

  const handleError = useCallback((_error: Event) => {
    setConnectionError('WebSocket connection error');
    optionsRef.current.onError?.('Connection error occurred');
  }, []); // Remove dependencies to prevent reconnections

  const connectToWebSocket = useCallback(async () => {
    if (!scriptId) {
      setConnectionError('No script ID provided');
      return;
    }

    // Clear any existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

      // debug removed
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
        const authToken = await getTokenRef.current({});
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
        // debug removed
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
      optionsRef.current.onError?.('Failed to establish connection');
    }
  }, [scriptId, shareToken, handleMessage, handleClose, handleError]); // Include dependencies


  const sendMessage = useCallback((message: OutgoingMessage): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        setConnectionError('Failed to send message');
        return false;
      }
    } else { 
      setConnectionError('Not connected to sync server');
      return false;
    }
  }, []);

  const sendUpdate = useCallback((message: Partial<OutgoingMessage>): boolean => {
    const ok = sendMessage({
      type: 'script_update',
      ...message
    });
    if (ok) {
      optionsRef.current.onDataReceived?.(); // Trigger rotation for outgoing script update
    }
    return ok;
  }, [sendMessage]);

  const sendPing = useCallback(() => {
    sendMessage({ type: 'ping' });
    optionsRef.current.onDataReceived?.(); // Trigger rotation for outgoing ping
  }, [sendMessage]);

  const getConnectionInfo = useCallback(() => {
    sendMessage({ type: 'get_connection_info' });
  }, [sendMessage]);

  const sendPlaybackCommand = useCallback((command: string, showTimeMs?: number, startTime?: string, cumulativeDelayMs?: number): boolean => {
    const message: OutgoingMessage = {
      type: 'playback_command',
      command,
      show_time_ms: showTimeMs,
      start_time: startTime,
      cumulative_delay_ms: cumulativeDelayMs
    };
    
    const ok = sendMessage(message);
    if (ok) {
      optionsRef.current.onDataReceived?.(); // Trigger rotation for outgoing playback command
    }
    return ok;
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
    // Update refs for next render
    prevScriptIdRef.current = scriptId;
    prevShareTokenRef.current = shareToken;
    
    if (scriptId && options.autoConnect !== false) {
      connectToWebSocket();
    } else if (!scriptId) {
      disconnect();
    }
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [scriptId, shareToken]); // Note: Don't include connectToWebSocket in deps to avoid infinite reconnects


  // No background polling for connection count.

  return {
    isConnected,
    isConnecting,
    connectionCount,
    lastUpdate,
    connectionError,
    sendUpdate,
    sendPlaybackCommand,
    sendPing,
    getConnectionInfo,
    connect,
    disconnect
  };
};
