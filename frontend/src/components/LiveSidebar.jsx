import React, { useState } from 'react';
import { useLiveState } from '../context/LiveStateContext';
import { useAuth } from '../context/AuthContext';
import StatusBadge from './StatusBadge';
import MissionLog from './MissionLog';
import { Truck, Flame, ShieldAlert, RotateCcw, RefreshCw, Navigation, Play, Trash2, Clock, ShieldCheck, Lock } from 'lucide-react';

const LiveSidebar = ({ selectedConvoy, onSelectConvoy }) => {
  const { 
    convoys, 
    incidents, 
    logs,
    moveConvoy, 
    triggerManualIncident, 
    clearSimulation, 
    resetConvoys, 
    runNasaIngestion 
  } = useLiveState();

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('fleets'); // 'fleets' | 'hazards' | 'timeline' | 'controls'
  const [ingesting, setIngesting] = useState(false);
  const [drivingIntervals, setDrivingIntervals] = useState({}); // tracking drive sim loops

  // Stat counts
  const warningCount = convoys.filter(c => c.status === 'WARNING').length;
  const reroutedCount = convoys.filter(c => c.status === 'REROUTED').length;

  const handleRunIngestion = async () => {
    if (!isAdmin) return;
    setIngesting(true);
    await runNasaIngestion();
    setIngesting(false);
  };

  // Simulate step-by-step movement of a convoy towards its destination
  const toggleDriveSimulation = (convoy) => {
    if (!isAdmin) return;
    const id = convoy.id;
    if (drivingIntervals[id]) {
      // Pause
      clearInterval(drivingIntervals[id]);
      const newIntervals = { ...drivingIntervals };
      delete newIntervals[id];
      setDrivingIntervals(newIntervals);
    } else {
      // Start moving step by step (10 steps from current position to destination)
      let step = 0;
      const totalSteps = 25;
      const startLat = convoy.lat;
      const startLon = convoy.lon;
      const latDiff = (convoy.dest_lat - startLat) / totalSteps;
      const lonDiff = (convoy.dest_lon - startLon) / totalSteps;

      const intervalId = setInterval(() => {
        step++;
        if (step > totalSteps) {
          clearInterval(intervalId);
          const newIntervals = { ...drivingIntervals };
          delete newIntervals[id];
          setDrivingIntervals(newIntervals);
          // snap to final dest
          moveConvoy(id, convoy.dest_lat, convoy.dest_lon);
          return;
        }
        
        const currentLat = startLat + (latDiff * step);
        const currentLon = startLon + (lonDiff * step);
        moveConvoy(id, currentLat, currentLon);
      }, 1000); // update every 1s

      setDrivingIntervals({
        ...drivingIntervals,
        [id]: intervalId
      });
    }
  };

  // Quick simulation helper: spawn a fire right in front of Convoy Alpha
  const spawnTestHazardNearConvoy = (convoy, type = 'wildfires') => {
    if (!isAdmin) return;
    // Spawn 8km in the direction of its destination so it triggers collision check
    const latOffset = (convoy.dest_lat - convoy.lat) * 0.25;
    const lonOffset = (convoy.dest_lon - convoy.lon) * 0.25;
    
    const targetLat = convoy.lat + latOffset;
    const targetLon = convoy.lon + lonOffset;
    
    const mockHazard = {
      id: `sim-hazard-${Date.now()}`,
      title: type === 'wildfires' ? `Simulation Wildfire [${convoy.call_sign}]` : `Simulation Flash Flood [${convoy.call_sign}]`,
      hazard_type: type,
      lat: parseFloat(targetLat.toFixed(5)),
      lon: parseFloat(targetLon.toFixed(5)),
      radius_km: type === 'wildfires' ? 12.0 : 20.0,
      reported_at: new Date().toISOString()
    };
    
    triggerManualIncident(mockHazard);
  };

  return (
    <div className="w-full lg:w-96 bg-[#0f172a] border border-slate-800 rounded-2xl flex flex-col h-full shadow-2xl overflow-hidden select-none">
      
      {/* Dashboard Brand Header */}
      <div className="p-4 border-b border-slate-800 bg-[#0a0f1d] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Navigation className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-bold font-mono tracking-wide text-sm text-slate-100">RELIEFROUTE</h1>
            <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Tactical Control Hub</p>
          </div>
        </div>
        
        {/* Connection status dot */}
        <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-full px-2 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[9px] font-semibold font-mono text-emerald-400">WS SYNCED</span>
        </div>
      </div>

      {/* Role Indicator Banner */}
      <div className={`px-4 py-1.5 text-[10px] font-mono font-semibold flex items-center justify-between border-b ${
        isAdmin 
          ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' 
          : 'bg-amber-950/20 border-amber-900/30 text-amber-400'
      }`}>
        <div className="flex items-center space-x-1.5">
          {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          <span>ROLE: {isAdmin ? 'ADMINISTRATIVE ACCESS' : 'FIELD MONITOR (READ-ONLY)'}</span>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/50 border-b border-slate-800">
        <div className="bg-slate-950/60 border border-slate-800/80 p-2 rounded-lg flex flex-col items-center">
          <span className="text-slate-400 text-[10px] font-medium font-sans">Active Fleets</span>
          <span className="text-lg font-bold font-mono text-indigo-400">{convoys.length}</span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/80 p-2 rounded-lg flex flex-col items-center">
          <span className="text-slate-400 text-[10px] font-medium font-sans">Warnings</span>
          <span className={`text-lg font-bold font-mono ${warningCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-500'}`}>{warningCount}</span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/80 p-2 rounded-lg flex flex-col items-center">
          <span className="text-slate-400 text-[10px] font-medium font-sans">Rerouted</span>
          <span className={`text-lg font-bold font-mono ${reroutedCount > 0 ? 'text-red-500 glow-text-red' : 'text-slate-500'}`}>{reroutedCount}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0b0f19] p-1 border-b border-slate-800/50">
        <button
          onClick={() => setActiveTab('fleets')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex flex-col items-center justify-center ${
            activeTab === 'fleets' 
              ? 'bg-slate-800 text-white shadow' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck className="h-3.5 w-3.5" />
          <span className="text-[9px] mt-0.5">Fleets</span>
        </button>
        <button
          onClick={() => setActiveTab('hazards')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex flex-col items-center justify-center ${
            activeTab === 'hazards' 
              ? 'bg-slate-800 text-white shadow' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="h-3.5 w-3.5" />
          <span className="text-[9px] mt-0.5">Hazards</span>
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex flex-col items-center justify-center ${
            activeTab === 'timeline' 
              ? 'bg-slate-800 text-white shadow' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="text-[9px] mt-0.5">Timeline</span>
        </button>
        <button
          onClick={() => setActiveTab('controls')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex flex-col items-center justify-center ${
            activeTab === 'controls' 
              ? 'bg-slate-800 text-white shadow' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span className="text-[9px] mt-0.5">Simulate</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        
        {/* TAB 1: FLEETS */}
        {activeTab === 'fleets' && (
          <div className="space-y-2.5">
            {convoys.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No fleets deployed. Dispatch new fleet.</div>
            ) : (
              convoys.map((convoy) => {
                const isSelected = selectedConvoy?.id === convoy.id;
                const isDriving = !!drivingIntervals[convoy.id];
                
                return (
                  <div
                    key={convoy.id}
                    onClick={() => onSelectConvoy(convoy)}
                    className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'bg-slate-800/80 border-indigo-500 shadow-md shadow-indigo-500/5' 
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`p-1.5 rounded-lg ${
                          convoy.status === 'REROUTED' 
                            ? 'bg-red-950/50 text-red-400 border border-red-900/50' 
                            : convoy.status === 'WARNING' 
                              ? 'bg-amber-950/50 text-amber-400 border border-amber-900/50' 
                              : 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50'
                        }`}>
                          <Truck className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs font-mono text-slate-200 uppercase tracking-wide">
                            {convoy.call_sign}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-medium">Cargo: {convoy.cargo_type}</p>
                        </div>
                      </div>
                      
                      {/* Integrated premium StatusBadge component */}
                      <StatusBadge status={convoy.status} />
                    </div>

                    {/* Telemetry info */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                      <div>
                        <span className="text-slate-500 font-sans block">Current Lat/Lon</span>
                        <span>{convoy.lat.toFixed(4)}, {convoy.lon.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans block">Destination</span>
                        <span>{convoy.dest_lat.toFixed(4)}, {convoy.dest_lon.toFixed(4)}</span>
                      </div>
                    </div>

                    {/* AI reroute prompt display if REROUTED */}
                    {convoy.status === 'REROUTED' && convoy.ai_directive && (
                      <div className="mt-2.5 p-2.5 bg-red-950/20 border border-red-900/30 rounded-lg">
                        <div className="flex items-center space-x-1.5 text-red-400 font-semibold text-[10px] uppercase font-mono tracking-wider">
                          <ShieldAlert className="h-3 w-3" />
                          <span>AI REROUTING DIRECTIVE</span>
                        </div>
                        <p className="text-[10px] text-red-300 font-medium mt-1 font-mono leading-relaxed">
                          → {convoy.ai_directive.recommended_detour} (+{convoy.ai_directive.estimated_delay_minutes} min)
                        </p>
                      </div>
                    )}
                    
                    {/* Inline drive button (Admin Only) */}
                    {isAdmin && (
                      <div className="mt-2.5 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDriveSimulation(convoy);
                          }}
                          className={`text-[9px] font-bold font-mono px-2 py-1 rounded-md flex items-center space-x-1 transition-all ${
                            isDriving 
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' 
                              : 'bg-indigo-650 text-white hover:bg-indigo-600'
                          }`}
                        >
                          {isDriving ? (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping"></span>
                              <span>STOP TELEMETRY</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-2.5 w-2.5 fill-current" />
                              <span>DRIVE SIMULATION</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: HAZARDS */}
        {activeTab === 'hazards' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ingested Hazards</span>
              {isAdmin && (
                <button 
                  onClick={handleRunIngestion}
                  disabled={ingesting}
                  className="text-[9px] font-bold font-mono text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${ingesting ? 'animate-spin' : ''}`} />
                  <span>{ingesting ? 'SYNCING...' : 'SYNC NASA NOW'}</span>
                </button>
              )}
            </div>
            
            {incidents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                No active hazards detected. Fetch NASA data or spawn simulated incidents.
              </div>
            ) : (
              incidents.slice(0, 50).map((hazard) => { // limit displaying to first 50 to avoid DOM bloating
                const getHazardEmoji = (type) => {
                  if (type === 'wildfires') return '🔥';
                  if (type === 'severeStorms') return '⛈️';
                  if (type === 'floods') return '🌊';
                  if (type === 'volcanoes') return '🌋';
                  return '⚠️';
                };
                
                return (
                  <div
                    key={hazard.id}
                    className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl flex items-start space-x-2.5"
                  >
                    <div className="text-base p-1.5 bg-slate-950 border border-slate-800/80 rounded-lg flex-shrink-0">
                      {getHazardEmoji(hazard.hazard_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold font-mono uppercase text-red-400 bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/20">
                          {hazard.hazard_type}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          {hazard.radius_km} km radius
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-200 mt-1 truncate">
                        {hazard.title}
                      </h4>
                      <p className="text-[9px] text-slate-500 font-mono mt-1">
                        Lat: {hazard.lat.toFixed(4)}, Lon: {hazard.lon.toFixed(4)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: TIMELINE EVENT FEED */}
        {activeTab === 'timeline' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center pb-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Mission Timeline Feed</span>
              {isAdmin && logs.length > 0 && (
                <button
                  onClick={async () => {
                    await fetch('http://localhost:5000/api/mission_logs/clear', { method: 'POST' });
                  }}
                  className="text-[9px] font-bold font-mono text-red-400 hover:text-red-300"
                >
                  CLEAR LOGS
                </button>
              )}
            </div>
            
            <MissionLog events={logs} />
          </div>
        )}

        {/* TAB 4: CONTROLS & SIMULATOR */}
        {activeTab === 'controls' && (
          <div className="space-y-4">
            
            {/* RBAC Lockdown Warning */}
            {!isAdmin && (
              <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl text-amber-400 text-[10px] font-mono leading-relaxed flex items-start space-x-2">
                <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>ADMINISTRATIVE CONTROLS LOCKED. LOG IN WITH AN ADMINISTRATIVE OPERATOR ROLE TO SPAWN THREATS OR MANUALLY TRIGGER ROUTE COMPILATIONS.</span>
              </div>
            )}

            {/* Simulation triggers */}
            <div className={`bg-slate-900/60 border border-slate-800 p-3 rounded-xl space-y-2.5 transition-all ${!isAdmin ? 'opacity-40 pointer-events-none' : ''}`}>
              <h4 className="font-bold text-xs text-slate-200 font-mono tracking-wide uppercase">Manual Collision Spawner</h4>
              <p className="text-[10px] text-slate-400">
                Instantly spawn a hazard directly along a convoy's trajectory to test real-time distance logic and Gemini AI rerouting advice.
              </p>
              
              <div className="space-y-2 mt-2">
                {convoys.map((convoy) => (
                  <div key={convoy.id} className="flex flex-col p-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                    <span className="text-[10px] font-bold font-mono text-slate-300 uppercase">{convoy.call_sign}</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => spawnTestHazardNearConvoy(convoy, 'wildfires')}
                        disabled={!isAdmin}
                        className="py-1 px-1.5 bg-orange-655/10 hover:bg-orange-600/25 border border-orange-500/20 text-orange-400 font-bold text-[9px] font-mono rounded-md flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <span>🔥 Spawn Fire</span>
                      </button>
                      <button
                        onClick={() => spawnTestHazardNearConvoy(convoy, 'floods')}
                        disabled={!isAdmin}
                        className="py-1 px-1.5 bg-blue-655/10 hover:bg-blue-600/25 border border-blue-500/20 text-blue-400 font-bold text-[9px] font-mono rounded-md flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <span>🌊 Spawn Flood</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Global system resets */}
            <div className={`bg-slate-900/60 border border-slate-800 p-3 rounded-xl space-y-3 transition-all ${!isAdmin ? 'opacity-40 pointer-events-none' : ''}`}>
              <h4 className="font-bold text-xs text-slate-200 font-mono tracking-wide uppercase">System Command Panel</h4>
              
              <button
                onClick={handleRunIngestion}
                disabled={ingesting || !isAdmin}
                className="w-full py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs rounded-lg flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 text-indigo-400 ${ingesting ? 'animate-spin' : ''}`} />
                <span>Force NASA EONET Ingest</span>
              </button>

              <button
                onClick={resetConvoys}
                disabled={!isAdmin}
                className="w-full py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs rounded-lg flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 text-amber-400" />
                <span>Reset Fleet Telemetry</span>
              </button>

              <button
                onClick={clearSimulation}
                disabled={!isAdmin}
                className="w-full py-2 bg-red-650/15 hover:bg-red-650/25 border border-red-500/30 text-red-400 font-bold text-xs rounded-lg flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4 text-red-400" />
                <span>Clear All Hazard Zones</span>
              </button>
            </div>
            
            {/* System Specs panel */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[9px] text-slate-500 space-y-1">
              <div className="flex justify-between"><span>Simulation Interval:</span><span className="text-slate-400">10s (Active GPS Loop)</span></div>
              <div className="flex justify-between"><span>Ingestion Interval:</span><span className="text-slate-400">5 min (Scheduled)</span></div>
              <div className="flex justify-between"><span>Spatial Equation:</span><span className="text-slate-400">Haversine Great-Circle</span></div>
              <div className="flex justify-between"><span>Generative Anchor:</span><span className="text-slate-400">gemini-1.5-flash</span></div>
              <div className="flex justify-between"><span>Meteorology Feed:</span><span className="text-slate-400">Open-Meteo REST API</span></div>
            </div>

          </div>
        )}

      </div>

      {/* Selected Convoy Details footer */}
      {selectedConvoy && (
        <div className="p-3 border-t border-slate-800 bg-[#0a0f1d] text-xs space-y-2 animate-fade-in">
          <div className="flex justify-between items-center">
            <span className="font-bold text-[10px] uppercase font-mono tracking-wider text-slate-400">Selected Telemetry</span>
            <button 
              onClick={() => onSelectConvoy(null)}
              className="text-[9px] font-bold font-mono text-slate-500 hover:text-slate-400 uppercase"
            >
              Close
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200">{selectedConvoy.call_sign}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              selectedConvoy.status === 'REROUTED' ? 'text-red-400 bg-red-950/30' : selectedConvoy.status === 'WARNING' ? 'text-amber-400 bg-amber-950/30' : 'text-emerald-400 bg-emerald-950/30'
            }`}>
              {selectedConvoy.status}
            </span>
          </div>
          <div className="font-mono text-[10px] text-slate-400 leading-relaxed bg-slate-950/50 p-2 rounded-lg border border-slate-900">
            <div>Cargo: {selectedConvoy.cargo_type}</div>
            <div>Pos: {selectedConvoy.lat.toFixed(5)}, {selectedConvoy.lon.toFixed(5)}</div>
            <div>Dest: {selectedConvoy.dest_lat.toFixed(5)}, {selectedConvoy.dest_lon.toFixed(5)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveSidebar;
