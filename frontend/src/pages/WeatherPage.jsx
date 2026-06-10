import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import { Search, CloudSun, Wind, Droplets, Thermometer, MapPin, Compass, Navigation } from 'lucide-react';

const CHOKE_POINTS = [
  { name: 'Strait of Malacca', lat: 1.3, lon: 103.8, desc: 'East-West Gateway' },
  { name: 'Suez Canal Approach', lat: 31.3, lon: 32.3, desc: 'Mediterranean Entrance' },
  { name: 'Panama Canal Locks', lat: 8.9, lon: -79.5, desc: 'Trans-American Gateway' },
  { name: 'Strait of Gibraltar', lat: 36.1, lon: -5.3, desc: 'Atlantic-Med Passage' },
  { name: 'Cape of Good Hope', lat: -33.9, lon: 18.4, desc: 'Southern Africa Detour' },
  { name: 'English Channel', lat: 50.5, lon: -1.0, desc: 'North Sea Corridor' },
];

const getWmoDescription = (code) => {
  if (code === 0) return { label: 'CLEAR SKY', emoji: '☀️', severity: 'SAFE', color: 'var(--status-safe)' };
  if (code >= 1 && code <= 3) return { label: 'PARTLY CLOUDY', emoji: '⛅', severity: 'SAFE', color: 'var(--status-safe)' };
  if (code >= 45 && code <= 48) return { label: 'FOGGY CONDITIONS', emoji: '🌫️', severity: 'WARN', color: 'var(--status-warn)' };
  if (code >= 51 && code <= 55) return { label: 'LIGHT DRIZZLE', emoji: '🌧️', severity: 'SAFE', color: 'var(--status-safe)' };
  if (code >= 61 && code <= 65) return { label: 'CONTINUOUS RAIN', emoji: '🌧️', severity: 'WARN', color: 'var(--status-warn)' };
  if (code >= 71 && code <= 77) return { label: 'SNOWFALL INTRUSION', emoji: '❄️', severity: 'WARN', color: 'var(--status-warn)' };
  if (code >= 80 && code <= 82) return { label: 'HEAVY RAIN SHOWER', emoji: '⛈️', severity: 'CRITICAL', color: 'var(--status-critical)' };
  if (code >= 95 && code <= 99) return { label: 'SEVERE THUNDERSTORM', emoji: '🌩️', severity: 'CRITICAL', color: 'var(--status-critical)' };
  return { label: 'UNRESOLVED DATA', emoji: '⚠️', severity: 'WARN', color: 'var(--status-warn)' };
};

function MapCenteringController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 7);
    }
  }, [center, map]);
  return null;
}

