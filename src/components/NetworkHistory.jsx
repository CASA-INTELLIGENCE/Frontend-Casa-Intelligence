import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = {
  online: '#3b82f6',
  total: '#6366f1',
  tv: '#f59e0b',
  alexa: '#ff9900',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10, 15, 30, 0.95)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: 10,
      padding: '0.75rem 1rem',
      fontSize: '0.8rem',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#e2e8f0' }}>
        🕐 {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '2px 0' }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function NetworkHistory({ history }) {
  const data = useMemo(() => {
    if (!history?.length) return [];
    return history.map(h => ({
      time: h.time,
      'Devices Online': h.online,
      'Total Detected': h.total,
      'TV Active': h.tv,
      'Echo Devices': h.alexa,
    }));
  }, [history]);

  if (data.length < 2) {
    return (
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title">📊 Network Activity Timeline</div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
            Collecting data... ({data.length}/2 scans)
          </span>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          The graph will appear after 2 network scans (~30 seconds).
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header" style={{ marginBottom: '1rem' }}>
        <div className="card-title">📊 Network Activity Timeline</div>
        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
          Last {data.length} scans · Updates every 15s
        </span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="gradOnline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.online} stopOpacity={0.35} />
              <stop offset="95%" stopColor={COLORS.online} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.total} stopOpacity={0.2} />
              <stop offset="95%" stopColor={COLORS.total} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }}
            iconType="circle"
            iconSize={8}
          />
          <Area
            type="monotone"
            dataKey="Devices Online"
            stroke={COLORS.online}
            strokeWidth={2.5}
            fill="url(#gradOnline)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="Total Detected"
            stroke={COLORS.total}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            fill="url(#gradTotal)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="Echo Devices"
            stroke={COLORS.alexa}
            strokeWidth={1.5}
            fill="none"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
