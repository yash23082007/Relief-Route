import React from 'react';
import { Info, HelpCircle, Cpu, ShieldCheck, Terminal, BookOpen } from 'lucide-react';

export default function AboutPage() {
  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, letterSpacing: 'var(--tracking-tight)' }}>
          SYSTEM BRIEFING & DOCUMENTATION
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0 0', fontFamily: 'var(--font-mono)' }}>
          ReliefRoute // Operations Instrument Security & Architectural Specifications
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', maxWidth: '1000px' }}>
        
        {/* Row 1: Why Needed & How to Use */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="flex-col md:flex-row">
          {/* Card 1: Why Needed */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <ShieldCheck size={16} style={{ color: 'var(--status-safe)' }} />
              <span>1. OPERATIONAL RATIONALE (WHY NEEDED)</span>
            </div>
            <p style={cardBodyText}>
              Global supply chains are highly vulnerable to localized bottlenecks and planetary disruptions (extreme weather, seismic anomalies, military conflicts). Modern maritime operations suffer from <strong>cognitive overload</strong> — operators are forced to cross-reference multiple disjointed feeds under pressure.
            </p>
            <p style={cardBodyText}>
              ReliefRoute aggregates live telemetry, weather metrics, and planetary hazards into a unified <strong>Operations Instrument</strong>. It automates risk evaluation and uses advanced AI to recommend collision-avoidance vectors, minimizing cargo delay times and optimizing port customs logistics.
            </p>
          </div>

          {/* Card 2: How to Use */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <HelpCircle size={16} style={{ color: 'var(--accent-blue)' }} />
              <span>2. OPERATIONAL PROTOCOL (HOW TO USE)</span>
            </div>
            <ul style={{ ...listStyle, paddingLeft: '20px' }}>
              <li style={listItemStyle}>
                <strong>Monitor Dashboard:</strong> Observe active shipping lanes and ports. Lanes are dynamically color-coded: green (Open), amber (Congested), or red (Blocked) based on real-time threat indices.
              </li>
              <li style={listItemStyle}>
                <strong>Vessel Fleet CRUD:</strong> Add, edit, or remove vessel records in the Fleet Console. Admin credentials allow parameter changes; operator roles are read-only.
              </li>
              <li style={listItemStyle}>
                <strong>AI Detour Activation:</strong> Click "Edit Parameters" on a vessel to input custom disruptions or let the simulator automatically detect hazards to trigger Google Gemini detour briefs.
              </li>
              <li style={listItemStyle}>
                <strong>Feed Ingestion:</strong> Manually trigger planetary hazard refreshes from the NASA EONET and USGS database in the Hazard Intel tab.
              </li>
            </ul>
          </div>
        </div>

        {/* Row 2: How it is Made & Stack Used */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="flex-col md:flex-row">
          {/* Card 3: How it is Made */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <Cpu size={16} style={{ color: 'var(--status-warn)' }} />
              <span>3. ARCHITECTURAL ENGINE (HOW IT IS MADE)</span>
            </div>
            <p style={cardBodyText}>
              The application runs on a <strong>decoupled async full-stack engine</strong>. The backend uses Python FastAPI with SQLAlchemy ORM and Alembic schema migrations. Telemetry coordinates are fed into an asynchronous simulation loop that updates vessel positions, calculates great-circle intersections, and streams state changes.
            </p>
            <p style={cardBodyText}>
              Telemetry and risk updates are pushed to React clients instantly via a custom <strong>Server-Sent Events (SSE) stream</strong>. The frontend uses React with Vite, styled with CSS variables and custom utility tokens matching a military operations center aesthetic.
            </p>
          </div>

          {/* Card 4: Technology Stack */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <Terminal size={16} style={{ color: 'var(--white-80)' }} />
              <span>4. SYSTEM STACK DEPENDENCIES</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { name: 'FastAPI (Python 3.10)', role: 'Asynchronous REST APIs, Server-Sent Events streaming, and background loops.' },
                { name: 'React v19 & Vite', role: 'Vibrant dark-theme UI compiling with atomic component design.' },
                { name: 'Leaflet.js Mapping', role: 'Renders dynamic polyline shipping corridors, custom port markers, and customs buffers.' },
                { name: 'Google Gemini Pro REST', role: 'Processes multi-criteria risks to write situational briefs and suggest detours.' },
                { name: 'Open-Meteo & TomTom APIs', role: 'Supplies real-time marine wave forecasts, wind speeds, and traffic congestion metrics.' },
                { name: 'Alembic & SQLite', role: 'Zero-config transactional local database with auto-generated migration history.' }
              ].map((tech, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', fontSize: '11px', lineHeight: 1.3 }}>
                  <span style={{ color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {tech.name}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {tech.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Technical Terminology Glossaries */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <BookOpen size={16} style={{ color: 'var(--status-critical)' }} />
            <span>5. OPERATIONAL GLOSSARY (TECHNICAL TERMS)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="flex-col md:flex-row">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { term: 'OSRM (Open Source Routing Machine)', desc: 'High-performance routing engine used to plot path coordinates between vessel locations and target ports.' },
                { term: 'Haversine Distance Formula', desc: 'Computes great-circle distances between coordinate pairs on a sphere, determining when a vessel enters a hazard danger radius.' },
                { term: 'SSE (Server-Sent Events) Stream', desc: 'A push pipeline where the FastAPI server broadcasts real-time telemetry updates to multiple web client instances without socket handshake overhead.' }
              ].map((term, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', fontSize: '11px', lineHeight: 1.3 }}>
                  <span style={{ color: 'var(--status-warn)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {term.term}
                  </span>
                  <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>
                    {term.desc}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { term: 'Customs Clearance Buffer', desc: 'A semi-transparent circular perimeter (e.g. 70km radius) surrounding ports where vessels must slow down for queue sorting.' },
                { term: 'Transit Risk Penalty Index', desc: 'A weighted threat index (0-100) calculated by combining Open-Meteo wind/wave scores, traffic delay metrics, and active USGS/EONET hazards.' },
                { term: 'Alembic Migrations', desc: 'A lightweight database migration tool for SQLAlchemy, tracking database schema changes and updates deterministically.' }
              ].map((term, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', fontSize: '11px', lineHeight: 1.3 }}>
                  <span style={{ color: 'var(--status-warn)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {term.term}
                  </span>
                  <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>
                    {term.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

const cardStyle = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-lg)',
  padding: '20px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

const cardHeaderStyle = {
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 700,
  letterSpacing: 'var(--tracking-wide)',
  color: 'var(--text-primary)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  borderBottom: '1px solid var(--border-subtle)',
  paddingBottom: '8px',
  margin: 0
};

const cardBodyText = {
  margin: 0,
  fontSize: '12px',
  color: 'var(--text-secondary)',
  lineHeight: '1.5'
};

const listStyle = {
  margin: 0,
  color: 'var(--text-secondary)',
  fontSize: '12px',
  lineHeight: '1.5'
};

const listItemStyle = {
  marginBottom: '8px'
};
