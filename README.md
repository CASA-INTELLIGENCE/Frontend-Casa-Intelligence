# ⚛️ Casa Intelligence — Frontend (React)

> **Dashboard premium para el monitoreo y control del ecosistema tecnológico del hogar.**

Interfaz de usuario moderna y reactiva diseñada para centralizar el control de dispositivos **Samsung**, **Alexa** y el estado de la red **TP-Link**, con descubrimiento semi‑dinámico desde el backend (mDNS + SSDP).

## 🎨 Diseño y Experiencia (Aesthetics)

- **Dark Mode Premium:** Paleta de colores basada en HSL profundos, bordes sutiles y tipografía moderna (Inter/Outfit).
- **Interactividad:** Micro-animaciones en botones y estados de carga personalizados.
- **Arquitectura de Componentes:** 
  - `NetworkMap`: Visualización en cuadrícula de dispositivos con filtros por tipo.
  - `TVPanel`: Emulación de control remoto físico con retroalimentación hápitca visual.
  - `AIInsights`: Interfaz conversacional que muestra el "cerebro" de la red.
  - `Automations`: Panel de control de reglas con logs de alertas en tiempo real.

## 🛠️ Stack Tecnológico

- **Core:** React 18 + Vite
- **Estado:** WebSockets (Custom Hook `useSmartHome`) para actualizaciones en tiempo real.
- **Styling:** CSS puro siguiendo principios de diseño atómico y variables globales de diseño (Design Tokens).
- **Iconografía:** Lucide React para una estética limpia y consistente.

## 🚀 Configuración

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Variables de Entorno:**
   Configura el `.env` para apuntar al backend:
   ```env
    VITE_API_URL=http://localhost:8000
   ```

3. **Desarrollo:**
   ```bash
   npm run dev
   ```

## 🧠 Integración de IA

El frontend muestra insights generados por IA desde el backend (Groq como proveedor principal con fallback). Al presionar "Analizar mi red", el sistema genera un reporte dinámico sobre:
- Puntaje de seguridad de la red local.
- Recomendaciones de automatización personalizadas.
- Análisis de uso de dispositivos.

## 🎙️ Alexa (Demo)

El panel de Alexa incluye envío de mensajes en **modo demo**. Esto permite mostrar la funcionalidad sin depender de credenciales reales. Para producción, se requiere integrar la API oficial de Amazon con credenciales.

---
*Parte del Reto Técnico AdoptAI — Vibe Engineer Challenge*
