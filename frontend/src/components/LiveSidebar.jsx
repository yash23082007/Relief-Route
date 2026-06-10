import React, { useState } from 'react';
import { useLiveState } from '../context/LiveStateContext';
import { useAuth } from '../context/AuthContext';
import StatusBadge from './StatusBadge';
import MissionLog from './MissionLog';
import { Ship, Flame, ShieldAlert, RotateCcw, RefreshCw, Navigation, Play, Trash2, Clock, ShieldCheck, Lock, Anchor } from 'lucide-react';

const LiveSidebar = ({ selectedConvoy, onSelectConvoy }) => {
  const { 
    convoys, 
    incidents, 
    logs,
    ports,
    lanes,
    triggerManualIncident, 
    clearSimulation, 
    resetConvoys, 
    runNasaIngestion 
  } = useLiveState();

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('fleets'); // 'fleets' | 'ports' | 'timeline' | 'controls'
  const [ingesting, setIngesting] = useState(false);

  // Stat counts
  const warningCount = convoys.filter(c => c.status === 'ARRIVING' || c.status === 'WARNING').length;
  const reroutedCount = convoys.filter(c => c.status === 'REROUTED').length;

  const handleRunIngestion = async () => {
    if (!isAdmin) return;
    setIngesting(true);
    await runNasaIngestion();
    setIngesting(false);
  };

  // Quick simulation helper: spawn a storm hazard directly in front of the vessel
  const spawnTestHazardNearConvoy = (convoy, type = 'storm') => {
    if (!isAdmin) return;
    
    // Spawn hazard slightly shifted from vessel coordinates to intersect the lane
    const latOffset = (convoy.dest_lat - convoy.lat) * 0.15;
    const lonOffset = (convoy.dest_lon - convoy.lon) * 0.15;
    
    const targetLat = convoy.lat + latOffset;
    const targetLon = convoy.lon + lonOffset;
    
    const mockHazard = {
      title: type === 'storm' ? `Severe Cyclone Cell [${convoy.call_sign}]` : `USGS Fault Slip [${convoy.call_sign}]`,
      hazard_type: type,
      lat: parseFloat(targetLat.toFixed(5)),
      lon: parseFloat(targetLon.toFixed(5)),
      radius_km: type === 'storm' ? 95.0 : 120.0,
      severity: 'HIGH',
      reported_at: new Date().toISOString()
    };
    
    triggerManualIncident(mockHazard);
  };

  return (
    <div 
      className="w-full lg:w-80 flex flex-col h-full overflow-hidden select-none border-r border-[var(--border-default)]"
      style={{
        background: 'var(--bg-surface)',
        fontFamily: 'monospace'
      }}
    >
      
      {/* Brand Header */}
      <div className="p-4 border-b border-[var(--border-default)] flex items-center justify-between" style={{ background: '#0a0f1d' }}>
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-[#3b82f6] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Ship className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xs tracking-wider text-[var(--text-primary)]">RELIEFROUTE LOGISTICS</h1>
            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">TACTICAL TOWER</p>
          </div>
        </div>
        
        {/* Connection status */}
        <div className="flex items-center space-x-1.5 bg-[#030712] border border-[#334155] rounded-full px-2 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse"></span>
          <span className="text-[8px] font-bold text-[#22c55e] tracking-tight">SSE STREAM</span>
        </div>
      </div>

      {/* Role Banner */}
      <div 
        className="px-4 py-1.5 text-[9px] font-bold flex items-center justify-between border-b"
        style={{
          background: isAdmin ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          borderColor: isAdmin ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
          color: isAdmin ? 'var(--status-active)' : 'var(--status-warning)'
        }}
      >
        <div className="flex items-center space-x-1.5">
          {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          <span>ROLE: {isAdmin ? 'COMMAND ADMINISTRATOR' : 'READ-ONLY OPERATOR'}</span>
        </div>
      </div>

      {/* Stats Header */}
      <div className="grid grid-cols-3 gap-1 p-2 bg-[#030712]/40 border-b border-[var(--border-default)]">
        <div className="bg-[#030712]/60 border border-[var(--border-subtle)] p-1.5 rounded flex flex-col items-center">
          <span className="text-[var(--text-muted)] text-[8px] font-bold uppercase">FLEETS</span>
          <span className="text-sm font-bold text-blue-400">{convoys.length}</span>
        </div>
        <div className="bg-[#030712]/60 border border-[var(--border-subtle)] p-1.5 rounded flex flex-col items-center">
          <span className="text-[var(--text-muted)] text-[8px] font-bold uppercase">WARN</span>
          <span className={`text-sm font-bold ${warningCount > 0 ? 'text-[var(--status-warning)] animate-pulse' : 'text-[var(--text-muted)]'}`}>{warningCount}</span>
        </div>
        <div className="bg-[#030712]/60 border border-[var(--border-subtle)] p-1.5 rounded flex flex-col items-center">
          <span className="text-[var(--text-muted)] text-[8px] font-bold uppercase">REROUTE</span>
          <span className={`text-sm font-bold ${reroutedCount > 0 ? 'text-[var(--status-critical)]' : 'text-[var(--text-muted)]'}`}>{reroutedCount}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-[#030712] p-1 border-b border-[var(--border-default)]">
        <button
          onClick={() => setActiveTab('fleets')}
          className={`flex-1 py-1 text-[9px] font-bold rounded transition-all flex flex-col items-center justify-center ${
            activeTab === 'fleets' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)]' : 'text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          <Ship className="h-3 w-3 mb-0.5" />
          <span>FLEET</span>
        </button>
        <button
          onClick={() => setActiveTab('ports')}
          className={`flex-1 py-1 text-[9px] font-bold rounded transition-all flex flex-col items-center justify-center ${
            activeTab === 'ports' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)]' : 'text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          <Anchor className="h-3 w-3 mb-0.5" />
          <span>PORTS</span>
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 py-1 text-[9px] font-bold rounded transition-all flex flex-col items-center justify-center ${
            activeTab === 'timeline' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)]' : 'text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          <Clock className="h-3 w-3 mb-0.5" />
          <span>TIMELINE</span>
        </button>
        <button
          onClick={() => setActiveTab('controls')}
          className={`flex-1 py-1 text-[9px] font-bold rounded transition-all flex flex-col items-center justify-center ${
            activeTab === 'controls' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)]' : 'text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          <ShieldAlert className="h-3 w-3 mb-0.5" />
          <span>SIMULATE</span>
        </button>
      </div>

      {/* Tab content panel */}
      <div className="flex-1 overflow-y-auto">
        
        {/* FLEETS TAB */}
        {activeTab === 'fleets' && (
          <div>
            <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
              <span className="color-[var(--text-muted)] text-[10px] tracking-wider uppercase">
                DEPLOYED FLEETS — {convoys.length} UNITS
              </span>
            </div>
            {convoys.map(convoy => {
              const isSelected = selectedConvoy?.id === convoy.id;
              
              return (
                <div 
                  key={convoy.id}
                  onClick={() => onSelectConvoy(convoy)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s',
                    cursor: 'pointer'
                  }}
                  className={`${isSelected ? 'bg-[var(--bg-elevated)] border-l-2 border-blue-500' : 'hover:bg-[var(--bg-elevated)]'}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>
                      {convoy.call_sign}
                    </span>
                    <StatusBadge status={convoy.status} />
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{convoy.cargo_type}</div>
                  <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                    <span>
                      {convoy.lat.toFixed(4)}°N  {Math.abs(convoy.lon).toFixed(4)}°W
                    </span>
                    {convoy.destination_port && (
                      <span className="text-blue-400 font-bold">
                        → {convoy.destination_port}
                      </span>
                    )}
                  </div>
                  {convoy.ai_directive && (
                    <div style={{
                      marginTop: 8, padding: '6px 8px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 4, fontSize: 11, color: 'var(--status-critical)',
                    }}>
                      → {(convoy.ai_directive.recommended_action || convoy.ai_directive.recommended_detour || "").slice(0, 60)}...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* PORTS TAB */}
        {activeTab === 'ports' && (
          <div className="p-3 space-y-2">
            <span className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase block pb-1">
              PORT TERMINAL CONGESTION
            </span>
            {ports && ports.map(port => {
              const congestionColor = port.congestion_level > 0.25 ? 'var(--status-warning)' : 'var(--status-active)';
              return (
                <div key={port.id} className="p-2.5 bg-[#030712]/30 border border-[var(--border-subtle)] rounded flex flex-col space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-[var(--text-primary)] font-sans">⚓ {port.name}</span>
                    <StatusBadge status={port.status} />
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 relative overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${port.congestion_level * 100}%`,
                        backgroundColor: congestionColor 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-0.5 font-mono">
                    <span>Congestion: {(port.congestion_level * 100).toFixed(0)}%</span>
                    <span>Coordinates: {port.latitude.toFixed(1)}°N {port.longitude.toFixed(1)}°E</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="p-3 space-y-2">
            <span className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase block pb-1">
              LATEST TELEMETRY EVENTS
            </span>
            <MissionLog events={logs} />
          </div>
        )}

        {/* CONTROLS TAB */}
        {activeTab === 'controls' && (
          <div className="p-3 space-y-4">
            {!isAdmin && (
              <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded text-amber-400 text-[10px] leading-relaxed flex items-start space-x-2">
                <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>COMMAND LOCK: OPERATOR SESSIONS ARE READ-ONLY. SIGN IN AS A COMMAND ADMINISTRATOR TO MODIFY HAZARDS AND TRIGGER AI RE-ROUTING.</span>
              </div>
            )}

            {/* Simulated Hazards Spawner */}
            <div className={`p-3 bg-[#030712]/30 border border-[var(--border-subtle)] rounded-lg space-y-2.5 ${!isAdmin ? 'opacity-40 pointer-events-none' : ''}`}>
              <h4 className="font-bold text-xs text-[var(--text-primary)] uppercase">DISRUPTION GENERATOR</h4>
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                Inject localized climate/maritime hazards near sailing vessels to test multi-criteria routing updates.
              </p>
              
              <div className="space-y-2 pt-1">
                {convoys.map(convoy => (
                  <div key={convoy.id} className="p-2 bg-[#030712]/80 border border-[var(--border-subtle)] rounded space-y-1.5">
                    <div className="text-[10px] font-bold text-[var(--text-primary)] font-mono uppercase">{convoy.call_sign}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => spawnTestHazardNearConvoy(convoy, 'storm')}
                        disabled={!isAdmin}
                        className="py-1 px-1.5 bg-blue-900/20 hover:bg-blue-800/40 border border-blue-800/50 text-blue-400 font-bold text-[9px] rounded flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                      >
                        <span>⛈️ Spawn Storm</span>
                      </button>
                      <button
                        onClick={() => spawnTestHazardNearConvoy(convoy, 'earthquake')}
                        disabled={!isAdmin}
                        className="py-1 px-1.5 bg-amber-900/20 hover:bg-amber-800/40 border border-amber-800/50 text-amber-400 font-bold text-[9px] rounded flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                      >
                        <span>🌋 Seakequake</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Actions */}
            <div className={`p-3 bg-[#030712]/30 border border-[var(--border-subtle)] rounded-lg space-y-2.5 ${!isAdmin ? 'opacity-40 pointer-events-none' : ''}`}>
              <h4 className="font-bold text-xs text-[var(--text-primary)] uppercase">OPERATIONAL CONTROLS</h4>
              
              <button
                onClick={handleRunIngestion}
                disabled={ingesting || !isAdmin}
                className="w-full py-1.5 bg-[var(--bg-elevated)] hover:bg-[#334155] border border-[var(--border-default)] text-[var(--text-primary)] font-bold text-[11px] rounded flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 text-blue-400 ${ingesting ? 'animate-spin' : ''}`} />
                <span>FORCE TELEMETRY INGEST</span>
              </button>

              <button
                onClick={resetConvoys}
                disabled={!isAdmin}
                className="w-full py-1.5 bg-[var(--bg-elevated)] hover:bg-[#334155] border border-[var(--border-default)] text-[var(--text-primary)] font-bold text-[11px] rounded flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <RotateCcw className="h-3 w-3 text-amber-400" />
                <span>RESET SIMULATION CORRIDORS</span>
              </button>

              <button
                onClick={clearSimulation}
                disabled={!isAdmin}
                className="w-full py-1.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/25 border border-[#ef4444]/30 text-red-400 font-bold text-[11px] rounded flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Trash2 className="h-3 w-3 text-red-400" />
                <span>CLEAR DISRUPTIONS</span>
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Selected Vessel Footer panel */}
      {selectedConvoy && (
        <div className="p-3 border-t border-[var(--border-default)] bg-[#0a0f1d] text-[11px] space-y-2 animate-fade-in">
          <div className="flex justify-between items-center">
            <span className="font-bold text-[9px] uppercase text-[var(--text-muted)]">VESSEL STATS</span>
            <button 
              onClick={() => onSelectConvoy(null)}
              className="text-[9px] font-bold text-[var(--text-secondary)] hover:text-white"
            >
              CLOSE
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-[var(--text-primary)]">{selectedConvoy.call_sign}</span>
            <StatusBadge status={selectedConvoy.status} />
          </div>
          <div className="font-mono text-[10px] text-[var(--text-secondary)] leading-relaxed bg-[#030712] p-2 border border-[var(--border-subtle)] rounded">
            <div>Type: {selectedConvoy.cargo_type}</div>
            <div>Position: {selectedConvoy.lat.toFixed(4)}°N {Math.abs(selectedConvoy.lon).toFixed(4)}°W</div>
            {selectedConvoy.destination_port && (
              <div>Destination Port: {selectedConvoy.destination_port}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveSidebar;
