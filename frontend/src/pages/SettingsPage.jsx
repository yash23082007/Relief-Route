import React, { useState, useEffect } from 'react';
import { Sliders, Save, RefreshCw, HardDrive, Compass } from 'lucide-react';

const DEFAULT_SETTINGS = {
  detection_interval_sec: 30,
  pre_warning_minutes: 15,
  eonet_poll_minutes: 5,
  weather_poll_minutes: 15,
  gemini_model: 'gemini-1.5-flash',
  ai_enabled: true,
  show_hazard_radius: true,
  convoy_trail: false,
  default_zoom: 3
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('reliefroute_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  const handleChange = (key, val) => {
    setSettings(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setAlertMsg('');
    
    setTimeout(() => {
      localStorage.setItem('reliefroute_settings', JSON.stringify(settings));
      setSaving(false);
      setAlertMsg('OPERATIONAL CONFIGURATION COMMITTED TO STACK SUCCESSFULLY.');
      // Automatically trigger a refresh event
      window.dispatchEvent(new Event('reliefroute_settings_changed'));
    }, 800);
  };

  const handleReset = () => {
    if (window.confirm('Reset all parameters to baseline emergency specifications?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem('reliefroute_settings', JSON.stringify(DEFAULT_SETTINGS));
      setAlertMsg('PARAMETERS SYSTEM RESTORED TO DEFAULT SPECIFICATIONS.');
      window.dispatchEvent(new Event('reliefroute_settings_changed'));
    }
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, letterSpacing: 'var(--tracking-tight)' }}>
            SETTINGS & SYSTEM CONFIGURATION
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0 0', fontFamily: 'var(--font-mono)' }}>
            Adjust risk indexes, API polling loops, Gemini AI engines, and localized operator screens
          </p>
        </div>
      </div>

      {alertMsg && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--status-safe-dim)',
          border: '1px solid var(--status-safe)33',
          color: 'var(--status-safe)',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          marginBottom: '24px',
          fontWeight: 700
        }}>
          ● {alertMsg}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
        
        {/* SECTION 1: Collision Detection */}
        <div style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>1. RADAR & COLLISION DETECTION</h3>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>DETECTION SCAN LOOP INTERVAL (SECONDS)</label>
              <input
                type="number"
                value={settings.detection_interval_sec}
                onChange={e => handleChange('detection_interval_sec', parseInt(e.target.value))}
                style={inputStyle}
                min="5"
              />
              <span style={descStyle}>Controls telemetry calculation frequencies for lanes and perimeters.</span>
            </div>
            <div>
              <label style={labelStyle}>ETA PRE-WARNING ALERT THRESHOLD (MINUTES)</label>
              <input
                type="number"
                value={settings.pre_warning_minutes}
                onChange={e => handleChange('pre_warning_minutes', parseInt(e.target.value))}
                style={inputStyle}
                min="1"
              />
              <span style={descStyle}>Safety buffer warning before vessels enter hazardous zone vectors.</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Data Ingestion */}
        <div style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>2. TELEMETRY DATA INGESTION</h3>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>NASA EONET POLL FREQUENCY (MINUTES)</label>
              <input
                type="number"
                value={settings.eonet_poll_minutes}
                onChange={e => handleChange('eonet_poll_minutes', parseInt(e.target.value))}
                style={inputStyle}
                min="1"
              />
              <span style={descStyle}>Frequency of fetches for global earthquakes and volcanic eruptions.</span>
            </div>
            <div>
              <label style={labelStyle}>OPEN-METEO MARINE FORECAST LOOP (MINUTES)</label>
              <input
                type="number"
                value={settings.weather_poll_minutes}
                onChange={e => handleChange('weather_poll_minutes', parseInt(e.target.value))}
                style={inputStyle}
                min="1"
              />
              <span style={descStyle}>Ingestion intervals for waves and marine weather velocity penalties.</span>
            </div>
          </div>
        </div>

        {/* SECTION 3: AI Engine */}
        <div style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>3. COGNITIVE AI LOGISTICS ENGINE</h3>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>GEMINI LLM ENGINE CHOICE</label>
              <select
                value={settings.gemini_model}
                onChange={e => handleChange('gemini_model', e.target.value)}
                style={inputStyle}
              >
                <option value="gemini-1.5-flash">gemini-1.5-flash (Fast, Low Latency Briefs)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (High Cognition Routing)</option>
              </select>
              <span style={descStyle}>Model choice used to generate detour briefings and debiased ETA risk.</span>
            </div>
            <div>
              <label style={labelStyle}>AI DECISION-SUPPORT CO-PILOT</label>
              <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
                <input
                  type="checkbox"
                  id="ai_enabled"
                  checked={settings.ai_enabled}
                  onChange={e => handleChange('ai_enabled', e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    margin: 0,
                    cursor: 'pointer',
                    accentColor: 'var(--accent-blue)'
                  }}
                />
                <label htmlFor="ai_enabled" style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                  {settings.ai_enabled ? 'AI CO-PILOT ACTIVE' : 'AI CO-PILOT OFFLINE'}
                </label>
              </div>
              <span style={descStyle}>When checked, automatic detour recommendations are issued on risks.</span>
            </div>
          </div>
        </div>

        {/* SECTION 4: Map Visual Options */}
        <div style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>4. TACTICAL DISPLAY CALIBRATION</h3>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>DEFAULT MAP CANVAS ZOOM LEVEL</label>
              <input
                type="number"
                value={settings.default_zoom}
                onChange={e => handleChange('default_zoom', parseInt(e.target.value))}
                style={inputStyle}
                min="1"
                max="18"
              />
              <span style={descStyle}>Baseline map magnification when starting navigation.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id="show_hazard_radius"
                  checked={settings.show_hazard_radius}
                  onChange={e => handleChange('show_hazard_radius', e.target.checked)}
                  style={checkboxStyle}
                />
                <label htmlFor="show_hazard_radius" style={checkboxLabelStyle}>RENDER ANOMALY DANGER RADII</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id="convoy_trail"
                  checked={settings.convoy_trail}
                  onChange={e => handleChange('convoy_trail', e.target.checked)}
                  style={checkboxStyle}
                />
                <label htmlFor="convoy_trail" style={checkboxLabelStyle}>TRACK VESSEL HISTORICAL BREADCRUMBS</label>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '20px',
          marginTop: '12px'
        }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: 'var(--accent-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px 24px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'var(--accent-blue-glow)',
            }}
          >
            <Save size={14} />
            {saving ? 'COMMITTING PARAMS...' : 'COMMIT SPECIFICATIONS'}
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 24px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <RefreshCw size={14} />
            RESET SPECS
          </button>
        </div>

      </form>

    </div>
  );
}

