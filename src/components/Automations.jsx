import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Automations({ alerts }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/automations').then(d => {
      setRules(d.rules || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function toggle(id) {
    const r = await api.post(`/api/automations/${id}/toggle`);
    if (r.rules) setRules(r.rules);
  }

  const recentAlerts = (alerts || []).slice(-5).reverse();

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      {/* Rules */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">⚡ Automation Rules</div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
            {rules.filter(r => r.enabled).length} active
          </span>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className="rule-item">
              <div
                className={`toggle ${rule.enabled ? 'on' : ''}`}
                onClick={() => toggle(rule.id)}
                title={rule.enabled ? 'Disable' : 'Enable'}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{rule.title}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>{rule.description}</div>
                {rule.last_triggered && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--blue)', marginTop: 4 }}>
                    Last triggered: {new Date(rule.last_triggered).toLocaleString()} · {rule.trigger_count}×
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alert log */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🔔 Alert Log</div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>{recentAlerts.length} recent</span>
        </div>

        {recentAlerts.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
            No alerts yet. Rules will trigger when conditions are met.
          </div>
        ) : (
          recentAlerts.map((a, i) => (
            <div key={i} className={`alert-item ${a.level || 'info'}`}>
              <span>{a.level === 'warning' ? '⚠️' : 'ℹ️'}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{a.message}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: 2 }}>
                  {new Date(a.time).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-dim)' }}>How automations work:</strong>
          <ul style={{ marginTop: 6, paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>Rules run automatically on every network scan (every 15s)</li>
            <li>Toggle rules on/off without restarting the backend</li>
            <li>All alerts are logged here in real-time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
