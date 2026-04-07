import { useState, useMemo } from 'react';
import NetworkHistory from './NetworkHistory';

const VENDOR_COLORS = {
  'Amazon (Echo)': '#ff9900',
  'Samsung TV': '#1428a0',
  'Samsung': '#1428a0',
  'Apple': '#555',
  'TP-Link': '#4caf50',
};

function DeviceCard({ device }) {
  const isOnline = device.online !== false;
  const name = device.hostname && device.hostname !== device.ip
    ? device.hostname
    : device.vendor || 'Unknown Device';

  return (
    <div className="device-card">
      <div className="device-icon">{device.icon || '📡'}</div>
      <div className="device-info">
        <div className="device-name">{name}</div>
        <div className="device-sub">{device.ip}</div>
        {device.vendor && device.vendor !== 'Unknown' && (
          <div className="device-sub" style={{ color: 'var(--text-muted)' }}>{device.vendor}</div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <span className={`device-badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
        {device.connection_type && (
          <span className={`device-badge ${device.connection_type === 'wireless' ? 'badge-wireless' : 'badge-wired'}`}>
            {device.connection_type === 'wireless' ? '📶 WiFi' : '🔌 Wired'}
          </span>
        )}
      </div>
    </div>
  );
}

export default function NetworkMap({ devices, online_count, router, history }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    return devices.filter(d => {
      const q = search.toLowerCase();
      const text = [d.hostname, d.ip, d.mac, d.vendor].join(' ').toLowerCase();
      const matchSearch = !q || text.includes(q);
      const matchFilter =
        filter === 'all' ||
        (filter === 'wifi' && d.connection_type === 'wireless') ||
        (filter === 'wired' && d.connection_type === 'wired') ||
        (filter === 'unknown' && (!d.vendor || d.vendor === 'Unknown'));
      return matchSearch && matchFilter;
    });
  }, [devices, search, filter]);

  return (
    <div>
      {/* Summary row */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.5rem' }}>🌐 Devices Online</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--blue)' }}>{online_count}</div>
          <div className="text-muted" style={{ fontSize: '0.8rem' }}>of {devices.length} total found</div>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.5rem' }}>🔌 Router</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>
            {router?.connected ? (
              <span className="text-green">Connected ✓</span>
            ) : (
              <span style={{ color: 'var(--gold)' }}>ARP Mode</span>
            )}
          </div>
          <div className="text-muted mono" style={{ fontSize: '0.75rem' }}>
            {router?.model || 'TP-Link Archer C50'} · {router?.ip || '192.168.0.1'}
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.5rem' }}>📡 Network</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>
            {devices.filter(d => d.connection_type === 'wireless').length} WiFi
            &nbsp;·&nbsp;
            {devices.filter(d => d.connection_type === 'wired').length} Wired
          </div>
          <div className="text-muted" style={{ fontSize: '0.75rem' }}>Scanning every 15 seconds</div>
        </div>
      </div>

      {/* History Graph */}
      <NetworkHistory history={history} />

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by hostname, IP, MAC, vendor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          {['all', 'wifi', 'wired', 'unknown'].map(f => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f)}
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
            >
              {f === 'all' ? 'All' : f === 'wifi' ? '📶 WiFi' : f === 'wired' ? '🔌 Wired' : '❓ Unknown'}
            </button>
          ))}
          <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Device grid */}
      {filtered.length === 0 ? (
        <div className="loading">
          <div className="spinner" />
          <span>{devices.length === 0 ? 'Scanning network...' : 'No devices match your filter'}</span>
        </div>
      ) : (
        <div className="grid-auto">
          {filtered.map(d => <DeviceCard key={d.mac || d.ip} device={d} />)}
        </div>
      )}
    </div>
  );
}
