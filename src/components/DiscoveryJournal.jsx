import { useState } from 'react';

const JOURNAL_ENTRIES = [
  {
    phase: 1,
    date: "Día 1 — Investigación",
    title: "Descubriendo las APIs ocultas de mi red local",
    icon: "🔍",
    color: "#3b82f6",
    tags: ["Research", "Network", "Discovery"],
    content: `El reto comenzó con una pregunta simple: ¿qué dispositivos hay en mi red y cómo puedo hablar con ellos?
    
Empecé por lo básico — ejecutar \`arp -a\` en la terminal de Windows para ver la tabla ARP. Descubrí que el sistema operativo ya conoce las direcciones MAC e IP de todos los dispositivos con los que mi PC ha interactuado. Pero había un problema: dispositivos como el Echo Dot o la TV Samsung *nunca habían hablado con mi PC directamente*.

La solución fue implementar un **ping sweep activo** — una inundación controlada de pings a las 254 IPs posibles de mi subred (192.168.0.1 → 192.168.0.254). Esto fuerza una respuesta ARP de cada dispositivo vivo, poblando la tabla ARP con *todos* los dispositivos de la red, no solo los que mi PC había contactado antes.`,
    code: `# Ping sweep: descubriendo dispositivos "invisibles"
def ping_sweep(subnet: str):
    network = IPv4Network(subnet, strict=False)
    hosts = list(network.hosts())  # 254 IPs
    
    def ping(ip):
        subprocess.run(["ping", "-n", "1", "-w", "200", ip],
                       capture_output=True, timeout=1)
    
    # 254 pings simultáneos en threads independientes
    threads = [Thread(target=ping, args=(str(h),)) 
               for h in hosts]
    for t in threads: t.start()
    for t in threads: t.join(timeout=2)`,
    insight: "El ARP pasivo solo muestra dispositivos conocidos. El ping sweep activo revela TODOS los dispositivos vivos de la red — fue la clave para detectar el Echo Dot.",
  },
  {
    phase: 2,
    date: "Día 1 — TP-Link Archer C50",
    title: "Reverse-engineering del router TP-Link",
    icon: "🔌",
    color: "#4caf50",
    tags: ["TP-Link", "JSON-RPC", "Auth"],
    content: `El Archer C50 v6 tiene un panel web en \`http://192.168.0.1\`. Pero ¿qué hay detrás? Abrí DevTools del navegador mientras hacía login para espiar los requests HTTP.

Descubrí que el C50 usa un protocolo **JSON-RPC propietario**:
1. **Login**: POST a \`/\` con el password hasheado en MD5
2. **Respuesta**: Un token \`stok\` que actúa como session ID  
3. **Queries**: POST a \`/stok={token}/ds\` con operaciones para listar clientes WiFi, estadísticas de tráfico, etc.

El password se envía como \`MD5(password)\` — no en texto plano, pero tampoco es seguro porque MD5 es trivial de romper. Esto es un hallazgo real de seguridad.

**Hallazgo inesperado**: El firmware v6 del C50 tiene variaciones en las rutas de autenticación respecto a versiones anteriores. La librería \`tplink-router\` de Python no lo soporta directamente, así que implementé el cliente HTTP desde cero.`,
    code: `# TP-Link Archer C50: autenticación JSON-RPC
import hashlib, requests

password_hash = hashlib.md5(
    password.encode()
).hexdigest()

# 1. Login → obtener stok token
login = requests.post(f"http://{router_ip}/", json={
    "method": "do",
    "login": {"password": password_hash}
})
stok = login.json()["stok"]

# 2. Query clientes WiFi
clients = requests.post(
    f"http://{router_ip}/stok={stok}/ds",
    json={"hosts_info": {"table": "host_info"}}
)`,
    insight: "Los routers domésticos tienen APIs internas no documentadas. Con DevTools puedes descubrir exactamente cómo el panel web se comunica con el firmware.",
  },
  {
    phase: 3,
    date: "Día 2 — Samsung TV",
    title: "SSDP + WebSocket: controlando la TV sin control remoto",
    icon: "📺",
    color: "#1428a0",
    tags: ["Samsung", "SSDP", "WebSocket"],
    content: `Las Samsung Smart TVs (2016+) se anuncian en la red local usando **SSDP** (Simple Service Discovery Protocol), el mismo protocolo que UPnP. Envían un broadcast multicast a \`239.255.255.250:1900\` cada pocos segundos.

Descubrí 3 capas de comunicación con la TV:

**Capa 1 — REST API (Puerto 8001)**: Solo lectura. GET a \`http://TV_IP:8001/api/v2/\` devuelve JSON con modelo, nombre, resolución. No necesita autenticación.

**Capa 2 — WebSocket (Puerto 8002)**: Control total. Es donde envías comandos de tecla (KEY_POWER, KEY_VOLUP, etc.). La primera conexión requiere que el usuario **apruebe en la pantalla de la TV**. Después se genera un token persistente.

**Capa 3 — Encrypted WS**: TVs 2020+ usan WebSocket encriptado con AES. La librería \`samsungtvws[encrypted]\` maneja esto automáticamente.

**Hallazgo de seguridad**: Cualquier dispositivo en la misma red WiFi puede controlar la TV. No hay autenticación más allá de la aprobación inicial. Esto es un riesgo real en redes compartidas.`,
    code: `# Descubrimiento SSDP: encontrar la TV automáticamente
import socket

SSDP_ADDR = "239.255.255.250"
SSDP_PORT = 1900

msg = (
    "M-SEARCH * HTTP/1.1\\r\\n"
    f"HOST: {SSDP_ADDR}:{SSDP_PORT}\\r\\n"
    'MAN: "ssdp:discover"\\r\\n'
    "MX: 2\\r\\n"
    "ST: urn:samsung.com:device:*\\r\\n"
    "\\r\\n"
)

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.sendto(msg.encode(), (SSDP_ADDR, SSDP_PORT))
data, addr = sock.recvfrom(1024)
tv_ip = addr[0]  # ← IP de la TV descubierta`,
    insight: "SSDP es como un 'grito' en la red local: '¿Hay alguien ahí?' — y los dispositivos Samsung responden con su IP y capacidades. Así es como Chromecast, Sonos y otros dispositivos se descubren automáticamente.",
  },
  {
    phase: 4,
    date: "Día 2 — Amazon Echo Dot",
    title: "Identificación por OUI: la huella digital del hardware",
    icon: "🎙️",
    color: "#ff9900",
    tags: ["Alexa", "MAC OUI", "Fingerprinting"],
    content: `Los Echo Dots no tienen una API de descubrimiento local pública como Samsung. Pero tienen algo que no pueden ocultar: su **dirección MAC**.

Cada fabricante de hardware tiene un rango de prefijos MAC registrados ante el IEEE (llamados OUI — Organizationally Unique Identifier). Amazon tiene más de 15 prefijos registrados para sus dispositivos Echo:

\`F0:27:2D\`, \`44:65:0D\`, \`FC:A1:83\`, \`34:D2:70\`, \`74:75:48\`, etc.

Mi algoritmo:
1. Hacer el ping sweep para descubrir todos los dispositivos
2. Leer la tabla ARP para obtener las MACs
3. Comparar los primeros 3 bytes (OUI) contra la base de datos de Amazon
4. Si coincide → es un Echo

**Resultado**: Detecté mi Echo Dot en \`192.168.0.100\` con MAC \`C0:95:CF:0C:D7:9A\`. El vendor lookup confirmó "Amazon Technologies Inc."

Para enviar mensajes de voz (TTS), se necesitan credenciales de Amazon. Pero para la **detección y monitoreo**, el OUI matching es suficiente y no requiere ninguna credencial.`,
    code: `# Detección de Echo por OUI (sin credenciales)
AMAZON_OUIS = {
    "F0:27:2D", "44:65:0D", "FC:A1:83",
    "34:D2:70", "18:74:2E", "40:B4:CD",
    "74:75:48", "A4:08:EA", "68:37:E9",
    "38:F7:3D", "8C:85:80", "B4:7C:9C",
}

def is_echo_device(mac: str) -> bool:
    prefix = mac.upper()[:8]  # "F0:27:2D"
    return prefix in AMAZON_OUIS

# Resultado:
# 192.168.0.100 → C0:95:CF:0C:D7:9A 
# → vendor: "Amazon Technologies Inc."
# → ✅ Echo Dot detectado`,
    insight: "No necesitas APIs ni credenciales para detectar dispositivos IoT. La dirección MAC es una huella digital que revela el fabricante — y con eso, el tipo probable de dispositivo.",
  },
  {
    phase: 5,
    date: "Día 3 — Integración IA",
    title: "Gemini como cerebro analítico del hogar",
    icon: "🧠",
    color: "#8b5cf6",
    tags: ["Gemini", "AI", "google-genai"],
    content: `La última pieza del puzzle: darle "inteligencia" al dashboard. Integré **Google Gemini 2.0 Flash** para que analice el snapshot de la red en tiempo real y genere:

- **Security Score**: Puntuación de seguridad basada en dispositivos desconocidos, configuración del router, etc.
- **Insights**: Observaciones específicas sobre los dispositivos detectados
- **Automaciones sugeridas**: Ideas de reglas basadas en los patrones de uso

**Reto técnico**: La migración del SDK. Google tiene dos librerías:
- \`google-generativeai\` (deprecada) — API antigua
- \`google-genai\` (nueva) — API moderna con soporte para Gemini 2.0

Tuve que migrar de una a otra, cambiando de \`genai.GenerativeModel().generate_content()\` a \`genai.Client().models.generate_content()\`. El formato de respuesta también cambió.

**Rate limiting**: La Free Tier de Gemini limita a ~15 requests/minuto. Implementé un sistema de **cooldown + caché** para que el usuario nunca vea un error 429 — en su lugar, obtiene el resultado cacheado con un timer de "Wait Xs" en el botón.`,
    code: `# google-genai SDK (nuevo, 2024+)
from google import genai

client = genai.Client(api_key=API_KEY)

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=prompt,  # JSON del estado de la red
)

# Parsear respuesta JSON del modelo
result = json.loads(response.text)
# → { summary, insights[], security{}, automations[] }`,
    insight: "La IA no reemplaza el monitoreo — lo complementa. Gemini puede encontrar patrones y riesgos que serían tediosos de analizar manualmente, como dispositivos desconocidos o firmwares desactualizados.",
  },
  {
    phase: 6,
    date: "Día 3 — Arquitectura",
    title: "WebSockets: de polling a tiempo real",
    icon: "⚡",
    color: "#e7b904",
    tags: ["WebSocket", "FastAPI", "React"],
    content: `La decisión arquitectónica más importante del proyecto: **WebSockets vs HTTP Polling**.

Con polling, el frontend haría GET /api/devices cada N segundos. Funciona, pero:
- Genera requests innecesarios cuando no hay cambios
- Tiene latencia inherente (entre polls)
- Consume más ancho de banda

Con WebSockets, el backend tiene un **scan loop** que ejecuta cada 15 segundos y envía el estado automáticamente a TODOS los clientes conectados. El frontend solo necesita abrir una conexión y escuchar.

**Robustez**: Implementé manejo granular de errores en el scan loop. Cada paso (ARP, Router, TV, Alexa, Automations) está envuelto en su propio try/except. Si el router falla, la TV y Alexa siguen funcionando. El broadcast SIEMPRE se ejecuta, incluso con datos parciales.

**Auto-reconnect**: Si el backend se reinicia, el frontend detecta la desconexión y reintenta cada 5 segundos automáticamente. El usuario ve "Reconnecting..." → "Backend live" sin intervención manual.`,
    code: `# Backend: broadcast a todos los clientes
class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []
    
    async def broadcast(self, data: dict):
        for ws in self.active[:]:
            try:
                await ws.send_json(data)
            except:
                self.active.remove(ws)

# Frontend: auto-reconnect hook
ws.onclose = () => {
    setTimeout(connect, 5000); // retry in 5s
};`,
    insight: "WebSockets son ideales para dashboards de monitoreo. El servidor 'empuja' datos cuando hay cambios, en vez de que el cliente tenga que 'preguntar' constantemente.",
  },
];