const sectionStyle = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-lg)',
  padding: '20px',
  boxSizing: 'border-box'
};

const sectionHeaderStyle = {
  margin: '0 0 16px 0',
  fontSize: '13px',
  fontFamily: 'var(--font-display)',
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border-subtle)',
  paddingBottom: '8px',
  letterSpacing: 'var(--tracking-wide)',
  fontWeight: 700
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '16px',
  // On desktop we want 2 cols
  '@media (min-width: 768px)': {
    gridTemplateColumns: '1fr 1fr'
  }
};

const labelStyle = {
  display: 'block',
  fontSize: '9px',
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-secondary)',
  letterSpacing: 'var(--tracking-wide)',
  marginBottom: '6px',
  fontWeight: 700
};

const inputStyle = {
  width: '100%',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 12px',
  color: 'var(--text-primary)',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
  boxSizing: 'border-box',
  height: '40px'
};

const descStyle = {
  display: 'block',
  fontSize: '10px',
  color: 'var(--text-muted)',
  marginTop: '6px',
  lineHeight: '1.3'
};

const checkboxStyle = {
  width: '18px',
  height: '18px',
  margin: 0,
  cursor: 'pointer',
  accentColor: 'var(--accent-blue)'
};

const checkboxLabelStyle = {
  marginLeft: '8px',
  fontSize: '10px',
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontWeight: 700
};
