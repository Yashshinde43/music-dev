import { useEffect, useRef, useState } from "react";

interface UseWebSocketOptions {
  enabled?: boolean;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const {
    enabled = true,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = 3000,
  } = options;

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = () => {
    if (!enabled || !url) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = url.startsWith('ws') ? url : `${protocol}//${window.location.host}${url}`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        onConnect?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        onDisconnect?.();
        
        // Attempt to reconnect
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
      };

      ws.current.onerror = (event) => {
        setError('WebSocket connection failed');
        onError?.(event);
      };
    } catch (error) {
      setError('Failed to create WebSocket connection');
      console.error('WebSocket connection error:', error);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  };

  const sendMessage = (data: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  };

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return disconnect;
  }, [url, enabled]);

  return {
    isConnected,
    error,
    sendMessage,
    disconnect,
  };
}
