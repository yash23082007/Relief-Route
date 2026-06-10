import React, { useState } from 'react';
import { useLiveState } from '../context/LiveStateContext';
import { MapContainer, TileLayer, Circle, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { ShieldAlert, RefreshCw, MapPin, Flame, CloudLightning, Activity, AlertTriangle } from 'lucide-react';

const CATEGORIES = [
  { name: 'ALL', label: 'All Hazards', icon: ShieldAlert },
  { name: 'storm', label: 'Severe Storms', icon: CloudLightning },
  { name: 'wildfire', label: 'Wildfires', icon: Flame },
  { name: 'earthquake', label: 'Earthquakes', icon: Activity },
  { name: 'volcano', label: 'Volcanoes', icon: AlertTriangle },
];

const CATEGORY_COLORS = {
  storm: '#3b82f6',      // Blue
  wildfire: '#f97316',   // Orange
  earthquake: '#d97706', // Amber
  volcano: '#ef4444',    // Red
  other: '#64748b'
};

const CATEGORY_ICONS = {
  storm: '⛈️',
  wildfire: '🔥',
  earthquake: '🫨',
  volcano: '🌋',
  other: '⚠️'
};

// Great-circle distance calculation helper
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function HazardsPage() {
  const { incidents, convoys, runNasaIngestion, refreshTelemetry } = useLiveState();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await runNasaIngestion();
      if (result.success !== false) {
        alert('NASA EONET risk sync completed. Active anomalies loaded.');
        await refreshTelemetry();
      } else {
        alert('Sync error: ' + (result.error || 'Unknown response.'));
      }
    } catch (err) {
      alert('Risk sync network timeout.');
    } finally {
      setSyncing(false);
    }
  };

  const getHazardType = (type) => {
    const t = (type || 'other').toLowerCase();
    if (t.includes('storm') || t.includes('weather') || t.includes('cyclone') || t.includes('typhoon')) return 'storm';
    if (t.includes('wildfire') || t.includes('fire') || t.includes('bushfire')) return 'wildfire';
    if (t.includes('earthquake') || t.includes('quake')) return 'earthquake';
    if (t.includes('volcano') || t.includes('eruption')) return 'volcano';
    return 'other';
  };

  const filteredHazards = incidents.filter(h => {
    if (selectedCategory === 'ALL') return true;
    return getHazardType(h.hazard_type) === selectedCategory;
  });

  const getAffectedVesselsCount = (hazard) => {
    let affected = 0;
    convoys.forEach(c => {
      const dist = haversineDistance(c.lat, c.lon, hazard.lat, hazard.lon);
      if (dist <= hazard.radius_km) {
        affected++;
      }
    });
    return affected;
  };

  const createHazardMarkerIcon = (type) => {
    const cat = getHazardType(type);
    const emoji = CATEGORY_ICONS[cat] || '⚠️';
    const border = cat === 'storm' ? 'border-blue-500' : cat === 'wildfire' ? 'border-orange-500' : cat === 'earthquake' ? 'border-amber-600' : cat === 'volcano' ? 'border-red-500' : 'border-slate-500';
    return L.divIcon({
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      html: `<div class="w-6 h-6 rounded-full bg-slate-950/95 border ${border} flex items-center justify-center text-[10px] animate-pulse shadow-md shadow-red-500/10">${emoji}</div>`
    });
  };

  return (
    <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, letterSpacing: 'var(--tracking-tight)' }}>
            HAZARD INTELLIGENCE CENTER
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0 0', fontFamily: 'var(--font-mono)' }}>
            Real-time planetary safety intelligence synced directly with NASA EONET and USGS feeds
          </p>
        </div>
        
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 18px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '12px',
            cursor: syncing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.15s',
          }}
          className="hover:bg-slate-800"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'SYNCING NASA FEEDS...' : 'REFRESH FROM NASA EONET'}
        </button>
      </div>

      {/* Mini Map Canvas showing all risks */}
      <div style={{
        height: '35%',
        minHeight: '220px',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border-default)',
        background: 'var(--bg-base)',
        position: 'relative',
        flexShrink: 0,
      }}>
        <MapContainer
          center={[20.0, 10.0]} zoom={2}
          style={{ height: '100%', width: '100%', background: '#030712' }}
          zoomControl={true}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {incidents.map(hazard => (
            <React.Fragment key={hazard.id}>
              <Circle
                center={[hazard.lat, hazard.lon]}
                radius={hazard.radius_km * 1000}
                pathOptions={{
                  color: CATEGORY_COLORS[getHazardType(hazard.hazard_type)] || CATEGORY_COLORS.other,
                  fillColor: CATEGORY_COLORS[getHazardType(hazard.hazard_type)] || CATEGORY_COLORS.other,
                  fillOpacity: 0.05,
                  weight: 1.2,
                  dashArray: '5 5'
                }}
              >
                <Tooltip sticky>
                  <span className="font-mono font-bold text-red-400">{hazard.title}</span>
                </Tooltip>
              </Circle>
              <Marker
                position={[hazard.lat, hazard.lon]}
                icon={createHazardMarkerIcon(hazard.hazard_type)}
              />
            </React.Fragment>
          ))}
        </MapContainer>
        <div style={{
          position: 'absolute', top: '12px', left: '12px',
          background: 'var(--bg-overlay)', backdropFilter: 'blur(6px)',
          border: '1px solid var(--border-strong)', padding: '6px 12px',
          borderRadius: 'var(--radius-sm)', zIndex: 400, pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 700 }}>
            GLOBAL ANOMALY SPATIAL RADAR
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        
        {/* Left column: Categories selector */}
        <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 'var(--tracking-widest)', marginBottom: '8px' }}>
            HAZARD CATEGORIES
          </span>
          {CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.name;
            const count = cat.name === 'ALL' ? incidents.length : incidents.filter(h => getHazardType(h.hazard_type) === cat.name).length;

            return (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat.name)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                  border: `1px solid ${isSelected ? 'var(--border-strong)' : 'transparent'}`,
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
                className="hover:bg-slate-900"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={14} style={{ color: CATEGORY_COLORS[cat.name] || 'var(--text-secondary)' }} />
                  <span>{cat.label}</span>
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  background: isSelected ? 'var(--accent-blue-dim)' : 'var(--bg-surface)',
                  color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-full)',
                  padding: '2px 8px',
                  fontWeight: 700,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right column: Hazards list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
          {filteredHazards.length === 0 ? (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: '48px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
            }}>
              NO ACTIVE '{selectedCategory.toUpperCase()}' DISRUPTIONS DETECTED.
            </div>
          ) : (
            filteredHazards.map(hazard => {
              const cat = getHazardType(hazard.hazard_type);
              const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
              const emoji = CATEGORY_ICONS[cat] || CATEGORY_ICONS.other;
              const affected = getAffectedVesselsCount(hazard);

              return (
                <div
                  key={hazard.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  className="hover:border-slate-600"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '24px' }}>{emoji}</span>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px', fontFamily: 'var(--font-body)' }}>
                        {hazard.title}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '6px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                          <MapPin size={11} />
                          <span>{hazard.lat?.toFixed(4)}°N, {hazard.lon?.toFixed(4)}°E</span>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
                          Reported: {new Date(hazard.reported_at).toLocaleTimeString()} UTC
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: color, fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {hazard.radius_km} km
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: 'var(--tracking-wide)', fontWeight: 700 }}>
                        RISK PERIMETER
                      </span>
                    </div>

                    <div style={{
                      background: affected > 0 ? 'var(--status-critical-dim)' : 'var(--bg-elevated)',
                      color: affected > 0 ? 'var(--status-critical)' : 'var(--text-muted)',
                      border: `1px solid ${affected > 0 ? 'var(--status-critical)44' : 'var(--border-default)'}`,
                      borderRadius: 'var(--radius-full)',
                      padding: '4px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      boxShadow: affected > 0 ? 'var(--status-critical-glow)' : 'none'
                    }}>
                      ● {affected} AFFECTED
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