export default function WeatherPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  
  // Choke point weather cards state
  const [chokeWeather, setChokeWeather] = useState({});

  // Initialize with Singapore
  useEffect(() => {
    handleSearch(null, 'Singapore');
    fetchChokePointsWeather();
  }, []);

  const fetchChokePointsWeather = async () => {
    const weatherCache = {};
    for (const cp of CHOKE_POINTS) {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${cp.lat}&longitude=${cp.lon}&current=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=kn`);
        const data = await res.json();
        if (data.current) {
          weatherCache[cp.name] = {
            temp: data.current.temperature_2m,
            wind: data.current.wind_speed_10m,
            code: data.current.weather_code
          };
        }
      } catch (e) {
        console.error('Failed to fetch cp weather', e);
      }
    }
    setChokeWeather(weatherCache);
  };

  const handleSearch = async (e, customQuery) => {
    if (e) e.preventDefault();
    const searchTerm = customQuery || query;
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      // Step 1: Geocoding search
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        setError('METEOROLOGICAL GRID REFERENCE NOT FOUND.');
        setLoading(false);
        return;
      }

      const location = geoData.results[0];
      const { latitude, longitude, name, country, admin1 } = location;

      // Step 2: Fetch weather for coordinates
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,weather_code&wind_speed_unit=kn&timezone=auto`);
      const weatherVal = await weatherRes.json();

      if (!weatherVal.current) {
        setError('FAILED TO INGEST REAL-TIME WEATHER FOR PERIMETER.');
        setLoading(false);
        return;
      }

      setWeatherData({
        name,
        country,
        state: admin1 || '',
        lat: latitude,
        lon: longitude,
        temp: weatherVal.current.temperature_2m,
        feelsLike: weatherVal.current.apparent_temperature,
        humidity: weatherVal.current.relative_humidity_2m,
        precip: weatherVal.current.precipitation,
        windSpeed: weatherVal.current.wind_speed_10m,
        windDir: weatherVal.current.wind_direction_10m,
        code: weatherVal.current.weather_code,
        timestamp: new Date().toISOString()
      });
      setQuery('');
    } catch (err) {
      setError('WEATHER NETWORK CONFLICT. CHECK GRIDS.');
    } finally {
      setLoading(false);
    }
  };

  const currentWmo = weatherData ? getWmoDescription(weatherData.code) : null;

  return (
    <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, letterSpacing: 'var(--tracking-tight)' }}>
            METEOROLOGICAL WEATHE RADAR
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0 0', fontFamily: 'var(--font-mono)' }}>
            Real-time planetary wind, swell, and climatic overlays mapped to shipping lane choke points
          </p>
        </div>
      </div>

      {/* Query input panel */}
      <form onSubmit={handleSearch} style={{
        display: 'flex',
        gap: '12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        flexShrink: 0
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Query meteorological station (e.g. Singapore, Shanghai, Tokyo, Gibraltar, Suez)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
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
        <button
          type="submit"
          disabled={loading}
          style={{
            background: 'var(--accent-blue)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '10px 24px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: 'var(--accent-blue-glow)',
          }}
        >
          {loading ? 'INGESTING...' : 'INGEST STATION DATA'}
        </button>
      </form>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--status-critical-dim)',
          border: '1px solid var(--status-critical)44',
          color: 'var(--status-critical)',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          flexShrink: 0
        }}>
          ● {error}
        </div>
      )}

      {/* Main layout: Details + Choke points */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }} className="flex-col lg:flex-row">
        
        {/* Left Column: Queried Station details */}
        {weatherData && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            
            {/* Location Title card */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderLeft: `3px solid ${currentWmo?.color}`,
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  TACTICAL METEOROLOGICAL STATION
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '4px 0 0 0', color: 'var(--text-primary)' }}>
                  {weatherData.name.toUpperCase()}, {weatherData.country.toUpperCase()}
                </h2>
                {weatherData.state && (
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Admin Perimeter: {weatherData.state}
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  color: currentWmo?.color,
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  border: `1px solid ${currentWmo?.color}44`,
                  background: `${currentWmo?.color}10`,
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  {currentWmo?.emoji} {currentWmo?.label}
                </span>
                <span style={{ display: 'block', fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '6px' }}>
                  REFRESHED: {new Date(weatherData.timestamp).toLocaleTimeString()} UTC
                </span>
              </div>
            </div>

            {/* Radar Map & Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', minHeight: '300px' }} className="flex-col md:flex-row">
              
              {/* Micro Radar map */}
              <div style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)',
                overflow: 'hidden',
                background: 'var(--bg-base)',
                position: 'relative'
              }}>
                <MapContainer
                  center={[weatherData.lat, weatherData.lon]} zoom={7}
                  style={{ height: '100%', width: '100%', background: '#030712' }}
                  zoomControl={false}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <MapCenteringController center={[weatherData.lat, weatherData.lon]} />
                  <Circle
                    center={[weatherData.lat, weatherData.lon]}
                    radius={50000}
                    pathOptions={{
                      color: currentWmo?.color,
                      fillColor: currentWmo?.color,
                      fillOpacity: 0.08,
                      weight: 1.5,
                      dashArray: '6 6'
                    }}
                  />
                </MapContainer>
                <div style={{
                  position: 'absolute', top: '12px', left: '12px',
                  background: 'var(--bg-overlay)', backdropFilter: 'blur(6px)',
                  border: '1px solid var(--border-strong)', padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)', zIndex: 400, pointerEvents: 'none'
                }}>
                  <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={10} /> POS: {weatherData.lat.toFixed(3)}°N, {weatherData.lon.toFixed(3)}°E
                  </span>
                </div>
              </div>

              {/* Ingested metrics list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Temp */}
                <div style={metricBlockStyle}>
                  <Thermometer size={18} style={{ color: 'var(--status-warn)' }} />
                  <div>
                    <span style={metricLabelStyle}>AMBIENT TEMPERATURE</span>
                    <span style={metricValueStyle}>{weatherData.temp}°C <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}> (Feels like {weatherData.feelsLike}°C)</span></span>
                  </div>
                </div>

                {/* Wind */}
                <div style={metricBlockStyle}>
                  <Wind size={18} style={{ color: 'var(--accent-blue)' }} />
                  <div>
                    <span style={metricLabelStyle}>WIND VELOCITY & COMPASS</span>
                    <span style={metricValueStyle}>{weatherData.windSpeed} knots <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}> heading {weatherData.windDir}° ({getCompassHeading(weatherData.windDir)})</span></span>
                  </div>
                </div>

                {/* Humidity */}
                <div style={metricBlockStyle}>
                  <Droplets size={18} style={{ color: '#38bdf8' }} />
                  <div>
                    <span style={metricLabelStyle}>RELATIVE DEW POINT & HUMIDITY</span>
                    <span style={metricValueStyle}>{weatherData.humidity}%</span>
                  </div>
                </div>

                {/* Precipitation */}
                <div style={metricBlockStyle}>
                  <Navigation size={18} style={{ color: 'var(--status-critical)', transform: 'rotate(45deg)' }} />
                  <div>
                    <span style={metricLabelStyle}>PRECIPITATION PENALTY RATE</span>
                    <span style={metricValueStyle}>{weatherData.precip} mm/hr</span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* Right Column: Global Choke Points list */}
        <div style={{
          width: '320px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flexShrink: 0,
          overflowY: 'auto'
        }} className="w-full lg:w-[320px]">
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 'var(--tracking-widest)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
            GLOBAL CHOKE POINTS MONITOR
          </span>

          {CHOKE_POINTS.map(cp => {
            const data = chokeWeather[cp.name];
            const wmo = data ? getWmoDescription(data.code) : null;

            return (
              <div
                key={cp.name}
                onClick={() => handleSearch(null, cp.name)}
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'border-color 0.15s'
                }}
                className="hover:border-slate-500"
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {cp.name}
                  </h4>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {cp.desc}
                  </span>
                </div>

                {data ? (
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {data.temp}°C
                    </span>
                    <span style={{
                      fontSize: '9px',
                      color: wmo?.color,
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      <span>{wmo?.emoji}</span> {data.wind} kts
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>LOADING...</span>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}

const getCompassHeading = (deg) => {
  if (deg >= 337.5 || deg < 22.5) return 'N';
  if (deg >= 22.5 && deg < 67.5) return 'NE';
  if (deg >= 67.5 && deg < 112.5) return 'E';
  if (deg >= 112.5 && deg < 157.5) return 'SE';
  if (deg >= 157.5 && deg < 202.5) return 'S';
  if (deg >= 202.5 && deg < 247.5) return 'SW';
  if (deg >= 247.5 && deg < 292.5) return 'W';
  if (deg >= 292.5 && deg < 337.5) return 'NW';
  return '';
};

const metricBlockStyle = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '14px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  flex: 1,
  boxSizing: 'border-box'
};

const metricLabelStyle = {
  display: 'block',
  fontSize: '9px',
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-muted)',
  letterSpacing: 'var(--tracking-wide)',
  fontWeight: 700
};

const metricValueStyle = {
  display: 'block',
  fontSize: '15px',
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-primary)',
  marginTop: '2px'
};
