import React from 'react';
import './ConnectionStatus.css';

/**
 * Connection Status Indicator Component
 * 
 * Visual indicator showing WebSocket connection state:
 * - CONNECTING: Yellow spinner
 * - CONNECTED: Green checkmark (hides after 3s)
 * - RECONNECTING: Orange spinner with attempt counter
 * - DISCONNECTED: Red dot with "Disconnected" message
 * - FAILED: Red X with "Connection Failed" message
 * 
 * @param {Object} props
 * @param {'CONNECTING'|'CONNECTED'|'RECONNECTING'|'DISCONNECTED'|'FAILED'} props.connectionState
 * @param {number} props.reconnectAttempt - Current reconnection attempt (0 if connected)
 * @param {number} props.reconnectIn - Seconds until next reconnect attempt
 * @param {Function} props.onReconnect - Callback to manually trigger reconnection
 */
export default function ConnectionStatus({
  connectionState,
  reconnectAttempt = 0,
  reconnectIn = null,
  onReconnect,
}) {
  const [showConnected, setShowConnected] = React.useState(false);

  // Auto-hide "Connected" message after 3 seconds
  React.useEffect(() => {
    if (connectionState === 'CONNECTED') {
      setShowConnected(true);
      const timer = setTimeout(() => {
        setShowConnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [connectionState]);

  // Don't show anything if connected (after 3s)
  if (connectionState === 'CONNECTED' && !showConnected) {
    return null;
  }

  const getIcon = () => {
    switch (connectionState) {
      case 'CONNECTING':
        return <span className="connection-spinner">⏳</span>;
      case 'CONNECTED':
        return <span className="connection-checkmark">✅</span>;
      case 'RECONNECTING':
        return <span className="connection-spinner">🔄</span>;
      case 'DISCONNECTED':
        return <span className="connection-dot connection-dot-red">●</span>;
      case 'FAILED':
        return <span className="connection-error">❌</span>;
      default:
        return null;
    }
  };

  const getMessage = () => {
    switch (connectionState) {
      case 'CONNECTING':
        return 'Connecting...';
      case 'CONNECTED':
        return 'Connected';
      case 'RECONNECTING':
        return reconnectIn
          ? `Reconnecting in ${reconnectIn}s (attempt ${reconnectAttempt})`
          : `Reconnecting (attempt ${reconnectAttempt})...`;
      case 'DISCONNECTED':
        return 'Disconnected';
      case 'FAILED':
        return 'Connection Failed';
      default:
        return 'Unknown';
    }
  };

  const getClassName = () => {
    const baseClass = 'connection-status';
    switch (connectionState) {
      case 'CONNECTING':
        return `${baseClass} connection-status-connecting`;
      case 'CONNECTED':
        return `${baseClass} connection-status-connected`;
      case 'RECONNECTING':
        return `${baseClass} connection-status-reconnecting`;
      case 'DISCONNECTED':
        return `${baseClass} connection-status-disconnected`;
      case 'FAILED':
        return `${baseClass} connection-status-failed`;
      default:
        return baseClass;
    }
  };

  return (
    <div className={getClassName()}>
      <div className="connection-status-content">
        {getIcon()}
        <span className="connection-status-message">{getMessage()}</span>
        
        {/* Manual reconnect button for FAILED state */}
        {connectionState === 'FAILED' && onReconnect && (
          <button
            className="connection-status-reconnect-btn"
            onClick={onReconnect}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
