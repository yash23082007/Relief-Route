import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

const LiveStateContext = createContext();

export const LiveStateProvider = ({ children }) => {
  const [convoys, setConvoys] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [latestAlert, setLatestAlert] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const { data: convoysData } = await supabase.from('convoys').select('*');
      if (convoysData) setConvoys(convoysData);

      const { data: incidentsData } = await supabase.from('incidents').select('*');
      if (incidentsData) setIncidents(incidentsData);
      
      const { data: logsData } = await supabase.from('mission_logs').select('*');
      if (logsData) {
        // Sort by created_at descending (newest first)
        const sorted = [...logsData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setLogs(sorted);
      }
    } catch (err) {
      console.error("Error fetching initial telemetry:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to convoys real-time changes
    const convoysChannel = supabase
      .channel('realtime-convoys')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'convoys' }, (payload) => {
        console.log('📬 Convoys Database Update Received:', payload);
        
        if (payload.event === 'INSERT') {
          setConvoys((prev) => [...prev, payload.new]);
        } else if (payload.event === 'UPDATE') {
          setConvoys((prev) =>
            prev.map((c) => (c.id === payload.new.id ? payload.new : c))
          );
          // If status transitioned to REROUTED, fire the AI warning modal!
          if (payload.new.status === 'REROUTED' && payload.new.ai_directive) {
            setLatestAlert({
              convoy: payload.new,
              ai_directive: payload.new.ai_directive
            });
          }
        } else if (payload.event === 'DELETE') {
          setConvoys((prev) => prev.filter((c) => c.id !== payload.old.id));
        }
      })
      .subscribe();

    // Subscribe to incidents real-time changes
    const incidentsChannel = supabase
      .channel('realtime-incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, (payload) => {
        console.log('📬 Incidents Database Update Received:', payload);
        
        if (payload.event === 'INSERT') {
          setIncidents((prev) => {
            if (prev.some(i => i.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        } else if (payload.event === 'UPDATE') {
          setIncidents((prev) =>
            prev.map((i) => (i.id === payload.new.id ? payload.new : i))
          );
        } else if (payload.event === 'DELETE') {
          setIncidents((prev) => prev.filter((i) => i.id !== payload.old.id));
        }
      })
      .subscribe();

    // Subscribe to mission_logs changes
    const logsChannel = supabase
      .channel('realtime-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mission_logs' }, (payload) => {
        console.log('📬 Logs Database Update Received:', payload);
        setLogs((prev) => {
          if (prev.some(l => l.id === payload.new.id)) return prev;
          return [payload.new, ...prev].slice(0, 50); // limit to 50 logs in history
        });
      })
      .subscribe();

    return () => {
      convoysChannel.unsubscribe();
      incidentsChannel.unsubscribe();
      logsChannel.unsubscribe();
    };
  }, []);

  // Helper actions to trigger backend endpoints
  const moveConvoy = async (id, lat, lon) => {
    // Optimistic UI updates are handled automatically when DB triggers websocket broadcast
    await supabase.from('convoys').update({ lat, lon }).eq('id', id);
  };

  const triggerManualIncident = async (incident) => {
    await supabase.from('incidents').insert([incident]);
  };

  const clearSimulation = async () => {
    try {
      await fetch('http://localhost:5000/api/hazards/clear', { method: 'POST' });
      await fetch('http://localhost:5000/api/mission_logs/clear', { method: 'POST' });
      setIncidents([]);
      setLogs([]);
      // Reload convoys since backend resets their status and AI directives
      const { data: convoysData } = await supabase.from('convoys').select('*');
      if (convoysData) setConvoys(convoysData);
      setLatestAlert(null);
    } catch (err) {
      console.error("Error clearing simulation:", err);
    }
  };

  const resetConvoys = async () => {
    try {
      await fetch('http://localhost:5000/api/convoys/reset', { method: 'POST' });
      // Reload convoys
      const { data: convoysData } = await supabase.from('convoys').select('*');
      if (convoysData) setConvoys(convoysData);
      setLatestAlert(null);
    } catch (err) {
      console.error("Error resetting convoys:", err);
    }
  };

  const runNasaIngestion = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/hazards/ingest', { method: 'POST' });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Error running ingestion:", err);
      return { success: false, error: err.message };
    }
  };

  const value = {
    convoys,
    incidents,
    logs,
    latestAlert,
    setLatestAlert,
    moveConvoy,
    triggerManualIncident,
    clearSimulation,
    resetConvoys,
    runNasaIngestion,
    isConnecting,
    refreshTelemetry: fetchData
  };

  return <LiveStateContext.Provider value={value}>{children}</LiveStateContext.Provider>;
};

export const useLiveState = () => {
  const context = useContext(LiveStateContext);
  if (!context) {
    throw new Error('useLiveState must be used within a LiveStateProvider');
  }
  return context;
};
