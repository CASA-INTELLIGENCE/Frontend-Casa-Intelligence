// Central API & WebSocket service
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = BASE.replace('http', 'ws') + '/ws';

export const api = {
  get: (path) => fetch(`${BASE}${path}`).then(r => r.json()),
  post: (path, body) => fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json()),
};

export { WS_URL };
