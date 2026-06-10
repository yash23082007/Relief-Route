import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useLiveState } from '../context/LiveStateContext';

const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_TILE_ATTRIBUTION = '© OpenStreetMap contributors © CARTO';

// Design System Tricolor & Status Mapping
const STATUS_COLORS = {
  ACTIVE:   '#22c55e', // Green
  WARNING:  '#f59e0b', // Amber
  REROUTED: '#ef4444', // Red
  STANDBY:  '#64748b', // Slate / Moored
};

// Map vessel state strings to Design System keys
const getStatusKey = (status) => {
  if (status === 'SAILING') return 'ACTIVE';
  if (status === 'ARRIVING' || status === 'WARNING') return 'WARNING';
  if (status === 'REROUTED') return 'REROUTED';
  return 'STANDBY';
};

const MapController = ({ selectedConvoy }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedConvoy) {
      map.flyTo([selectedConvoy.lat, selectedConvoy.lon], 5, {
        animate: true,
        duration: 1.5
      });
    }
  }, [selectedConvoy, map]);
  return null;
};

// Tricolor circular custom marker with center dot
const createConvoyIcon = (status, callSign) => {
  const statusKey = getStatusKey(status);
  const color = STATUS_COLORS[statusKey];
  
  return L.divIcon({
    className: 'custom-convoy-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `
      <div class="relative flex flex-col items-center">
        <!-- Outer pulse ring -->
        <span class="absolute inline-flex h-8 w-8 rounded-full opacity-40 animate-ping" style="background-color: ${color}; top:-0px;"></span>
        
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-lg">
          <circle cx="16" cy="16" r="12" fill="${color}" opacity="0.2"/>
          <circle cx="16" cy="16" r="8"  fill="${color}"/>
          <circle cx="16" cy="16" r="4"  fill="white"/>
        </svg>
        
        <div class="absolute -top-7 bg-[#0f172a] border border-[#334155] text-[10px] text-slate-200 px-1.5 py-0.5 rounded font-mono font-bold tracking-tight shadow-md whitespace-nowrap">
          ${callSign}
        </div>
      </div>
    `,
  });
};

// Custom anchor icon for ports
const createPortIcon = (name) => {
  return L.divIcon({
    className: 'custom-port-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `
      <div class="w-6 h-6 rounded-full bg-[#0f172a] border border-[#3b82f6] flex items-center justify-center text-[11px] shadow-lg shadow-blue-500/20" title="${name}">
        ⚓
      </div>
    `,
  });
};

const createHazardIcon = (type) => {
  let emoji = '⚠️';
  let border = 'border-red-500';

  if (type.includes('wildfire') || type.includes('fire')) {
    emoji = '🔥';
    border = 'border-orange-500';
  } else if (type.includes('storm') || type.includes('weather')) {
    emoji = '⛈️';
    border = 'border-blue-500';
  } else if (type.includes('earthquake')) {
    emoji = '🫨';
    border = 'border-amber-600';
  } else if (type.includes('volcano')) {
    emoji = '🌋';
    border = 'border-rose-600';
  }

  return L.divIcon({
    className: 'custom-hazard-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `
      <div class="w-7 h-7 rounded-full bg-[#030712]/95 border ${border} flex items-center justify-center text-xs animate-pulse shadow-lg">
        <span>${emoji}</span>
      </div>
    `,
  });
};

const MapCanvas = ({ selectedConvoy, onSelectConvoy }) => {
  const { convoys, incidents, ports, lanes, customsBuffers } = useLiveState();

  // Set global view to capture worldwide shipping networks (Panama, Suez, Shanghai, Rotterdam, NY)
  const defaultCenter = [25.0, 10.0];
  const defaultZoom = 2;

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-[var(--border-default)] bg-[var(--bg-base)] shadow-2xl">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        zoomControl={true}
        style={{ height: '100%', width: '100%', background: '#030712' }}
        className="w-full h-full"
      >
        <TileLayer url={DARK_TILE_URL} attribution={DARK_TILE_ATTRIBUTION} />

        <MapController selectedConvoy={selectedConvoy} />

        {/* 1. Render Customs Buffers (Dashed Blue Zones around Ports) */}
        {ports && ports.map(port => {
          // Find matching buffer
          const buffer = customsBuffers ? customsBuffers.find(b => b.port_id === port.id) : null;
          const radiusKm = buffer ? buffer.radius_km : 70.0;
          const averageWait = buffer ? buffer.average_clearance_hours : 12.0;
          
          return (
            <Circle
              key={`buffer-${port.id}`}
              center={[port.latitude, port.longitude]}
              radius={radiusKm * 1000} // Leaflet takes meters
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.03,
                weight: 1.2,
                dashArray: '4, 8'
              }}
            >
              <Tooltip sticky>
                <div className="text-xs font-sans">
                  <span className="font-bold text-blue-400">{port.name} Customs Buffer</span>
                  <br/>
                  Radius: {radiusKm} km | Avg Queue: {averageWait.toFixed(1)} hrs
                </div>
              </Tooltip>
            </Circle>
          );
        })}

        {/* 2. Render Shipping Lanes (Colored by threat status/congestion penalty) */}
        {lanes && lanes.map(lane => {
          let laneColor = '#22c55e'; // default green (OPEN)
          if (lane.status === 'CONGESTED') laneColor = '#f59e0b';
          if (lane.status === 'BLOCKED') laneColor = '#ef4444';

          return (
            <Polyline
              key={`lane-${lane.id}`}
              positions={lane.coordinates}
              pathOptions={{
                color: laneColor,
                weight: 3.5,
                opacity: 0.65,
              }}
            >
              <Tooltip sticky>
                <div className="text-xs font-mono">
                  <span className="font-bold text-slate-200">{lane.name}</span>
                  <br/>
                  Status: <span style={{ color: laneColor }}>{lane.status}</span>
                  <br/>
                  Penalty Index: {lane.current_penalty.toFixed(1)}/100
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* 3. Render Ports (Anchor Markers) */}
        {ports && ports.map(port => (
          <Marker
            key={`port-${port.id}`}
            position={[port.latitude, port.longitude]}
            icon={createPortIcon(port.name)}
          >
            <Popup>
              <div className="text-slate-900 p-2 max-w-[200px]">
                <h3 className="font-bold font-mono text-sm text-slate-800">⚓ PORT OF {port.name.toUpperCase()}</h3>
                <div className="mt-1 space-y-1 text-xs">
                  <p><span className="font-semibold text-slate-500">Congestion:</span> {(port.congestion_level * 100).toFixed(0)}%</p>
                  <p><span className="font-semibold text-slate-500">Status:</span> 
                    <span className={`ml-1 font-bold ${port.status === 'BLOCKED' ? 'text-red-600' : port.status === 'CONGESTED' ? 'text-amber-600' : 'text-green-600'}`}>
                      {port.status}
                    </span>
                  </p>
                  <p className="text-[10px] font-mono text-slate-400">Lat: {port.latitude}, Lon: {port.longitude}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 4. Render Active Hazards overlay */}
        {incidents.map(hazard => (
          <React.Fragment key={hazard.id}>
            <Circle
              center={[hazard.lat, hazard.lon]}
              radius={hazard.radius_km * 1000}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: '6 4',
              }}
            >
              <Tooltip sticky>
                <span className="font-mono text-red-400 font-bold">{hazard.title}</span> — {hazard.radius_km} km danger zone
              </Tooltip>
            </Circle>

            <Marker
              position={[hazard.lat, hazard.lon]}
              icon={createHazardIcon(hazard.hazard_type)}
            >
              <Popup>
                <div className="text-slate-950 font-sans p-2">
                  <h4 className="font-bold text-red-600">{hazard.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Reported: {new Date(hazard.reported_at).toLocaleString()}</p>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* 5. Render Vessel Fleet */}
        {convoys.map(c => (
          <Marker
            key={c.id}
            position={[c.lat, c.lon]}
            icon={createConvoyIcon(c.status, c.call_sign)}
            eventHandlers={{
              click: () => onSelectConvoy(c)
            }}
          >
            <Tooltip>
              <div className="font-sans text-xs">
                <strong>{c.call_sign}</strong> ({c.cargo_type})<br/>
                Destination: {c.destination_port || 'Sailing'}<br/>
                Status: <span style={{ color: STATUS_COLORS[getStatusKey(c.status)] }} className="font-bold">{c.status}</span>
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {/* Decorative military command grids */}
      <div className="absolute inset-0 pointer-events-none border border-slate-800/40 rounded-xl" 
           style={{
             backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.02) 1px, transparent 0)',
             backgroundSize: '20px 20px'
           }}
      />
    </div>
  );
};

export default MapCanvas;
