import React, { useState } from 'react';
import { useLiveState } from '../context/LiveStateContext';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { supabase } from '../config/supabaseClient';
import { Search, Plus, Edit2, Trash2, Eye, X, Compass, Anchor } from 'lucide-react';

export default function FleetPage() {
  const { convoys, ports, refreshTelemetry } = useLiveState();
  const { user } = useAuth();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cargoFilter, setCargoFilter] = useState('ALL');

  // Modal control states
  const [activeModal, setActiveModal] = useState(null); // 'add', 'edit', 'view', null
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('CONTAINER');
  const [formLat, setFormLat] = useState('0.0');
  const [formLon, setFormLon] = useState('0.0');
  const [formDestPortId, setFormDestPortId] = useState('');
  const [formSpeed, setFormSpeed] = useState('15.0');
  const [formStatus, setFormStatus] = useState('SAILING');

  const isAdmin = user?.role === 'admin';

  // Filters
  const filtered = convoys.filter(c => {
    const matchSearch = c.call_sign.toLowerCase().includes(search.toLowerCase()) || 
                        c.cargo_type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchCargo = cargoFilter === 'ALL' || c.cargo_type === cargoFilter;
    return matchSearch && matchStatus && matchCargo;
  });

  const openAddModal = () => {
    setFormName('');
    setFormType('CONTAINER');
    setFormLat('0.0');
    setFormLon('0.0');
    setFormDestPortId(ports[0]?.id || '');
    setFormSpeed('15.0');
    setFormStatus('SAILING');
    setActiveModal('add');
  };

  const openEditModal = (v) => {
    setSelectedVessel(v);
    setFormName(v.call_sign);
    setFormType(v.cargo_type);
    setFormLat(v.lat.toString());
    setFormLon(v.lon.toString());
    // Find matching port ID by name
    const port = ports.find(p => p.name === v.destination_port);
    setFormDestPortId(port?.id || ports[0]?.id || '');
    setFormSpeed(v.speed_knots?.toString() || '15.0');
    setFormStatus(v.status);
    setActiveModal('edit');
  };

  const openViewModal = (v) => {
    setSelectedVessel(v);
    setActiveModal('view');
  };

  const handleAddVessel = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const record = {
        call_sign: formName,
        cargo_type: formType,
        lat: parseFloat(formLat),
        lon: parseFloat(formLon),
        destination_port_id: formDestPortId || null,
        speed_knots: parseFloat(formSpeed),
        status: formStatus
      };
      
      const { error } = await supabase.from('convoys').insert(record);
      if (error) throw error;
      
      await refreshTelemetry();
      setActiveModal(null);
    } catch (err) {
      alert('Error creating vessel: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditVessel = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const changes = {
        call_sign: formName,
        cargo_type: formType,
        lat: parseFloat(formLat),
        lon: parseFloat(formLon),
        destination_port_id: formDestPortId || null,
        speed_knots: parseFloat(formSpeed),
        status: formStatus
      };

      const { error } = await supabase.from('convoys').update(changes).eq('id', selectedVessel.id);
      if (error) throw error;
      
      await refreshTelemetry();
      setActiveModal(null);
    } catch (err) {
      alert('Error updating vessel: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVessel = async (v) => {
    if (!window.confirm(`Are you sure you want to remove vessel ${v.call_sign} from command tracking?`)) return;
    try {
      const { error } = await supabase.from('convoys').delete().eq('id', v.id);
      if (error) throw error;
      await refreshTelemetry();
    } catch (err) {
      alert('Error deleting vessel: ' + err.message);
    }
  };

  const uniqueCargoTypes = Array.from(new Set(convoys.map(c => c.cargo_type)));

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, letterSpacing: 'var(--tracking-tight)' }}>
            FLEET MANAGEMENT CONSOLE
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0 0', fontFamily: 'var(--font-mono)' }}>
            {convoys.length} live maritime transport units registered under active command
          </p>
        </div>
        
        {isAdmin && (
          <button
            onClick={openAddModal}
            style={{
              background: 'var(--accent-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px 18px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'var(--accent-blue-glow)',
            }}
          >
            <Plus size={14} /> ADD VESSEL
          </button>
        )}
      </div>

      {/* Query Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        marginBottom: '24px',
        alignItems: 'center',
      }} className="flex-col md:flex-row">
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search fleet by call sign or cargo..."
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

        {/* Status */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="ALL">All Statuses</option>
          <option value="SAILING">Sailing</option>
          <option value="ARRIVING">Arriving</option>
          <option value="REROUTED">Rerouted</option>
          <option value="MOORED">Moored</option>
        </select>

        {/* Cargo */}
        <select
          value={cargoFilter}
          onChange={e => setCargoFilter(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="ALL">All Cargo Types</option>
          {uniqueCargoTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Main Grid Table */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
              {['VESSEL / CALL SIGN', 'CARGO CATEGORY', 'TELEMETRY COORDINATES', 'DESTINATION PORT', 'SPEED', 'STATUS', 'ACTIONS'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: 'var(--tracking-wide)',
                  fontWeight: 700,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  NO FLEET CHANNELS DETECTED FOR SPECIFIED QUERY.
                </td>
              </tr>
            ) : (
              filtered.map((vessel, idx) => (
                <tr key={vessel.id} style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  transition: 'background 0.15s',
                }} className="hover:bg-slate-900/40">
                  
                  {/* Vessel / Name */}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ color: 'var(--accent-blue)' }}><Compass size={16} /></div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {vessel.call_sign}
                      </span>
                    </div>
                  </td>

                  {/* Cargo */}
                  <td style={tdStyle}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500 }}>
                      {vessel.cargo_type}
                    </span>
                  </td>

                  {/* Lat/Lon */}
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '11px' }}>
                      {vessel.lat?.toFixed(4)}°N, {vessel.lon?.toFixed(4)}°E
                    </span>
                  </td>

                  {/* Destination */}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}><Anchor size={12} /></span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600 }}>
                        {vessel.destination_port || '—'}
                      </span>
                    </div>
                  </td>

                  {/* Speed */}
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '12px' }}>
                      {vessel.speed_knots ? `${vessel.speed_knots.toFixed(1)} kts` : '—'}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td style={tdStyle}>
                    <StatusBadge status={vessel.status} />
                  </td>

                  {/* Action Buttons */}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        title="Inspect Telemetry"
                        onClick={() => openViewModal(vessel)}
                        style={actionIconBtnStyle('var(--text-secondary)')}
                      >
                        <Eye size={13} />
                      </button>
                      
                      {isAdmin ? (
                        <>
                          <button
                            title="Edit Parameters"
                            onClick={() => openEditModal(vessel)}
                            style={actionIconBtnStyle('var(--accent-blue)')}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            title="Decommission Vessel"
                            onClick={() => handleDeleteVessel(vessel)}
                            style={actionIconBtnStyle('var(--status-critical)')}
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>READ-ONLY</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CRUD MODALS (ADD / EDIT / VIEW) */}
      {activeModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-overlay)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 'var(--z-modal)',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '500px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'var(--bg-elevated)',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-default)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '14px',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: 'var(--tracking-wide)'
              }}>
                {activeModal === 'add' && 'REGISTER NEW VESSEL'}
                {activeModal === 'edit' && `EDIT PARAMETERS: ${selectedVessel?.call_sign}`}
                {activeModal === 'view' && `TELEMETRY METRICS: ${selectedVessel?.call_sign}`}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            {(activeModal === 'add' || activeModal === 'edit') ? (
              <form onSubmit={activeModal === 'add' ? handleAddVessel : handleEditVessel} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={modalLabelStyle}>CALL SIGN / VESSEL NAME</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="e.g. Ever Golden"
                      style={modalInputStyle}
                    />
                  </div>
                  <div style={{ width: '150px' }}>
                    <label style={modalLabelStyle}>CARGO TYPE</label>
                    <select
                      value={formType}
                      onChange={e => setFormType(e.target.value)}
                      style={modalInputStyle}
                    >
                      <option value="CONTAINER">Container</option>
                      <option value="TANKER">Tanker</option>
                      <option value="CARGO">Cargo</option>
                      <option value="LNG_CARRIER">LNG Carrier</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={modalLabelStyle}>LATITUDE</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formLat}
                      onChange={e => setFormLat(e.target.value)}
                      style={modalInputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={modalLabelStyle}>LONGITUDE</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formLon}
                      onChange={e => setFormLon(e.target.value)}
                      style={modalInputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={modalLabelStyle}>DESTINATION PORT</label>
                    <select
                      value={formDestPortId}
                      onChange={e => setFormDestPortId(e.target.value)}
                      style={modalInputStyle}
                    >
                      {ports.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ width: '120px' }}>
                    <label style={modalLabelStyle}>SPEED (KNOTS)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formSpeed}
                      onChange={e => setFormSpeed(e.target.value)}
                      style={modalInputStyle}
                    />
                  </div>
                  {activeModal === 'edit' && (
                    <div style={{ width: '120px' }}>
                      <label style={modalLabelStyle}>STATUS</label>
                      <select
                        value={formStatus}
                        onChange={e => setFormStatus(e.target.value)}
                        style={modalInputStyle}
                      >
                        <option value="SAILING">Sailing</option>
                        <option value="ARRIVING">Arriving</option>
                        <option value="REROUTED">Rerouted</option>
                        <option value="MOORED">Moored</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '16px'
                }}>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 16px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: 'var(--accent-blue)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 16px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {loading ? 'SAVING...' : 'COMMIT CHANGES'}
                  </button>
                </div>
              </form>
            ) : (
              // View modal
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <span style={modalLabelStyle}>CALL SIGN</span>
                    <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedVessel?.call_sign}
                    </span>
                  </div>
                  <div>
                    <span style={modalLabelStyle}>CARGO TYPE</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {selectedVessel?.cargo_type}
                    </span>
                  </div>
                  <div>
                    <span style={modalLabelStyle}>POSITION GPS</span>
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {selectedVessel?.lat?.toFixed(5)}°N, {selectedVessel?.lon?.toFixed(5)}°E
                    </span>
                  </div>
                  <div>
                    <span style={modalLabelStyle}>SPEED OVER GROUND</span>
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {selectedVessel?.speed_knots} Knots
                    </span>
                  </div>
                  <div>
                    <span style={modalLabelStyle}>DESTINATION PORT</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      Port of {selectedVessel?.destination_port || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span style={modalLabelStyle}>MONITOR STATUS</span>
                    <div style={{ marginTop: '2px' }}><StatusBadge status={selectedVessel?.status} /></div>
                  </div>
                </div>

                {selectedVessel?.ai_directive && (
                  <div style={{
                    marginTop: '8px',
                    background: 'var(--status-critical-dim)',
                    border: '1px solid var(--status-critical)33',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px'
                  }}>
                    <span style={{ ...modalLabelStyle, color: 'var(--status-critical)' }}>ACTIVE AI RISK DETOUR ADVICE</span>
                    <p style={{
                      margin: '4px 0 0 0',
                      fontSize: '12px',
                      fontWeight: 650,
                      color: 'var(--text-primary)'
                    }}>
                      {selectedVessel.ai_directive.recommended_action || selectedVessel.ai_directive.recommended_detour}
                    </p>
                    <p style={{
                      margin: '6px 0 0 0',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.4'
                    }}>
                      {selectedVessel.ai_directive.mitigation_brief || selectedVessel.ai_directive.tactical_summary}
                    </p>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '16px'
                }}>
                  <button
                    onClick={() => setActiveModal(null)}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 20px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    CLOSE BRIEFING
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Inline CSS helpers
const tdStyle = {
  padding: '12px 16px',
  verticalAlign: 'middle',
  borderBottom: '1px solid var(--border-subtle)'
};

const filterSelectStyle = {
  background: 'var(--bg-base)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 14px',
  color: 'var(--text-primary)',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
  cursor: 'pointer',
  minWidth: '150px'
};

const actionIconBtnStyle = (color) => ({
  background: 'none',
  border: `1px solid ${color}33`,
  color: color,
  borderRadius: 'var(--radius-md)',
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  boxSizing: 'border-box'
});

const modalLabelStyle = {
  display: 'block',
  fontSize: '9px',
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-secondary)',
  letterSpacing: 'var(--tracking-wide)',
  marginBottom: '6px',
  fontWeight: 700
};

const modalInputStyle = {
  width: '100%',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 12px',
  color: 'var(--text-primary)',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
  boxSizing: 'border-box'
};
