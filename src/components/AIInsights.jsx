import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';

const ICON_MAP = { info: 'ℹ️', warning: '⚠️', tip: '💡' };
const COLOR_MAP = { info: 'info', warning: 'warning', tip: 'tip' };
const COOLDOWN = 60; // seconds

export default function AIInsights({ devices, tv, alexa }) {
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  // Use useApi hook for insights fetching
  const {
    data: apiData,
    loading,
    error: apiError,
    execute: fetchInsights,
  } = useApi('/api/insights', {
    method: 'GET',
    timeout: 15000, // 15 seconds timeout for AI
    onSuccess: (result) => {
      // Start cooldown whether cached or fresh
      setCooldown(result.cooldown_remaining || COOLDOWN);
    },
    onError: (error) => {
      console.error('[AIInsights] Fetch error:', {
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    },
  });

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [cooldown > 0]);

  async function analyze() {
    if (cooldown > 0) return;
    await fetchInsights();
  }

  // Process data and error
  const data = apiData;
  const error = apiError 
    ? (apiError.includes('429') || apiError.includes('RESOURCE_EXHAUSTED')
        ? '⏳ API rate limit reached. Using cached analysis.'
        : `Could not reach backend: ${apiError}`)
    : '';

  const secureColor = data?.security?.score >= 8 ? 'var(--green)'
    : data?.security?.score >= 5 ? 'var(--gold)'
    : 'var(--red)';

  const btnDisabled = loading || cooldown > 0;

  // Determine AI provider name for display
  const providerName = data?.provider === 'groq' ? 'Groq Llama 3.3'
    : data?.provider === 'gemini' ? 'Google Gemini 2.0'
    : 'Google Gemini 2.0 Flash';

  return (
    <div>
      {/* Header + Analyze Button */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>🧠 Powered by {providerName}</div>
            <div className="text-muted" style={{ fontSize: '0.85rem' }}>
              Analyzes your real network data — {devices?.length || 0} devices, TV ({tv?.status || 'unknown'}), {alexa?.length || 0} Echo device(s) — and generates actionable insights.
            </div>
          </div>
          <button className="btn btn-primary" onClick={analyze} disabled={btnDisabled} style={btnDisabled ? { opacity: 0.6 } : {}}>
            {loading ? '⏳ Analyzing...'
              : cooldown > 0 ? `⏱️ Wait ${cooldown}s`
              : '🔍 Analyze My Network'}
          </button>
        </div>

        {data?.cached && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 6 }}>
            ⚡ Showing cached result · Next analysis available in {cooldown}s
          </div>
        )}

        {data?.summary && (
          <div style={{ marginTop: '1rem', background: 'var(--blue-dim)', border: '1px solid var(--border-active)', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
            💬 {data.summary}
          </div>
        )}

        {error && (
          <div className="alert-item warning" style={{ marginTop: '1rem' }}>
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <span>🧠 AI is analyzing your home network...</span>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            This may take up to 10 seconds
          </p>
        </div>
      )}

      {data && !loading && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Insights */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '1rem' }}>💡 Insights</div>
            {data.insights?.map((ins, i) => (
              <div key={i} className="insight-item">
                <div className={`insight-icon ${COLOR_MAP[ins.type] || 'info'}`}>
                  {ins.icon || ICON_MAP[ins.type] || 'ℹ️'}
                </div>
                <div className="insight-body">{ins.message}</div>
              </div>
            ))}
          </div>

          <div>
            {/* Security Score */}
            {data.security && (
              <div className="card" style={{ marginBottom: '1.25rem' }}>
                <div className="card-title" style={{ marginBottom: '1rem' }}>🔒 Network Security</div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                  <div className="score-ring" style={{ borderColor: secureColor, color: secureColor }}>
                    <span>{data.security.score}</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>/10</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                    {data.security.notes}
                  </div>
                </div>
                
                {/* Security Issues */}
                {data.security.issues && data.security.issues.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--red)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      Issues
                    </div>
                    {data.security.issues.map((issue, i) => (
                      <div key={i} style={{ fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(255,100,100,0.1)', borderRadius: 4, marginBottom: '0.5rem' }}>
                        ⚠️ {issue}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Security Strengths */}
                {data.security.strengths && data.security.strengths.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--green)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      Strengths
                    </div>
                    {data.security.strengths.map((strength, i) => (
                      <div key={i} style={{ fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(100,255,100,0.1)', borderRadius: 4, marginBottom: '0.5rem' }}>
                        ✅ {strength}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recommendations */}
            {data.recommendations?.length > 0 && (
              <div className="card">
                <div className="card-title" style={{ marginBottom: '1rem' }}>💡 Recommendations</div>
                {data.recommendations.map((rec, i) => (
                  <div key={i} style={{ padding: '0.75rem', background: 'rgba(100,150,255,0.1)', borderRadius: 4, marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    💡 {rec}
                  </div>
                ))}
              </div>
            )}
            
            {/* Automation ideas (if present in response) */}
            {data.automations?.length > 0 && (
              <div className="card" style={{ marginTop: '1.25rem' }}>
                <div className="card-title" style={{ marginBottom: '1rem' }}>⚡ AI-Suggested Automations</div>
                {data.automations.map((a, i) => (
                  <div key={i} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>
                      {a.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {a.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="empty" style={{ fontSize: '1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Ready to analyze your network</div>
          <div className="text-muted">Click "Analyze My Network" to get AI-powered insights about your devices, security, and automation opportunities.</div>
        </div>
      )}
    </div>
  );
}