function JournalEntry({ entry, isExpanded, onToggle }) {
  return (
    <div className="journal-entry" style={{ '--accent': entry.color }}>
      <div className="journal-timeline">
        <div className="journal-dot" style={{ background: entry.color, boxShadow: `0 0 12px ${entry.color}40` }} />
        <div className="journal-line" />
      </div>

      <div className="journal-content">
        <div className="journal-meta">
          <span className="journal-phase">Fase {entry.phase}</span>
          <span className="journal-date">{entry.date}</span>
        </div>

        <div className="journal-card" onClick={onToggle} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem' }}>{entry.icon}</span>
            <div style={{ flex: 1 }}>
              <h3 className="journal-title">{entry.title}</h3>
              <div className="journal-tags">
                {entry.tags.map(t => (
                  <span key={t} className="journal-tag" style={{ borderColor: `${entry.color}40`, color: entry.color }}>{t}</span>
                ))}
              </div>
            </div>
            <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
              ▼
            </span>
          </div>

          {isExpanded && (
            <div className="journal-expanded">
              <div className="journal-text">
                {entry.content.split('\n\n').map((p, i) => (
                  <p key={i} dangerouslySetInnerHTML={{ __html: p.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />
                ))}
              </div>

              {entry.code && (
                <div className="journal-code">
                  <div className="journal-code-header">
                    <span>💻 Código clave</span>
                  </div>
                  <pre><code>{entry.code}</code></pre>
                </div>
              )}

              <div className="journal-insight">
                <span style={{ fontSize: '1.1rem' }}>💡</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Key Insight</div>
                  <div>{entry.insight}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DiscoveryJournal() {
  const [expanded, setExpanded] = useState(new Set([1])); // Phase 1 open by default

  const toggle = (phase) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(phase) ? next.delete(phase) : next.add(phase);
      return next;
    });
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 4 }}>📝 Bitácora de Exploración</div>
            <div className="text-muted" style={{ fontSize: '0.85rem' }}>
              Documentación del proceso de descubrimiento de APIs locales — cómo investigamos, qué encontramos y cómo lo convertimos en un sistema funcional.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {JOURNAL_ENTRIES.length} fases documentadas
            </div>
            <button className="btn btn-ghost" style={{ marginTop: 6, fontSize: '0.75rem' }}
              onClick={() => setExpanded(prev => prev.size === JOURNAL_ENTRIES.length ? new Set() : new Set(JOURNAL_ENTRIES.map(e => e.phase)))}>
              {expanded.size === JOURNAL_ENTRIES.length ? '🔼 Colapsar todo' : '🔽 Expandir todo'}
            </button>
          </div>
        </div>
      </div>

      <div className="journal-timeline-container">
        {JOURNAL_ENTRIES.map(entry => (
          <JournalEntry
            key={entry.phase}
            entry={entry}
            isExpanded={expanded.has(entry.phase)}
            onToggle={() => toggle(entry.phase)}
          />
        ))}
      </div>
    </div>
  );
}
