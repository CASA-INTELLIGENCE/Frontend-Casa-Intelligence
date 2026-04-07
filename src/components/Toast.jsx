import { useState, useEffect, useCallback } from 'react';

let toastId = 0;

const ICONS = {
  success: '✅',
  warning: '⚠️',
  info: 'ℹ️',
  device: '📡',
  alexa: '🎙️',
  tv: '📺',
  error: '❌',
  critical: '🚨', // Added critical type
};

const COLORS = {
  success: { bg: 'rgba(42, 145, 94, 0.15)', border: 'rgba(42, 145, 94, 0.3)', accent: '#4ade80' },
  warning: { bg: 'rgba(231, 185, 4, 0.15)', border: 'rgba(231, 185, 4, 0.3)', accent: '#fbbf24' },
  info:    { bg: 'rgba(13, 126, 192, 0.15)', border: 'rgba(13, 126, 192, 0.3)', accent: '#60a5fa' },
  device:  { bg: 'rgba(13, 126, 192, 0.15)', border: 'rgba(13, 126, 192, 0.3)', accent: '#60a5fa' },
  alexa:   { bg: 'rgba(255, 153, 0, 0.15)', border: 'rgba(255, 153, 0, 0.3)', accent: '#ff9900' },
  tv:      { bg: 'rgba(20, 40, 160, 0.15)', border: 'rgba(20, 40, 160, 0.4)', accent: '#818cf8' },
  error:   { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', accent: '#f87171' },
  critical: { bg: 'rgba(220, 38, 38, 0.2)', border: 'rgba(220, 38, 38, 0.4)', accent: '#dc2626' }, // Added critical
};

// Auto-dismiss durations by priority
const DURATIONS = {
  critical: null,    // Manual dismiss only
  error: 7000,       // 7 seconds
  warning: 5000,     // 5 seconds
  success: 3000,     // 3 seconds
  info: 4000,        // 4 seconds
  device: 4000,
  alexa: 4000,
  tv: 4000,
};

// Priority order (higher = more important)
const PRIORITIES = {
  critical: 5,
  error: 4,
  warning: 3,
  info: 2,
  success: 1,
  device: 2,
  alexa: 2,
  tv: 2,
};

const MAX_VISIBLE_TOASTS = 5; // Maximum toasts visible at once

/**
 * Enhanced Toast Hook with Priority Queue
 * 
 * Features:
 * - Priority-based queue (critical > error > warning > info > success)
 * - Auto-dismiss with configurable durations
 * - Maximum 5 visible toasts
 * - Manual dismiss for critical toasts
 * - Duplicate prevention
 * 
 * @returns {Object} { toasts, addToast, dismiss, clearAll }
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const [queue, setQueue] = useState([]);

  // Add toast with priority queue
  const addToast = useCallback((message, type = 'info', duration = null) => {
    const id = ++toastId;
    const priority = PRIORITIES[type] || PRIORITIES.info;
    const autoDismissDuration = duration !== null ? duration : DURATIONS[type];

    const newToast = {
      id,
      message,
      type,
      priority,
      duration: autoDismissDuration,
      exiting: false,
      timestamp: Date.now(),
    };

    // Check for duplicate (same message and type within 2 seconds)
    setToasts(prevToasts => {
      const isDuplicate = prevToasts.some(
        t => t.message === message && t.type === type && (Date.now() - t.timestamp) < 2000
      );

      if (isDuplicate) {
        console.log('Skipping duplicate toast:', message);
        return prevToasts;
      }

      // Add to queue if we're at max visible
      if (prevToasts.length >= MAX_VISIBLE_TOASTS) {
        setQueue(prevQueue => {
          // Insert in priority order
          const newQueue = [...prevQueue, newToast].sort((a, b) => b.priority - a.priority);
          return newQueue;
        });
        return prevToasts;
      }

      // Add directly if under max
      const updatedToasts = [...prevToasts, newToast]
        .sort((a, b) => b.priority - a.priority) // Sort by priority
        .slice(0, MAX_VISIBLE_TOASTS); // Keep max limit

      return updatedToasts;
    });

    // Auto-dismiss if duration is set
    if (autoDismissDuration) {
      setTimeout(() => {
        dismiss(id);
      }, autoDismissDuration);
    }

    return id;
  }, []);

  // Dismiss toast
  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => {
        const filtered = prev.filter(t => t.id !== id);
        
        // If we have queued toasts, show next one
        setQueue(prevQueue => {
          if (prevQueue.length > 0 && filtered.length < MAX_VISIBLE_TOASTS) {
            const [nextToast, ...remainingQueue] = prevQueue;
            
            // Add next toast from queue
            setToasts(currentToasts => {
              const updated = [...currentToasts, nextToast]
                .sort((a, b) => b.priority - a.priority)
                .slice(0, MAX_VISIBLE_TOASTS);
              return updated;
            });
            
            // Auto-dismiss if needed
            if (nextToast.duration) {
              setTimeout(() => dismiss(nextToast.id), nextToast.duration);
            }
            
            return remainingQueue;
          }
          return prevQueue;
        });
        
        return filtered;
      });
    }, 400); // Match exit animation duration
  }, []);

  // Clear all toasts
  const clearAll = useCallback(() => {
    setToasts(prev => prev.map(t => ({ ...t, exiting: true })));
    setQueue([]);
    setTimeout(() => setToasts([]), 400);
  }, []);

  return { toasts, addToast, dismiss, clearAll };
}

export function useSmartHomeToasts(addToast, data, prevDataRef) {
  useEffect(() => {
    const prev = prevDataRef.current;
    if (!prev || !data.connected) {
      prevDataRef.current = data;
      return;
    }

    // Skip if this is the first real scan
    if (prev.scan_count === 0 && data.scan_count <= 1) {
      prevDataRef.current = data;
      return;
    }

    const prevMacs = new Set((prev.devices || []).map(d => d.mac));
    const currMacs = new Set((data.devices || []).map(d => d.mac));

    // New devices detected
    for (const d of (data.devices || [])) {
      if (d.mac && !prevMacs.has(d.mac)) {
        const name = d.vendor && d.vendor !== 'Unknown' ? d.vendor : d.ip;
        if (d.vendor?.includes('Amazon')) {
          addToast(`Echo device joined: ${d.ip}`, 'alexa');
        } else if (d.vendor?.includes('Samsung')) {
          addToast(`Samsung device found: ${name}`, 'tv');
        } else {
          addToast(`New device: ${name} (${d.ip})`, 'device');
        }
      }
    }

    // Devices went offline
    for (const d of (prev.devices || [])) {
      if (d.mac && !currMacs.has(d.mac)) {
        const name = d.vendor && d.vendor !== 'Unknown' ? d.vendor : d.ip;
        addToast(`Device left: ${name}`, 'warning');
      }
    }

    // TV state changed
    if (prev.tv?.status !== data.tv?.status && data.tv?.status) {
      if (data.tv.status === 'on') {
        addToast(`Samsung TV is now ON`, 'tv');
      } else if (prev.tv?.status === 'on' && data.tv.status === 'off') {
        addToast(`Samsung TV turned OFF`, 'warning');
      }
    }

    prevDataRef.current = data;
  }, [data.scan_count]);
}

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const color = COLORS[toast.type] || COLORS.info;
        return (
          <div
            key={toast.id}
            className={`toast-item ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
            style={{
              background: color.bg,
              borderColor: color.border,
            }}
            onClick={() => onDismiss(toast.id)}
          >
            <span className="toast-icon">{ICONS[toast.type] || 'ℹ️'}</span>
            <span className="toast-message">{toast.message}</span>
            <span className="toast-close">×</span>
          </div>
        );
      })}
    </div>
  );
}
