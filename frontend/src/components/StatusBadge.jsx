import React from 'react';

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'ACTIVE',
    color: '#10b981', // Emerald-500
    glow: '0 0 10px rgba(16, 185, 129, 0.4)',
    bg: 'rgba(16, 185, 129, 0.1)'
  },
  WARNING: {
    label: 'WARNING',
    color: '#f59e0b', // Amber-500
    glow: '0 0 10px rgba(245, 158, 11, 0.4)',
    bg: 'rgba(245, 158, 11, 0.1)'
  },
  REROUTED: {
    label: 'REROUTED',
    color: '#ef4444', // Red-500
    glow: '0 0 10px rgba(239, 68, 68, 0.4)',
    bg: 'rgba(239, 68, 68, 0.1)'
  }
};

export const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || {
    label: status || 'UNKNOWN',
    color: '#94a3b8',
    glow: 'none',
    bg: 'rgba(148, 163, 184, 0.1)'
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
