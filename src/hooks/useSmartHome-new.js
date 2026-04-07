import { useState, useEffect, useCallback, useRef } from 'react';
import { WS_URL } from '../api';

// Configuration constants
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000;    // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL = 30000;     // 30 seconds
const HEARTBEAT_TIMEOUT = 5000;       // 5 seconds
const HEARTBEAT_MISS_LIMIT = 3;       // Disconnect after 3 missed pongs

/**
 * Smart Home WebSocket Hook with Robust Reconnection
 * 
 * Features:
 * - Exponential backoff with jitter (1s → 2s → 4s → 8s → 16s → 30s)
 * - Heartbeat ping/pong mechanism (detect dead connections)
 * - Connection state tracking (CONNECTING, CONNECTED, RECONNECTING, DISCONNECTED, FAILED)
 * - Automatic reconnection with attempt counter
 * - Manual close prevention of auto-reconnect
 * 
 * @returns {Object} state - Smart home state with connection info
 */
export function useSmartHome() {
  // WebSocket and timer refs
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const heartbeatTimer = useRef(null);
  const heartbeatTimeoutTimer = useRef(null);
  const reconnectAttempts = useRef(0);
  const missedPongs = useRef(0);
  const isManualClose = useRef(false);

  // State
  const [state, setState] = useState({
    // Connection state
    connected: false,
    connectionState: 'DISCONNECTED', // CONNECTING, CONNECTED, RECONNECTING, DISCONNECTED, FAILED
    reconnectIn: null, // Seconds until next reconnect attempt
    reconnectAttempt: 0, // Current attempt number
    
    // Smart home data
    devices: [],
    router: {},
    tv: {},
    alexa: [],
    alerts: [],
    online_count: 0,
    scan_count: 0,
    history: [],
  });

  // Calculate exponential backoff delay with jitter
  const getReconnectDelay = useCallback(() => {
    const attempts = reconnectAttempts.current;
    
    // Exponential: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const exponentialDelay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, attempts),
      MAX_RECONNECT_DELAY
    );
    
    // Jitter: ±25% random variation to avoid thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    
    return Math.floor(exponentialDelay + jitter);
  }, []);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    if (heartbeatTimeoutTimer.current) {
      clearTimeout(heartbeatTimeoutTimer.current);
      heartbeatTimeoutTimer.current = null;
    }
  }, []);

  // Send heartbeat ping
  const sendHeartbeat = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('📡 Sending heartbeat ping...');
      try {
        ws.current.send(JSON.stringify({ type: 'ping' }));
        
        // Wait for pong response
        heartbeatTimeoutTimer.current = setTimeout(() => {
          missedPongs.current += 1;
          console.warn(
            `⚠️  Heartbeat timeout - no pong received (${missedPongs.current}/${HEARTBEAT_MISS_LIMIT})`
          );
          
          // Force reconnection after too many missed pongs
          if (missedPongs.current >= HEARTBEAT_MISS_LIMIT) {
            console.error('❌ Too many missed pongs, forcing reconnection');
            ws.current?.close();
          }
        }, HEARTBEAT_TIMEOUT);
      } catch (err) {
        console.error('Failed to send ping:', err);
      }
    }
  }, []);

  // Handle pong response
  const handlePong = useCallback(() => {
    console.log('✅ Heartbeat pong received');
    missedPongs.current = 0; // Reset counter
    
    if (heartbeatTimeoutTimer.current) {
      clearTimeout(heartbeatTimeoutTimer.current);
      heartbeatTimeoutTimer.current = null;
    }
  }, []);

  // Start heartbeat interval
  const startHeartbeat = useCallback(() => {
    // Clear previous heartbeat
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
    }
    
    missedPongs.current = 0;
    
    // Send ping every 30 seconds
    heartbeatTimer.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    console.log('❤️  Heartbeat started');
  }, [sendHeartbeat]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    if (heartbeatTimeoutTimer.current) {
      clearTimeout(heartbeatTimeoutTimer.current);
      heartbeatTimeoutTimer.current = null;
    }
    missedPongs.current = 0;
    console.log('💔 Heartbeat stopped');
  }, []);

  // Main connection function
  const connect = useCallback(() => {
    // Don't reconnect if manually closed
    if (isManualClose.current) {
      console.log('Manual close - not reconnecting');
      return;
    }

    // Don't reconnect if already connected
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    clearTimers();

    const currentAttempt = reconnectAttempts.current;

    // Check max attempts
    if (currentAttempt >= MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Max reconnect attempts reached');
      setState(s => ({
        ...s,
        connected: false,
        connectionState: 'FAILED',
        reconnectIn: null,
        reconnectAttempt: currentAttempt,
      }));
      return;
    }

    console.log(
      `🔄 Connecting to WebSocket... (attempt ${currentAttempt + 1}/${MAX_RECONNECT_ATTEMPTS})`
    );

    setState(s => ({
      ...s,
      connectionState: currentAttempt === 0 ? 'CONNECTING' : 'RECONNECTING',
      reconnectIn: null,
      reconnectAttempt: currentAttempt + 1,
    }));

    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log('✅ WebSocket connected');
        reconnectAttempts.current = 0; // Reset counter on success
        
        setState(s => ({
          ...s,
          connected: true,
          connectionState: 'CONNECTED',
          reconnectIn: null,
          reconnectAttempt: 0,
        }));

        // Start heartbeat
        startHeartbeat();
      };

      ws.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          
          // Handle heartbeat pong
          if (data.type === 'pong') {
            handlePong();
            return;
          }

          // Update state with received data
          setState(s => ({
            ...s,
            devices: data.devices ?? s.devices,
            router: data.router ?? s.router,
            tv: data.tv ?? s.tv,
            alexa: data.alexa ?? s.alexa,
            alerts: data.alerts ?? s.alerts,
            online_count: data.online_count ?? s.online_count,
            scan_count: data.scan_count ?? s.scan_count,
            history: data.history ?? s.history,
          }));
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.current.onclose = () => {
        console.log('🔌 WebSocket closed');
        stopHeartbeat();
        
        setState(s => ({
          ...s,
          connected: false,
          connectionState: 'DISCONNECTED',
        }));

        // Don't reconnect if manually closed
        if (isManualClose.current) {
          return;
        }

        // Increment attempt counter
        reconnectAttempts.current += 1;

        // Calculate delay and schedule reconnection
        const delay = getReconnectDelay();
        console.log(`⏳ Reconnecting in ${(delay / 1000).toFixed(1)}s...`);

        setState(s => ({
          ...s,
          reconnectIn: Math.ceil(delay / 1000),
        }));

        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.current.onerror = (err) => {
        console.error('WebSocket error:', err);
        // onclose will handle reconnection
        ws.current?.close();
      };

    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      
      // Retry with backoff
      reconnectAttempts.current += 1;
      const delay = getReconnectDelay();
      reconnectTimer.current = setTimeout(connect, delay);
    }
  }, [clearTimers, getReconnectDelay, startHeartbeat, stopHeartbeat, handlePong]);

  // Manual disconnect
  const disconnect = useCallback(() => {
    console.log('Manual disconnect requested');
    isManualClose.current = true;
    clearTimers();
    stopHeartbeat();
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setState(s => ({
      ...s,
      connected: false,
      connectionState: 'DISCONNECTED',
      reconnectIn: null,
    }));
  }, [clearTimers, stopHeartbeat]);

  // Manual reconnect (reset attempts)
  const reconnect = useCallback(() => {
    console.log('Manual reconnect requested');
    isManualClose.current = false;
    reconnectAttempts.current = 0;
    disconnect();
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // Initialize connection on mount
  useEffect(() => {
    isManualClose.current = false;
    connect();

    // Cleanup on unmount
    return () => {
      isManualClose.current = true;
      clearTimers();
      stopHeartbeat();
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect, clearTimers, stopHeartbeat]);

  return {
    ...state,
    // Expose manual controls
    disconnect,
    reconnect,
  };
}
