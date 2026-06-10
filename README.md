# ReliefRoute: Disaster Response Control Hub & Tactical Logistics Router

**Domain Alignment:** Disaster Management, State-Level Civil Logistics, Applied AI  
**Academic Alignment:** Capstone Project — B.Tech in Computer Science and Artificial Intelligence (CSE AI)  
**Institution:** JECRC Foundation  

---

## 📡 Executive Summary
ReliefRoute is an event-driven disaster logistics coordination platform designed to optimize the delivery of critical supplies (water, medical kits, food) during natural crises. When wildfires, flash floods, or severe weather render conventional commercial routing (e.g. Google Maps) hazardous or blocked, ReliefRoute automatically aggregates live planetary hazard telemetry, executes fast radial proximity checks using the Haversine formula, and leverages Google Gemini AI (`gemini-1.5-flash`) to generate immediate, context-aware detour directives and tactical briefs.

---

## 🚀 Key Accomplishments & Architectural Highlights

- **Full-Stack Logistics Risk Management:** Architected an async full-stack logistics risk management platform using Node.js/Express (designed with dual-mode compatibility for FastAPI/SQLAlchemy migrations) and a premium, dark-themed React Leaflet dashboard to monitor live global shipping lanes, convoy corridors, and hazard zones.
- **Multi-Criteria Telemetry Integration:** Engineered a spatial proximity engine that evaluates active routes against real-time weather alerts (Open-Meteo), routing coordinates, and planetary hazard data (NASA EONET API).
- **Gemini-Powered AI Decision Support:** Integrated a Google Gemini-powered LLM Decision Support module with an offline rule-based simulator fallback to generate structured JSON detours (`recommended_detour`, `estimated_delay_minutes`, `tactical_summary`) for emergency convoy dispatchers.
- **Real-Time Data Distribution Layer:** Designed a local JSON database driver (backed by a WebSockets server) that replicates Supabase's Realtime protocol. When a database modification occurs (e.g. convoy coordinate change or incident creation), updates are instantly broadcasted down open WebSockets to all active operator consoles without page reloads.
- **Role-Based Access Control (RBAC):** Built a security model mapping users to roles (Command Response Administrator vs Field Monitor Operator). Operators receive read-only dashboard access, while Administrators unlock simulator controls to trigger wildfires, drive convoys, and clear hazards.

---

## 🛠️ System Architecture

```text
       [ NASA EONET Planetary Stream ]
                      │
                      ▼
   ┌─────────────────────────────────────┐
   │          Node.js Backend            │ ◄───[ Open-Meteo Weather API ]
   │  (Simulated GPS Telemetry Loop)     │
   │  (Haversine Distance Evaluations)   │ ───(Context Prompt)───► [ Google Gemini API ]
   └─────────────────────────────────────┘                             │
                      │                                                ▼
         (WebSocket   │   (REST Queries)                         (JSON Directive)
         Broadcast)   │
                      ▼
   ┌─────────────────────────────────────┐
   │         Supabase Emulator           │
   │    (Local File Database Engine)     │
   └─────────────────────────────────────┘
                      │
                      ▼ (Live websocket updates)
   ┌─────────────────────────────────────┐
   │          React Frontend             │
   │   (Vite, Tailwind, Framer Motion)   │
   │      (CartoDB Dark Matter Map)      │
   └─────────────────────────────────────┘
```

---

## 📂 Project Directory Structure

```text
reliefroute/
├── backend/
│   ├── config/
│   │   └── db.js            # In-memory and file-based Supabase Database Emulator
│   ├── controllers/
│   │   ├── authController.js# Mock auth registration & session provider
│   │   ├── convoyController.js # Fleet CRUD & coordinate evaluations
│   │   └── hazardController.js # NASA & manual simulation incident handlers
│   ├── services/
│   │   ├── nasaService.js   # Fetches EONET events and checks radial proximity
│   │   ├── geminiService.js # Google Gemini LLM API integration
│   │   ├── weatherService.js# Localized weather monitoring (Open-Meteo)
│   │   └── convoySimulator.js # Drives convoys on 10s intervals
│   ├── utils/
│   │   └── haversine.js     # Mathematical distance formulas
│   ├── index.js             # HTTP/WS Server bootstrap & cron scheduler
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── MapCanvas.jsx   # React-Leaflet integration with CartoDB Dark Matter
    │   │   ├── LiveSidebar.jsx # Collapsible side panel with Tab widgets
    │   │   ├── StatusBadge.jsx #Glowing state indicators (ACTIVE, WARNING, REROUTED)
    │   │   ├── MissionLog.jsx  # Scrolling event history timeline
    │   │   └── AiAlertModal.jsx # Framer Motion alert panel
    │   ├── config/
    │   │   └── supabaseClient.js # Intercepts queries to route locally or to production
    │   ├── context/
    │   │   ├── AuthContext.jsx  # Global session management
    │   │   └── LiveStateContext.jsx # Real-time state synchronizer
    │   ├── pages/
    │   │   ├── Login.jsx       # Minimalist stark-black login
    │   │   ├── Signup.jsx      # Stark-black signup with Role selection
    │   │   └── Dashboard.jsx   # Primary operations command tower
    │   ├── App.jsx
    │   └── index.css
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── package.json
```

