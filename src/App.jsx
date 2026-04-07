import { useState, useRef } from 'react';
import { useSmartHome } from './hooks/useSmartHome';
import NetworkMap from './components/NetworkMap';
import TVPanel from './components/TVPanel';
import AlexaPanel from './components/AlexaPanel';
import AIInsights from './components/AIInsights';
import Automations from './components/Automations';
import DiscoveryJournal from './components/DiscoveryJournal';
import ToastContainer, { useToast, useSmartHomeToasts } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ConnectionStatus from './components/ConnectionStatus';
import './index.css';

const NAV = [
  { id: 'network', icon: '🗺️', label: 'Network Map' },
  { id: 'tv', icon: '📺', label: 'Samsung TV' },
  { id: 'alexa', icon: '🎙️', label: 'Alexa Hub' },
  { id: 'ai', icon: '🧠', label: 'AI Insights' },
  { id: 'automations', icon: '⚡', label: 'Automations' },
  { id: 'journal', icon: '📝', label: 'Discovery Log' },
];

export default function App() {
  const [tab, setTab] = useState('network');
  const data = useSmartHome();
  const { toasts, addToast, dismiss } = useToast();
  const prevDataRef = useRef(null);

  // Auto-detect network changes and fire toasts
  useSmartHomeToasts(addToast, data, prevDataRef);

  const PANELS = {
    network: <NetworkMap devices={data.devices} online_count={data.online_count} router={data.router} history={data.history} />,
    tv: <TVPanel tv={data.tv} />,
    alexa: <AlexaPanel alexa={data.alexa} devices={data.devices} />,
    ai: <AIInsights devices={data.devices} tv={data.tv} alexa={data.alexa} />,
    automations: <Automations alerts={data.alerts} />,
    journal: <DiscoveryJournal />,
  };

  return (
    <ErrorBoundary>
      <div className="layout">
        {/* Connection Status Indicator */}
        <ConnectionStatus 
          connectionState={data.connectionState}
          reconnectIn={data.reconnectIn}
          reconnectAttempt={data.reconnectAttempt}
          onReconnect={data.reconnect}
        />

        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-text">Casa<span>Intel</span></div>
          <div className="logo-sub">Smart Home Hub</div>
        </div>
        {NAV.map(item => (
          <div
            key={item.id}
            className={`nav-item ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
        <div className="sidebar-bottom">
          <div className="flex items-center gap-1">
            <span className={`status-dot ${data.connected ? 'online' : 'offline'}`} />
            {data.connected ? 'Backend live' : 'Reconnecting...'}
          </div>
          <div className="mt-1 text-muted" style={{ fontSize: '0.7rem' }}>
            Scan #{data.scan_count} · {data.online_count} online
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="main">
        <div className="topbar">
          <div>
            <h1 className="topbar-title">
              {NAV.find(n => n.id === tab)?.icon} {NAV.find(n => n.id === tab)?.label}
            </h1>
            <p className="topbar-sub">Casa Intelligence · Real-time home network monitoring</p>
          </div>
          <div className="topbar-stats">
            <div className="stat-chip">
              <span className="status-dot online" />
              {data.online_count} devices
            </div>
            <div className="stat-chip">
              {data.router?.connected ? '🟢' : '🔴'} Router
            </div>
            <div className="stat-chip">
              {data.tv?.connected ? '📺' : '📴'} TV
            </div>
          </div>
        </div>
        {PANELS[tab]}
      </main>
    </div>
    </ErrorBoundary>
  );
}
