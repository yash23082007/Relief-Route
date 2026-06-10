import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Anchor, ShieldAlert, Clipboard, Settings, HelpCircle, CloudSun } from 'lucide-react';

export default function NavSidebar() {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'COMMAND DASHBOARD', icon: LayoutDashboard },
    { path: '/fleet', label: 'FLEET MANAGEMENT', icon: Anchor },
    { path: '/hazards', label: 'HAZARD INTEL', icon: ShieldAlert },
    { path: '/mission-log', label: 'MISSION TIMELINE', icon: Clipboard },
    { path: '/settings', label: 'SYSTEM CONFIG', icon: Settings },
    { path: '/weather', label: 'WEATHER RADAR', icon: CloudSun },
    { path: '/about', label: 'SYSTEM BRIEFING', icon: HelpCircle },
  ];

  return (
    <aside style={{
      width: '64px',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 0',
      gap: '20px',
      flexShrink: 0,
      zIndex: 'var(--z-sidebar)',
    }}>
      {navItems.map((item, idx) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
          <NavLink
            key={idx}
            to={item.path}
            title={item.label}
            style={({ isActive }) => ({
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-blue-dim)' : 'transparent',
              border: `1px solid ${isActive ? 'var(--accent-blue)44' : 'transparent'}`,
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
            })}
            className="group"
          >
            <Icon size={20} className="transition-transform group-hover:scale-110" />
            
            {/* Glowing Active Marker */}
            {isActive && (
              <div style={{
                position: 'absolute',
                left: 0,
                width: '3px',
                height: '16px',
                background: 'var(--accent-blue)',
                boxShadow: 'var(--accent-blue-glow)',
                borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              }} />
            )}

            {/* Custom Tooltip */}
            <div className="absolute left-16 px-2 py-1 bg-slate-950 border border-slate-800 text-[10px] text-slate-200 rounded font-mono font-bold tracking-wide pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg whitespace-nowrap z-50">
              {item.label}
            </div>
          </NavLink>
        );
      })}
    </aside>
  );
}
