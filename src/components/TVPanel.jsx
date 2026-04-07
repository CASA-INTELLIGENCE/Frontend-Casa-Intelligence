import { useState } from 'react';
import { useApi } from '../hooks/useApi';

const TV_BUTTONS = [
  { command: 'power', icon: '⏻', label: 'Power', className: 'power' },
  { command: 'volume_up', icon: '🔊', label: 'Vol +' },
  { command: 'volume_down', icon: '🔉', label: 'Vol -' },
  { command: 'mute', icon: '🔇', label: 'Mute' },
  { command: 'up', icon: '▲', label: 'Up' },
  { command: 'home', icon: '⌂', label: 'Home' },
  { command: 'left', icon: '◄', label: 'Left' },
  { command: 'enter', icon: '●', label: 'OK' },
  { command: 'right', icon: '►', label: 'Right' },
  { command: 'source', icon: '⇄', label: 'Input' },
  { command: 'down', icon: '▼', label: 'Down' },
  { command: 'back', icon: '↩', label: 'Back' },
];

export default function TVPanel({ tv }) {
  const [feedback, setFeedback] = useState('');

  // Use useApi hook for TV commands
  const {
    loading,
    execute: sendTVCommand,
  } = useApi('/api/tv/command', {
    method: 'POST',
    timeout: 5000,
    onSuccess: (result) => {
      setFeedback(result.success ? `✓ Command sent` : `✗ Command failed`);
      setTimeout(() => setFeedback(''), 2000);
    },
    onError: (error) => {
      setFeedback(`✗ Could not reach TV: ${error}`);
      setTimeout(() => setFeedback(''), 2000);
    },
  });

  async function sendCommand(command) {
    setFeedback(`Sending ${command}...`);
    await sendTVCommand({ command });
  }

  const STATUS_COLOR = {
    on: 'var(--green)',
    off: 'var(--text-muted)',
    not_found: 'var(--gold)',
    error: 'var(--red)',
    unknown: 'var(--text-muted)',
  };

  const statusColor = STATUS_COLOR[tv?.status] || 'var(--text-muted)';

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      {/* TV Status */}
      <div>
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header">
            <div className="card-title">📺 Samsung TV Status</div>
            <span style={{ fontSize: '0.75rem', color: statusColor, fontWeight: 700 }}>
              {tv?.status?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>

          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '0.5rem', filter: tv?.connected ? 'none' : 'grayscale(1) opacity(0.4)' }}>
              📺
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>
              {tv?.name || 'Samsung Smart TV 2023'}
            </div>
            {tv?.model && (
              <div className="text-muted mono" style={{ fontSize: '0.75rem' }}>{tv.model}</div>
            )}
            <div className="mono" style={{ fontSize: '0.75rem', marginTop: 8, color: 'var(--text-muted)' }}>
              {tv?.ip ? `📍 ${tv.ip}` : '📍 Searching...'}
            </div>
          </div>

          {!tv?.connected && tv?.status === 'not_found' && (
            <div className="alert-item warning" style={{ marginTop: 0 }}>
              <span>⚠️</span>
              <div>
                <strong>TV not found on network.</strong> Make sure your Samsung TV is on and connected to the same WiFi.
                Discovery runs automatically every 15s.
              </div>
            </div>
          )}

          {!tv?.connected && tv?.status === 'off' && (
            <div className="alert-item info" style={{ marginTop: 0 }}>
              <span>ℹ️</span>
              <div>TV appears to be <strong>off</strong>. Power it on to enable full control.</div>
            </div>
          )}

          {tv?.connected && tv?.status === 'on' && (
            <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(42,145,94,0.3)', borderRadius: 8, padding: '0.6rem 1rem', fontSize: '0.8rem' }}>
              ✅ Connected · Ready for control
              {feedback && <span style={{ marginLeft: 8, fontWeight: 600 }}>{feedback}</span>}
            </div>
          )}
        </div>

        {/* Info table */}
        {tv?.connected && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: '0.75rem' }}>Device Info</div>
            {[
              ['Status', tv?.status],
              ['IP Address', tv?.ip],
              ['Model', tv?.model || '—'],
              ['Resolution', tv?.resolution || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span className="text-muted">{k}</span>
                <span className="mono fw-bold">{v || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remote Control */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🎮 Remote Control</div>
          {feedback && <span style={{ fontSize: '0.75rem', color: 'var(--gold)' }}>{feedback}</span>}
        </div>

        {!tv?.connected ? (
          <div className="empty">
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📴</div>
            Controls will appear when TV is connected
          </div>
        ) : (
          <>
            <div className="tv-grid">
              {TV_BUTTONS.map(b => (
                <button
                  key={b.command}
                  className={`tv-btn ${b.className || ''}`}
                  onClick={() => sendCommand(b.command)}
                  disabled={loading}
                  title={b.label}
                >
                  {b.icon}
                  <span>{b.label}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              ⚠️ First connection requires accepting "Remote Access" on TV screen
            </div>
          </>
        )}
      </div>
    </div>
  );
}
