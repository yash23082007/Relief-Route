import { createClient as createRealSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if valid credentials are provided
const isRealSupabase = supabaseUrl && 
                       supabaseKey && 
                       supabaseUrl !== 'YOUR_SUPABASE_URL' && 
                       supabaseKey !== 'YOUR_SUPABASE_ANON_KEY';

let supabase;

if (isRealSupabase) {
  console.log('📡 ReliefRoute Client: Initializing official Supabase SDK client.');
  supabase = createRealSupabaseClient(supabaseUrl, supabaseKey);
} else {
  console.log('💻 ReliefRoute Client: Running in ZERO-CONFIG Local FastAPI + SSE Adapter Mode.');
  supabase = createMockSupabaseClient();
}

export { supabase, isRealSupabase };

function createMockSupabaseClient() {
  const BACKEND_URL = 'http://localhost:5000';

  return {
    auth: {
      signUp: async ({ email, password, options }) => {
        try {
          const role = options?.data?.role || 'operator';
          const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || data.error || 'Signup failed');
          
          const sessionPayload = {
            user: data.user,
            session: data.session
          };
          localStorage.setItem('reliefroute_session', JSON.stringify(sessionPayload));
          return { data: sessionPayload, error: null };
        } catch (error) {
          return { data: null, error: { message: error.message } };
        }
      },
      signInWithPassword: async ({ email, password }) => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || data.error || 'Login failed');
          
          const sessionPayload = {
            user: data.user,
            session: data.session
          };
          localStorage.setItem('reliefroute_session', JSON.stringify(sessionPayload));
          return { data: sessionPayload, error: null };
        } catch (error) {
          return { data: null, error: { message: error.message } };
        }
      },
      signOut: async () => {
        localStorage.removeItem('reliefroute_session');
        return { error: null };
      },
      getSession: async () => {
        try {
          const session = localStorage.getItem('reliefroute_session');
          return { data: { session: session ? JSON.parse(session) : null }, error: null };
        } catch (error) {
          return { data: { session: null }, error: error };
        }
      },
      onAuthStateChange: (callback) => {
        const handleStorageChange = (e) => {
          if (e.key === 'reliefroute_session') {
            const sessionData = e.newValue ? JSON.parse(e.newValue) : null;
            callback(sessionData ? 'SIGNED_IN' : 'SIGNED_OUT', sessionData?.session || null);
          }
        };
        window.addEventListener('storage', handleStorageChange);
        return {
          data: {
            subscription: {
              unsubscribe: () => window.removeEventListener('storage', handleStorageChange)
            }
          }
        };
      }
    },
    
    from: (table) => {
      let endpointTable = table;
      if (table === 'convoys') {
        endpointTable = 'vessels';
      } else if (table === 'incidents' || table === 'hazards') {
        endpointTable = 'alerts';
      } else if (table === 'mission_logs') {
        endpointTable = 'alerts';
      } else if (table === 'shipping_lanes') {
        endpointTable = 'lanes';
      } else if (table === 'customs_buffers') {
        endpointTable = 'customs-buffers';
      }

      const baseUrl = `${BACKEND_URL}/api/${endpointTable}`;
      
      return {
        select: async () => {
          try {
            const res = await fetch(baseUrl);
            const data = await res.json();
            
            // Map FastAPI backend models to client structure
            if (table === 'convoys') {
              const mapped = data.map(v => ({
                id: v.id,
                call_sign: v.name,
                cargo_type: v.type,
                lat: v.latitude,
                lon: v.longitude,
                dest_lat: v.dest_lat || 0.0,
                dest_lon: v.dest_lon || 0.0,
                status: v.status,
                ai_directive: v.ai_mitigation_brief,
                updated_at: v.updated_at
              }));
              return { data: mapped, error: null };
            }
            
            if (table === 'incidents' || table === 'hazards') {
              // Filters out non-hazard alerts for map hazards overlays
              const hazardsOnly = data.filter(a => a.type === 'HAZARD' || a.type === 'WEATHER' || a.type === 'VOLCANO' || a.type === 'EARTHQUAKE' || a.type === 'WILDFIRE');
              const mapped = hazardsOnly.map(a => ({
                id: a.id,
                title: a.description,
                hazard_type: a.type.toLowerCase(),
                lat: a.latitude || 0.0,
                lon: a.longitude || 0.0,
                radius_km: 80.0,
                reported_at: a.reported_at
              }));
              return { data: mapped, error: null };
            }

            if (table === 'mission_logs') {
              const mapped = data.map(a => ({
                id: a.id,
                convoy_id: null,
                convoy_call_sign: a.type,
                event_type: a.type + '_ALERT',
                ai_summary: a.description,
                created_at: a.reported_at
              }));
              return { data: mapped, error: null };
            }

            return { data, error: null };
          } catch (error) {
            console.error(`Select error for table ${table}:`, error);
            return { data: [], error };
          }
        },
        insert: async (records) => {
          try {
            if (table === 'incidents' || table === 'hazards') {
              const record = Array.isArray(records) ? records[0] : records;
              const res = await fetch(`${BACKEND_URL}/api/simulate/hazard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: record.title || "Simulated Disruption",
                  hazard_type: record.hazard_type || "storm",
                  latitude: record.lat,
                  longitude: record.lon,
                  radius_km: record.radius_km || 80.0,
                  severity: 'HIGH'
                })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.detail || 'Failed to trigger hazard simulation');
              
              const clientHazard = {
                id: data.alert.id,
                title: data.alert.description,
                hazard_type: data.alert.type.toLowerCase(),
                lat: data.alert.latitude,
                lon: data.alert.longitude,
                radius_km: 80.0,
                reported_at: data.alert.reported_at
              };
              return { data: [clientHazard], error: null };
            }
            return { data: null, error: new Error("Insert not supported for this emulator table") };
          } catch (error) {
            return { data: null, error };
          }
        },
        update: (changes) => {
          return {
            eq: async (column, value) => {
              try {
                // If updating convoy status, check if manually triggering reroute
                if (table === 'convoys' && changes.status === 'REROUTED') {
                  const res = await fetch(`${BACKEND_URL}/api/vessels/${value}/reroute`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ custom_action: changes.ai_directive?.recommended_action || "" })
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.detail || 'Reroute failed');
                  return { data, error: null };
                }
                return { data: null, error: null };
              } catch (error) {
                return { data: null, error };
              }
            }
          };
        },
        upsert: async (records) => {
          return { data: null, error: null };
        }
      };
    },
    
    channel: (name) => {
      const callbacks = [];
      return {
        on: function(type, filter, callback) {
          callbacks.push({ type, filter, callback });
          return this;
        },
        subscribe: () => {
          let eventSource;
          let reconnectTimer;
          
          const connect = () => {
            console.log(`🔌 Supabase Emulator SSE connecting to ${BACKEND_URL}/api/stream...`);
            eventSource = new EventSource(`${BACKEND_URL}/api/stream`);
            
            eventSource.onopen = () => {
              console.log('✅ Supabase Emulator SSE connected.');
            };
            
            eventSource.onmessage = (event) => {
              try {
                const payload = JSON.parse(event.data);
                if (payload.ping || payload.event === 'connected') return;

                console.log('📬 SSE Update Received:', payload);
                const pathParts = payload.path.split('/');
                const type = pathParts[0]; 
                
                let eventName = 'UPDATE';
                let tableName = '';
                let newRecord = {};
                
                if (type === 'vessels') {
                  tableName = 'convoys';
                  const v = payload.data;
                  newRecord = {
                    id: v.id,
                    call_sign: v.name,
                    cargo_type: v.type,
                    lat: v.latitude,
                    lon: v.longitude,
                    dest_lat: v.dest_lat || 0.0,
                    dest_lon: v.dest_lon || 0.0,
                    status: v.status,
                    ai_directive: typeof v.ai_mitigation_brief === 'string' ? JSON.parse(v.ai_mitigation_brief) : v.ai_mitigation_brief,
                    updated_at: v.updated_at
                  };
                } else if (type === 'alerts') {
                  tableName = 'incidents';
                  const a = payload.data;
                  newRecord = {
                    id: a.id,
                    title: a.description,
                    hazard_type: a.type.toLowerCase(),
                    lat: a.latitude || 0.0,
                    lon: a.longitude || 0.0,
                    radius_km: 80.0,
                    reported_at: a.reported_at
                  };
                  
                  // Instantly broadcast log insertion to mission timeline
                  const logRecord = {
                    id: a.id,
                    convoy_id: null,
                    convoy_call_sign: a.type,
                    event_type: a.type + '_ALERT',
                    ai_summary: a.description,
                    created_at: a.reported_at
                  };
                  
                  for (const sub of callbacks) {
                    if (sub.filter?.table === 'mission_logs') {
                      sub.callback({
                        event: 'INSERT',
                        table: 'mission_logs',
                        new: logRecord
                      });
                    }
                  }
                } else {
                  return; // Skip lanes/ports updates in standard postgres emulation
                }
                
                // Dispatch updates to matching subscribers
                for (const sub of callbacks) {
                  const eventMatch = sub.type === '*' || sub.type === 'postgres_changes';
                  const tableMatch = sub.filter?.table === tableName;
                  
                  if (eventMatch && tableMatch) {
                    sub.callback({
                      event: eventName,
                      table: tableName,
                      new: newRecord
                    });
                  }
                }
              } catch (err) {
                console.error("Error parsing SSE data:", err);
              }
            };
            
            eventSource.onerror = (err) => {
              console.error('SSE connection interrupted, reconnecting in 3s...', err);
              eventSource.close();
              reconnectTimer = setTimeout(connect, 3000);
            };
          };

          connect();

          return {
            unsubscribe: () => {
              clearTimeout(reconnectTimer);
              if (eventSource) {
                eventSource.close();
              }
              console.log('🔌 Supabase Emulator SSE unsubscribed.');
            }
          };
        }
      };
    }
  };
}
