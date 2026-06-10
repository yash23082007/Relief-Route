import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useLiveState } from '../context/LiveStateContext';

// Helper component to handle programmatic map actions
const MapController = ({ selectedConvoy }) => {
  const map = useMap();
  
  useEffect(() => {
    if (selectedConvoy) {
      map.flyTo([selectedConvoy.lat, selectedConvoy.lon], 9, {
        animate: true,
        duration: 1.5
      });
    }
  }, [selectedConvoy, map]);

  return null;
};

// Create custom icons using Leaflet DivIcon styled with Tailwind
const createConvoyIcon = (status, callSign) => {
  let bgClass = 'bg-[#10b981]'; // Active green
  let borderClass = 'border-emerald-200';
  let pulseColor = 'rgba(16, 185, 129, 0.5)';
  
  if (status === 'WARNING') {
    bgClass = 'bg-[#f59e0b]'; // Warning amber
    borderClass = 'border-amber-200';
    pulseColor = 'rgba(245, 158, 11, 0.6)';
  } else if (status === 'REROUTED') {
    bgClass = 'bg-[#ef4444]'; // Rerouted red
    borderClass = 'border-red-200';
    pulseColor = 'rgba(239, 68, 68, 0.6)';
  }

  return L.divIcon({
    className: 'custom-convoy-marker-wrapper',
    html: `
      <div class="relative flex flex-col items-center select-none">
        <!-- Pulse ring -->
        <span class="absolute top-[6px] inline-flex h-7 w-7 rounded-full opacity-75 animate-ping" style="background-color: ${pulseColor}"></span>
        
        <!-- Icon circle -->
        <div class="w-10 h-10 rounded-full flex items-center justify-center border border-slate-700 shadow-xl ${bgClass} text-white transition-all duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
        </div>
        
        <!-- Label bubble -->
        <div class="absolute -top-6 bg-slate-900 border border-slate-700 text-[10px] text-slate-200 px-1.5 py-0.5 rounded-md font-semibold font-mono tracking-tight whitespace-nowrap shadow-md">
          ${callSign}
        </div>
      </div>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 25]
  });
};

const createHazardIcon = (type) => {
  let emoji = '⚠️';
  let border = 'border-red-500';
  let shadow = 'shadow-red-500/20';

  if (type === 'wildfires') {
    emoji = '🔥';
    border = 'border-orange-500';
    shadow = 'shadow-orange-500/30';
  } else if (type === 'severeStorms') {
    emoji = '⛈️';
    border = 'border-blue-500';
    shadow = 'shadow-blue-500/30';
  } else if (type === 'floods') {
    emoji = '🌊';
    border = 'border-cyan-500';
    shadow = 'shadow-cyan-500/30';
  } else if (type === 'volcanoes') {
    emoji = '🌋';
    border = 'border-rose-600';
    shadow = 'shadow-rose-600/30';
  }

  return L.divIcon({
    className: 'custom-hazard-marker-wrapper',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8 rounded-full border border-slate-800 bg-slate-950/90 text-sm shadow-lg ${shadow} ${border} animate-pulse">
        <span class="z-10">${emoji}</span>
        <!-- Inner pulsing element -->
        <span class="absolute inset-0 rounded-full w-full h-full border border-red-500 animate-ping opacity-25"></span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const MapCanvas = ({ selectedConvoy, onSelectConvoy }) => {
  const { convoys, incidents } = useLiveState();

  // Initial center coordinates (Center of California/US or global)
  // Let's default to Southern California where LA/Gorman fires occur, or average active coordinates.
  const defaultCenter = [35.5, -119.5];
  const defaultZoom = 6;

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        zoomControl={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Dynamic Map Controller for moving map camera */}
        <MapController selectedConvoy={selectedConvoy} />

        {/* Render Convoy Routes and Markers */}
        {convoys.map((convoy) => (
          <React.Fragment key={convoy.id}>
            {/* Draw active line to destination */}
            <Polyline
              positions={[
                [convoy.lat, convoy.lon],
                [convoy.dest_lat, convoy.dest_lon]
              ]}
              pathOptions={{
                color: convoy.status === 'REROUTED' ? '#ef4444' : convoy.status === 'WARNING' ? '#f59e0b' : '#3b82f6',
                weight: convoy.status === 'REROUTED' ? 2 : 2.5,
                dashArray: convoy.status === 'REROUTED' ? '6, 6' : convoy.status === 'WARNING' ? '4, 4' : 'none',
                opacity: convoy.status === 'REROUTED' ? 0.5 : 0.8
              }}
            />

            {/* Destination Marker */}
            <Circle
              center={[convoy.dest_lat, convoy.dest_lon]}
              radius={2000} // 2km target circle
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 1
              }}
            >
              <Popup>
                <div className="text-slate-900 font-sans p-1">
                  <h4 className="font-bold text-xs">Destination Target</h4>
                  <p className="text-[10px] text-slate-500 font-mono">Lat: {convoy.dest_lat}, Lon: {convoy.dest_lon}</p>
                </div>
              </Popup>
            </Circle>

            {/* Convoy Pulse Marker */}
            <Marker
              position={[convoy.lat, convoy.lon]}
              icon={createConvoyIcon(convoy.status, convoy.call_sign)}
              eventHandlers={{
                click: () => onSelectConvoy(convoy)
              }}
            >
              <Popup>
                <div className="text-slate-950 font-sans p-2 max-w-[200px]">
                  <h3 className="font-bold text-sm text-slate-800 font-mono">{convoy.call_sign.toUpperCase()}</h3>
                  <div className="mt-1 space-y-1 text-xs">
                    <p><span className="font-semibold text-slate-600">Cargo:</span> {convoy.cargo_type}</p>
                    <p><span className="font-semibold text-slate-600">Status:</span> 
                      <span className={`ml-1 font-bold ${
                        convoy.status === 'REROUTED' ? 'text-red-600' : convoy.status === 'WARNING' ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {convoy.status}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">Location: {convoy.lat.toFixed(4)}, {convoy.lon.toFixed(4)}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* Render Hazards Circles and Icons */}
        {incidents.map((hazard) => (
          <React.Fragment key={hazard.id}>
            {/* Danger Radius Circle */}
            <Circle
              center={[hazard.lat, hazard.lon]}
              radius={hazard.radius_km * 1000} // Leaflet uses meters
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.12,
                weight: 1.5,
                dashArray: '5, 5'
              }}
            />

            {/* Pulsing indicator at epicenter */}
            <Marker
              position={[hazard.lat, hazard.lon]}
              icon={createHazardIcon(hazard.hazard_type)}
            >
              <Popup>
                <div className="text-slate-950 font-sans p-2 max-w-[220px]">
                  <h3 className="font-bold text-sm text-red-600">{hazard.title}</h3>
                  <div className="mt-1 space-y-1 text-xs">
                    <p><span className="font-semibold text-slate-600">Danger Radius:</span> {hazard.radius_km} km</p>
                    <p><span className="font-semibold text-slate-600">Type:</span> <span className="font-mono text-slate-700">{hazard.hazard_type}</span></p>
                    <p className="text-[10px] text-slate-500 font-mono">Epicenter: {hazard.lat.toFixed(4)}, {hazard.lon.toFixed(4)}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>

      {/* Decorative Grid Overlay for Tactical Command Center aesthetic */}
      <div className="absolute inset-0 pointer-events-none border border-slate-700/20 rounded-2xl" 
           style={{
             backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 0)',
             backgroundSize: '24px 24px'
           }}
      />
    </div>
  );
};

export default MapCanvas;
