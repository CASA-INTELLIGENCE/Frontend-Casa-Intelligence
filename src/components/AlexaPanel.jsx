import { useState } from 'react';
import { useApi } from '../hooks/useApi';

export default function AlexaPanel({ alexa, devices }) {
  const [ttsMessage, setTtsMessage] = useState('');
  const [feedback, setFeedback] = useState('');

  const echoDevices = alexa || [];
  const amazonOnNetwork = devices?.filter(d =>
    d.vendor?.toLowerCase().includes('amazon') ||
    d.hostname?.toLowerCase().includes('echo') ||
    d.hostname?.toLowerCase().includes('alexa')
  ) || [];

  const allAlexaDevices = echoDevices.length > 0 ? echoDevices : amazonOnNetwork;

  // Use useApi hook for TTS
  const {
    loading: sendingTTS,
    data: ttsResponse,
    execute: sendTTS,
  } = useApi('/api/alexa/tts', {
    method: 'POST',
    timeout: 10000,
    onSuccess: (response) => {
      const mode = response.mode || 'unknown';
      if (mode === 'simulation') {
        setFeedback('✅ Message simulated (demo mode)');
      } else if (mode === 'demo') {
        setFeedback('✅ Message prepared (credentials detected)');
      } else {
        setFeedback('✅ Message sent to Echo!');
      }
      setTtsMessage('');
      setTimeout(() => setFeedback(''), 4000);
    },
    onError: (error) => {
      setFeedback(`❌ Failed: ${error}`);
      setTimeout(() => setFeedback(''), 3000);
    },
  });

  const handleSendTTS = async () => {
    if (!ttsMessage.trim()) return;
    await sendTTS({ message: ttsMessage });
  };

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      {/* Device list */}
      <div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">🎙️ Echo Devices Found</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {allAlexaDevices.length} device{allAlexaDevices.length !== 1 ? 's' : ''}
            </span>
          </div>

          {allAlexaDevices.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎙️</div>
              <div>No Echo devices detected on network.</div>
              <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                Make sure your Echo Dot is connected to the same WiFi.
              </div>
            </div>
          ) : (
            allAlexaDevices.map((d, i) => (
              <div key={i} style={{ background: 'rgba(255,153,0,0.06)', border: '1px solid rgba(255,153,0,0.15)', borderRadius: 10, padding: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ fontSize: '2rem' }}>🎙️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{d.device_type || 'Amazon Echo'}</div>
                    <div className="mono text-muted" style={{ fontSize: '0.75rem' }}>
                      {d.ip} · {d.mac}
                    </div>
                  </div>
                  <span className="device-badge badge-online">Online</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* TTS & Setup */}
      <div>
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header">
            <div className="card-title">📢 Voice Announcement</div>
          </div>
          <div className="alert-item warning">
            <span>🔐</span>
            <div>
              <strong>Demo mode active</strong> — TTS messages are simulated for demonstration.
              Add <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 3 }}>AMAZON_EMAIL</code> and{' '}
              <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 3 }}>AMAZON_PASSWORD</code> to the{' '}
              <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 3 }}>.env</code> file for real Alexa API integration.
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <input 
              type="text" 
              placeholder="Type a message to announce (demo mode)..." 
              disabled={sendingTTS}
              value={ttsMessage}
              onChange={(e) => setTtsMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendTTS()}
              style={{ marginBottom: '0.5rem' }} 
            />
            <button 
              className="btn btn-primary w-full" 
              disabled={sendingTTS || !ttsMessage.trim()}
              onClick={handleSendTTS}
              style={{ opacity: !ttsMessage.trim() ? 0.4 : 1, justifyContent: 'center' }}
            >
              {sendingTTS ? '📡 Sending...' : '📢 Send to Echo Dot (Demo)'}
            </button>
            {feedback && (
              <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
                {feedback}
              </div>
            )}
            {ttsResponse?.note && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                💡 {ttsResponse.note}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.75rem' }}>📌 How to Enable Full Control</div>
          {[
            ['1', 'Open backend/.env'],
            ['2', 'Add AMAZON_EMAIL=your@email.com'],
            ['3', 'Add AMAZON_PASSWORD=yourpassword'],
            ['4', 'Restart the backend'],
          ].map(([n, step]) => (
            <div key={n} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
              <span style={{ background: 'var(--blue-dim)', color: 'var(--blue)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{n}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