---

## 🛢️ Database Schema & Models

### Convoys (`convoys` Table)
| Column Name | Data Type | Key Type | Description |
|---|---|---|---|
| `id` | VARCHAR / UUID | Primary Key | Unique convoy identifier |
| `call_sign` | VARCHAR | - | Tactical call sign (e.g. `convoy-alpha`) |
| `cargo_type` | VARCHAR | - | Medical supplies, food, water |
| `lat` | FLOAT | - | Current GPS Latitude |
| `lon` | FLOAT | - | Current GPS Longitude |
| `dest_lat` | FLOAT | - | Target Destination Latitude |
| `dest_lon` | FLOAT | - | Target Destination Longitude |
| `status` | VARCHAR | - | `ACTIVE` (safe), `WARNING` (weather/near-miss), `REROUTED` |
| `ai_directive` | JSONB / TEXT | - | Maps `{ recommended_detour, estimated_delay_minutes, tactical_summary }` |
| `updated_at` | TIMESTAMP | - | Telemetry timestamp |

### Hazards / Incidents (`incidents` Table)
| Column Name | Data Type | Key Type | Description |
|---|---|---|---|
| `id` | VARCHAR | Primary Key | NASA EONET ID or custom simulation ID |
| `title` | VARCHAR | - | Incident description (e.g., `LA County Wildfire`) |
| `hazard_type` | VARCHAR | - | `wildfires`, `severeStorms`, `floods`, `volcanoes` |
| `lat` | FLOAT | - | Epicenter Latitude |
| `lon` | FLOAT | - | Epicenter Longitude |
| `radius_km` | FLOAT | - | Radius of danger parameters |
| `reported_at` | TIMESTAMP | - | Date reported |

### Mission Logs (`mission_logs` Table)
| Column Name | Data Type | Key Type | Description |
|---|---|---|---|
| `id` | VARCHAR | Primary Key | Log event identifier |
| `convoy_id` | VARCHAR | Foreign Key | Reference to the convoy |
| `convoy_call_sign` | VARCHAR | - | Snapshot of convoy call sign |
| `event_type` | VARCHAR | - | `AI_REROUTED`, `WEATHER_ALERT`, `STATUS_CHANGE` |
| `ai_summary` | TEXT | - | Summary description of logistics threat |
| `created_at` | TIMESTAMP | - | Event creation time |

---

## 📥 Local Installation & Quickstart

### Prerequisites
- Node.js (version 18 or higher)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/yash23082007/Relief-Route.git
cd Relief-Route
```

### 2. Configure Environment Variables
Create a `.env` file inside the `backend/` folder:
```bash
PORT=5000
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```
*(If no `GEMINI_API_KEY` is provided, the backend falls back to an intelligent, rule-based simulator to generate detours during demo checks).*

### 3. Install & Start Backend Server
```bash
cd backend
npm install
npm start
```
The server will run on `http://localhost:5000` and start the convoy simulator interval.

### 4. Install & Start Frontend (Vite)
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173/` in your browser.

---

## 🔍 Verification Flow & Live Demo Script
1. **Operator Access:** Register an account as a **Field Monitor Operator** (email/password). Access the dashboard and observe that the Simulation settings tab indicates controls are locked in read-only mode.
2. **Admin Access:** Log out, select **Command Response Administrator (Full Access)** during signup, and register an admin session. Notice that controls are fully interactive.
3. **Pulsing Hazards:** Observe EONET planetary hazards rendering on the dark-mode Leaflet canvas as pulsing red regions.
4. **Trigger Simulation Threat:** Under the **Simulate** tab, click **Spawn Fire** next to `convoy-alpha`.
5. **Generative Rerouting:** Within 4 seconds, check that the WS broadcast alerts the client, sliding the **AI Collision Avoidance** alert modal into the viewport displaying Gemini's cardinal detour directives.
6. **Timeline Logging:** Click **Apply Detour**, switch to the **Timeline** tab, and verify that the rerouting is added to the event history feed.
