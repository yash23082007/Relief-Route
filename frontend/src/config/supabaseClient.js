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
  console.log('💻 ReliefRoute Client: Running in ZERO-CONFIG Local Emulator Mode.');
  supabase = createMockSupabaseClient();
}

export { supabase, isRealSupabase };

function createMockSupabaseClient() {
  const BACKEND_URL = 'http://localhost:5000';
  const WS_URL = 'ws://localhost:5000';

  return {
    auth: {
      signUp: async ({ email, password }) => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Signup failed');
          localStorage.setItem('reliefroute_session', JSON.stringify(data));
          return { data, error: null };
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
          if (!res.ok) throw new Error(data.error || 'Login failed');
          localStorage.setItem('reliefroute_session', JSON.stringify(data));
          return { data, error: null };
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
        // Simple mock authentication subscriber
        const handleStorageChange = (e) => {
          if (e.key === 'reliefroute_session') {
            const session = e.newValue ? JSON.parse(e.newValue) : null;
            callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
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
      // Map 'incidents' table query to '/api/hazards' endpoint
      const endpointTable = table === 'incidents' ? 'hazards' : table;
      const baseUrl = `${BACKEND_URL}/api/${endpointTable}`;
      
      return {
        select: async () => {
          try {
            const res = await fetch(baseUrl);
            const data = await res.json();
            return { data, error: null };
          } catch (error) {
            return { data: [], error };
          }
        },
        insert: async (records) => {
          try {
            const res = await fetch(baseUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(records)
            });
            const data = await res.json();
            return { data, error: null };
          } catch (error) {
            return { data: null, error };
          }
        },
        update: (changes) => {
          return {
            eq: async (column, value) => {
              try {
                // Mimic Supabase's eq filter route or standard update
                const res = await fetch(`${baseUrl}?${column}=eq.${value}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(changes)
                });
                const data = await res.json();
                return { data, error: null };
              } catch (error) {
                return { data: null, error };
              }
            }
          };
        },
        upsert: async (records) => {
          try {
            const res = await fetch(`${baseUrl}/upsert`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(records)
            });
            const data = await res.json();
            return { data, error: null };
          } catch (error) {
            return { data: null, error };
          }
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
          let ws;
          let reconnectTimer;
          
          const connect = () => {
            console.log(`🔌 Supabase Emulator WS connecting to ${WS_URL}...`);
            ws = new WebSocket(WS_URL);
            
            ws.onopen = () => {
              console.log('✅ Supabase Emulator WS connected.');
            };
            
            ws.onmessage = (event) => {
              try {
                const payload = JSON.parse(event.data);
                
                // Route message to all subscribers matching filters
                for (const sub of callbacks) {
                  const eventMatch = sub.type === '*' || sub.type === 'postgres_changes';
                  
                  // Handle both 'hazards' and 'incidents' table names flexibly
                  const tableFilter = sub.filter?.table;
                  const tableMatch = !tableFilter || 
                                     tableFilter === payload.table || 
                                     (tableFilter === 'incidents' && payload.table === 'hazards') ||
                                     (tableFilter === 'hazards' && payload.table === 'incidents');
                                     
                  const dbEventMatch = !sub.filter?.event || 
                                       sub.filter.event === '*' || 
                                       sub.filter.event === payload.event;
                  
                  if (eventMatch && tableMatch && dbEventMatch) {
                    // Normalize table name in payload to match the subscriber filter
                    const normalizedPayload = {
                      ...payload,
                      table: tableFilter || payload.table
                    };
                    sub.callback(normalizedPayload);
                  }
                }
              } catch (err) {
                // Ignore parsing errors or welcome packets
              }
            };
            
            ws.onclose = () => {
              console.log('❌ Supabase Emulator WS connection closed. Reconnecting in 3s...');
              reconnectTimer = setTimeout(connect, 3000);
            };
            
            ws.onerror = (err) => {
              console.error('WebSocket Error:', err);
              ws.close();
            };
          };

          connect();

          return {
            unsubscribe: () => {
              clearTimeout(reconnectTimer);
              if (ws) {
                ws.onclose = null; // Prevent reconnect loop
                ws.close();
              }
              console.log('🔌 Supabase Emulator WS unsubscribed.');
            }
          };
        }
      };
    }
  };
}
