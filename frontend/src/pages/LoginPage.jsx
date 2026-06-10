import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { Compass, ShieldAlert, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const DEMO_HAZARDS = [
  { lat: 12.0, lon: 45.0, r: 250000, type: 'severe storm' },  // Gulf of Aden
  { lat: 8.9, lon: -79.5, r: 150000, type: 'congestion' },    // Panama Canal
  { lat: 30.6, lon: 32.3, r: 200000, type: 'military disruption' },  // Suez Canal
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [clearance, setClearance] = useState('operator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await login(email, password);
      if (authError) {
        setError(authError.message || 'Authentication failed. Check credentials.');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('System link communication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden', position: 'relative' }}>
      
      {/* LEFT — Login Form Panel */}
      <div style={{
        width: '45%',
        minWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '64px 56px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
        zIndex: 10,
        boxShadow: '10px 0 30px rgba(0,0,0,0.5)',
      }}>
        {/* Brand */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ color: 'var(--accent-blue)', fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center' }}>
              <Compass className="animate-spin-slow text-blue-500" size={32} />
            </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '22px', fontFamily: 'var(--font-display)', letterSpacing: 'var(--tracking-wide)' }}>
              RELIEFROUTE
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: 'var(--tracking-widest)', fontWeight: 600 }}>
            GLOBAL SHIPPING LANE RISK OPERATIONS COMMAND
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: 'var(--tracking-widest)', display: 'block', marginBottom: 6, fontWeight: 700 }}>
              OPERATOR COMMAND EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="e.g. dutyofficer@reliefroute.net"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: 'var(--tracking-widest)', display: 'block', marginBottom: 6, fontWeight: 700 }}>
              SECURITY LOGON KEY
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ ...inputStyle, paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: 'var(--tracking-widest)', display: 'block', marginBottom: 6, fontWeight: 700 }}>
              COMMAND SECURE CLEARANCE
            </label>
            <select
              value={clearance}
              onChange={e => setClearance(e.target.value)}
              style={inputStyle}
            >
              <option value="operator">Field Monitor Coordinator (Read-Only)</option>
              <option value="admin">EOC Incident Commander (Full Access)</option>
            </select>
          </div>

          {error && (
            <div style={{
              color: 'var(--status-critical)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '10px 12px',
              background: 'var(--status-critical-dim)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--status-critical)44',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            style={{
              background: loading ? 'var(--white-20)' : 'var(--accent-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '14px 24px',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              letterSpacing: 'var(--tracking-wide)',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 8,
              boxShadow: 'var(--accent-blue-glow)',
            }}
          >
            {loading ? 'LINKING INTERFACE...' : 'ESTABLISH SECURE LINK →'}
          </motion.button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Need to register a new command key?{' '}
          <Link to="/signup" style={{ color: 'var(--accent-blue)', fontWeight: 650, textDecoration: 'none' }}>
            Register Operator Profile
          </Link>
        </div>

        {/* System Status Indicator */}
        <div style={{ marginTop: '56px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-safe)', boxShadow: 'var(--status-safe-glow)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ color: 'var(--text-primary)', fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: 'var(--tracking-wide)', fontWeight: 700 }}>
              ALL CORE TELEMETRY LINKED
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'var(--font-mono)' }}>
              SYSTEM LATENCY: 42MS | NOAA SYNC: LIVE
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT — Dark Maritime Map (Decorative, Non-Interactive) */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MapContainer
          center={[18.0, 10.0]} zoom={3}
          style={{ height: '100%', width: '100%', pointerEvents: 'none' }}
          zoomControl={false} dragging={false}
          scrollWheelZoom={false} doubleClickZoom={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {DEMO_HAZARDS.map((h, i) => (
            <React.Fragment key={i}>
              <Circle center={[h.lat, h.lon]} radius={h.r}
                pathOptions={{ color: 'var(--status-critical)', fillColor: 'var(--status-critical)', fillOpacity: 0.04, weight: 1.5, dashArray: '6 6' }}
              />
              <Circle center={[h.lat, h.lon]} radius={h.r / 3}
                pathOptions={{ color: 'var(--status-critical)', fillColor: 'var(--status-critical)', fillOpacity: 0.12, weight: 0 }}
              />
            </React.Fragment>
          ))}
        </MapContainer>
        {/* Sleek Overlay Gradient Fade over map */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, var(--bg-base) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '12px 14px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
};
