import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLiveState } from '../../context/LiveStateContext';
import { LogOut, User, Compass, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CommandBar() {
  const { user, logout } = useAuth();
  const { convoys, incidents, lanes } = useLiveState();
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const counts = {
    active: convoys.filter(c => c.status === 'SAILING' || c.status === 'ACTIVE').length,
    warning: convoys.filter(c => c.status === 'ARRIVING' || c.status === 'WARNING').length,
    rerouted: convoys.filter(c => c.status === 'REROUTED').length,
    hazards: incidents.length,
  };

  return (
    <header style={{
      height: '56px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-default)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
      zIndex: 'var(--z-header)',
      position: 'relative',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
        <span style={{ color: 'var(--accent-blue)', fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center' }}>
          <Compass size={22} className="text-blue-500 animate-spin-slow" />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px', fontFamily: 'var(--font-display)', letterSpacing: 'var(--tracking-wide)' }}>
            RELIEFROUTE
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            GLOBAL MARITIME RISK COMMAND
          </span>
        </div>
      </div>

      {/* Telemetry Stats Pill Indicators */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {[
          { label: 'ACTIVE FLEET', value: counts.active, color: 'var(--status-safe)', dot: true },
          { label: 'WARNING STATES', value: counts.warning, color: 'var(--status-warn)', dot: true },
          { label: 'REROUTED CORRIDORS', value: counts.rerouted, color: 'var(--status-critical)', dot: true, animate: counts.rerouted > 0 },
          { label: 'PLANETARY HAZARDS', value: counts.hazards, color: 'var(--text-secondary)', dot: false },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'var(--bg-base)',
            border: `1px solid ${stat.color}22`,
            borderRadius: 'var(--radius-md)',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            {stat.dot && (
              <span className={stat.animate ? 'animate-pulse' : ''} style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: stat.color,
                boxShadow: stat.color === 'var(--status-critical)' ? 'var(--status-critical-glow)' : stat.color === 'var(--status-warn)' ? 'var(--status-warn-glow)' : 'var(--status-safe-glow)',
              }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: 'var(--tracking-wide)' }}>
                {stat.label}
              </span>
              <span style={{ color: stat.color, fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {stat.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action / Clock Panel */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* UTC Clock */}
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: 'var(--tracking-wide)' }}>
            CHRONO / UTC
          </span>
          <span style={{ color: 'var(--accent-blue)', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {time.toUTCString().slice(17, 25)}
          </span>
        </div>

        {/* User Badge */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '11px', fontWeight: 650, fontFamily: 'var(--font-body)' }}>
                {user.email}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                {user.user_metadata?.role === 'admin' ? 'RESPONSE ADM' : 'FIELD MONITOR'}
              </span>
            </div>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${user.user_metadata?.role === 'admin' ? 'var(--status-safe)44' : 'var(--border-strong)'}`,
              background: user.user_metadata?.role === 'admin' ? 'var(--status-safe-dim)' : 'var(--bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: user.user_metadata?.role === 'admin' ? 'var(--status-safe)' : 'var(--text-secondary)',
            }}>
              <User size={16} />
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Terminate Command Session"
          style={{
            background: 'var(--status-critical-dim)',
            border: '1px solid var(--status-critical)44',
            color: 'var(--status-critical)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--status-critical)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--status-critical-dim)';
            e.currentTarget.style.color = 'var(--status-critical)';
          }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
}
