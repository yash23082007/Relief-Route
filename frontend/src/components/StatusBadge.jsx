import React from 'react';

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'ACTIVE',
    color: 'var(--status-active)',
    glow: 'var(--glow-green)',
    bg: 'rgba(34, 197, 94, 0.1)'
  },
  SAILING: {
    label: 'SAILING',
    color: 'var(--status-active)',
    glow: 'var(--glow-green)',
    bg: 'rgba(34, 197, 94, 0.1)'
  },
  WARNING: {
    label: 'WARNING',
    color: 'var(--status-warning)',
    glow: 'var(--glow-amber)',
    bg: 'rgba(245, 158, 11, 0.1)'
  },
  ARRIVING: {
    label: 'ARRIVING',
    color: 'var(--status-warning)',
    glow: 'var(--glow-amber)',
    bg: 'rgba(245, 158, 11, 0.1)'
  },
  REROUTED: {
    label: 'REROUTED',
    color: 'var(--status-critical)',
    glow: 'var(--glow-red)',
    bg: 'rgba(239, 68, 68, 0.1)'
  },
  MOORED: {
    label: 'MOORED',
    color: '#64748b',
    glow: 'none',
    bg: 'rgba(100, 116, 139, 0.15)'
  },
  STANDBY: {
    label: 'STANDBY',
    color: '#64748b',
    glow: 'none',
    bg: 'rgba(100, 116, 139, 0.15)'
  }
};

export const StatusBadge = ({ status }) => {
  const normalizedStatus = (status || 'UNKNOWN').toUpperCase();
  const config = STATUS_CONFIG[normalizedStatus] || {
    label: normalizedStatus,
    color: 'var(--text-muted)',
    glow: 'none',
    bg: 'rgba(71, 85, 105, 0.1)'
  };

  return (
    <span
      className="px-2 py-0.5 rounded border text-[10px] font-bold font-mono tracking-wider transition-all duration-300"
      style={{
        color: config.color,
        borderColor: `${config.color}33`, // 20% opacity border
        backgroundColor: config.bg,
        boxShadow: config.glow
      }}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
