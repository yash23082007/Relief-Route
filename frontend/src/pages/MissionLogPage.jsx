import React, { useState } from 'react';
import { useLiveState } from '../context/LiveStateContext';
import { FileText, Trash2, Calendar, Shield, MapPin, Search } from 'lucide-react';

const FILTER_TYPES = [
  { value: 'ALL', label: 'All Operations' },
  { value: 'WEATHER_ALERT', label: 'Weather Risks' },
  { value: 'HAZARD_ALERT', label: 'Planetary Hazards' },
  { value: 'TRAFFIC_ALERT', label: 'AI Rerouting Log' },
  { value: 'CUSTOMS_ALERT', label: 'Clearance & Arrival' },
];

const STYLES_CONFIG = {
  WEATHER_ALERT: {
    color: 'var(--status-warn)',
    dot: '#f59e0b',
    label: 'WEATHER BLOCK',
    iconColor: '#f59e0b',
  },
  HAZARD_ALERT: {
    color: 'var(--status-critical)',
    dot: '#ef4444',
    label: 'PERIMETER THREAT',
    iconColor: '#ef4444',
  },
  TRAFFIC_ALERT: {
    color: 'var(--accent-blue)',
    dot: '#3b82f6',
    label: 'AI DETOUR ACTION',
    iconColor: '#3b82f6',
  },
  CUSTOMS_ALERT: {
    color: 'var(--status-safe)',
    dot: '#22c55e',
    label: 'PORT ARREST / MOORED',
    iconColor: '#22c55e',
  },
  DEFAULT: {
    color: 'var(--text-secondary)',
    dot: '#64748b',
    label: 'SYSTEM LOG',
    iconColor: '#64748b',
  }
};

export default function MissionLogPage() {
  const { logs, clearSimulation, refreshTelemetry } = useLiveState();
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to purge all operations archives? This action is irreversible.')) return;
    await clearSimulation();
    await refreshTelemetry();
  };

  const handleExport = () => {
    window.print();
  };

  const filteredLogs = logs.filter(log => {
    const typeKey = log.event_type || 'DEFAULT';
    const matchFilter = filterType === 'ALL' || typeKey === filterType;
    const matchSearch = log.ai_summary.toLowerCase().includes(search.toLowerCase()) || 
                        (log.convoy_call_sign || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box' }} className="print-padding">
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }} className="print-hide">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, letterSpacing: 'var(--tracking-tight)' }}>
            MISSION LOG & AFTER-ACTION REVIEW
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0 0', fontFamily: 'var(--font-mono)' }}>
            Chronological audit logs of vessel state transitions, planetary disruptions, and AI mitigations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExport}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 18px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FileText size={14} /> EXPORT PDF REPORT
          </button>

          <button
            onClick={handleClear}
            style={{
              background: 'var(--status-critical-dim)',
              border: '1px solid var(--status-critical)44',
              color: 'var(--status-critical)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 18px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Trash2 size={14} /> PURGE LOGS
          </button>
        </div>
      </div>

      {/* Query Bar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        alignItems: 'center',
        flexShrink: 0
      }} className="print-hide flex-col md:flex-row">
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search operational logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-base)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px 10px 36px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Filter Dropdown */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            outline: 'none',
            cursor: 'pointer',
            minWidth: '200px'
          }}
        >
          {FILTER_TYPES.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Vertical Timeline Wrapper */}
      <div style={{
        flex: 1,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        overflowY: 'auto',
      }}>
        {filteredLogs.length === 0 ? (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
          }}>
            OPERATIONAL ARCHIVES EMPTY. NO LOGS MATCHING CRITERIA.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            
            {/* Center line */}
            <div style={{
              position: 'absolute',
              left: '9px',
              top: '8px',
              bottom: '8px',
              width: '2px',
              background: 'var(--border-subtle)',
              zIndex: 1
            }} />

            {/* Events */}
            {filteredLogs.map((log, idx) => {
              const style = STYLES_CONFIG[log.event_type] || STYLES_CONFIG.DEFAULT;
              const date = new Date(log.created_at || new Date());

              return (
                <div key={log.id || idx} style={{
                  display: 'flex',
                  gap: '20px',
                  paddingBottom: '24px',
                  position: 'relative',
                  zIndex: 2,
                }}>
                  
                  {/* Glowing timeline dot */}
                  <div style={{
                    width: '20px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    paddingTop: '4px'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: style.dot,
                      boxShadow: `0 0 10px ${style.dot}`,
                    }} />
                  </div>

                  {/* Log Card Box */}
                  <div style={{
                    flex: 1,
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                      borderBottom: '1px solid var(--border-invisible)',
                      paddingBottom: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          color: style.color,
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          border: `1px solid ${style.dot}33`,
                          background: `${style.dot}10`,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          {style.label}
                        </span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        <Calendar size={12} />
                        <span>{date.toLocaleDateString()} {date.toLocaleTimeString()} UTC</span>
                      </div>
                    </div>

                    <p style={{
                      margin: 0,
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      lineHeight: '1.5',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {log.ai_summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .print-hide { display: none !important; }
          .print-padding { padding: 0 !important; }
          body, #root { background: #fff !important; color: #000 !important; }
          main { background: #fff !important; }
        }
      `}} />
    </div>
  );
}
