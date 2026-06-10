const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../db.json');

// Initial schema database
const defaultSchema = {
  convoys: [
    {
      id: "c1",
      call_sign: "convoy-alpha",
      cargo_type: "Medical Supplies",
      lat: 34.0522,
      lon: -118.2437,
      dest_lat: 34.1500,
      dest_lon: -118.1500,
      status: "ACTIVE",
      ai_directive: null,
      updated_at: new Date().toISOString()
    },
    {
      id: "c2",
      call_sign: "convoy-beta",
      cargo_type: "Fresh Water",
      lat: 37.7749,
      lon: -122.4194,
      dest_lat: 37.9000,
      dest_lon: -122.3000,
      status: "ACTIVE",
      ai_directive: null,
      updated_at: new Date().toISOString()
    },
    {
      id: "c3",
      call_sign: "convoy-gamma",
      cargo_type: "Emergency MREs",
      lat: 36.7783,
      lon: -119.4179,
      dest_lat: 36.9000,
      dest_lon: -119.3000,
      status: "ACTIVE",
      ai_directive: null,
      updated_at: new Date().toISOString()
    }
  ],
  hazards: [],
  users: [],
  mission_logs: []
};

// Ensure database file exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(defaultSchema, null, 2), 'utf8');
}

function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    
    // Schema verification and auto-migration
    if (!parsed.convoys) parsed.convoys = [];
    if (!parsed.hazards) parsed.hazards = [];
    if (!parsed.users) parsed.users = [];
    if (!parsed.mission_logs) parsed.mission_logs = [];
    
    return parsed;
  } catch (err) {
    console.error("Error reading database file, resetting to default schema", err);
    return defaultSchema;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing to database file", err);
  }
}

// WebSocket broadcast listener
let dbChangeListener = null;

function setDBChangeListener(listener) {
  dbChangeListener = listener;
}

function notifyChange(event, table, record) {
  if (dbChangeListener) {
    dbChangeListener({
      type: 'postgres_changes',
      event: event, // 'INSERT', 'UPDATE', 'DELETE'
      schema: 'public',
      table: table,
      new: record
    });
  }
}

module.exports = {
  setDBChangeListener,
  
  // Convoys CRUD
  getConvoys: () => {
    return readDB().convoys || [];
  },
  
  insertConvoy: (convoy) => {
    const db = readDB();
    const newConvoy = {
      id: convoy.id || `c-${Date.now()}`,
      call_sign: convoy.call_sign || "Unnamed Convoy",
      cargo_type: convoy.cargo_type || "Water & Rations",
      lat: parseFloat(convoy.lat) || 0,
      lon: parseFloat(convoy.lon) || 0,
      dest_lat: parseFloat(convoy.dest_lat) || 0,
      dest_lon: parseFloat(convoy.dest_lon) || 0,
      status: convoy.status || "ACTIVE",
      ai_directive: convoy.ai_directive || null,
      updated_at: new Date().toISOString()
    };
    db.convoys.push(newConvoy);
    writeDB(db);
    notifyChange('INSERT', 'convoys', newConvoy);
    return newConvoy;
  },
  
  updateConvoy: (id, updates) => {
    const db = readDB();
    const idx = db.convoys.findIndex(c => c.id === id);
    if (idx === -1) return null;
    
    db.convoys[idx] = {
      ...db.convoys[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    // Ensure data types are parsed correctly
    if (updates.lat !== undefined) db.convoys[idx].lat = parseFloat(updates.lat);
    if (updates.lon !== undefined) db.convoys[idx].lon = parseFloat(updates.lon);
    
    writeDB(db);
    notifyChange('UPDATE', 'convoys', db.convoys[idx]);
    return db.convoys[idx];
  },
  
  deleteConvoy: (id) => {
    const db = readDB();
    const idx = db.convoys.findIndex(c => c.id === id);
    if (idx === -1) return false;
    const deleted = db.convoys.splice(idx, 1)[0];
    writeDB(db);
    notifyChange('DELETE', 'convoys', deleted);
    return true;
  },

  // Hazards CRUD
  getHazards: () => {
    return readDB().hazards || [];
  },
  
  insertHazard: (hazard) => {
    const db = readDB();
    // check if it already exists
    if (db.hazards.some(h => h.id === hazard.id)) {
      return null;
    }
    const newHazard = {
      id: hazard.id || `h-${Date.now()}`,
      title: hazard.title || "Hazard Event",
      hazard_type: hazard.hazard_type || "wildfires",
      lat: parseFloat(hazard.lat) || 0,
      lon: parseFloat(hazard.lon) || 0,
      radius_km: parseFloat(hazard.radius_km) || 25.0,
      reported_at: hazard.reported_at || new Date().toISOString()
    };
    db.hazards.push(newHazard);
    writeDB(db);
    notifyChange('INSERT', 'hazards', newHazard);
    return newHazard;
  },
  
  upsertHazard: (hazard) => {
    const db = readDB();
    const idx = db.hazards.findIndex(h => h.id === hazard.id);
    const newHazard = {
      id: hazard.id || `h-${Date.now()}`,
      title: hazard.title || "Hazard Event",
      hazard_type: hazard.hazard_type || "wildfires",
      lat: parseFloat(hazard.lat) || 0,
      lon: parseFloat(hazard.lon) || 0,
      radius_km: parseFloat(hazard.radius_km) || 25.0,
      reported_at: hazard.reported_at || new Date().toISOString()
    };
    
    if (idx !== -1) {
      db.hazards[idx] = newHazard;
      writeDB(db);
      notifyChange('UPDATE', 'hazards', newHazard);
    } else {
      db.hazards.push(newHazard);
      writeDB(db);
      notifyChange('INSERT', 'hazards', newHazard);
    }
    return newHazard;
  },

  // Users CRUD (Mock Auth)
  getUsers: () => {
    return readDB().users || [];
  },
  
  insertUser: (user) => {
    const db = readDB();
    if (db.users.some(u => u.email === user.email)) {
      return null;
    }
    const newUser = {
      id: `u-${Date.now()}`,
      email: user.email,
      password: user.password, // simple mock auth plaintext (not for production)
      role: user.role || 'operator', // role assignment (operator or admin)
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    writeDB(db);
    return newUser;
  },

  // Mission Logs CRUD
  getLogs: () => {
    return readDB().mission_logs || [];
  },
  
  insertLog: (log) => {
    const db = readDB();
    const newLog = {
      id: log.id || `l-${Date.now()}`,
      convoy_id: log.convoy_id || null,
      convoy_call_sign: log.convoy_call_sign || "Unknown Fleet",
      event_type: log.event_type || "STATUS_CHANGE", // 'INTERSECTION_DETECTED', 'AI_REROUTED', 'WEATHER_ALERT'
      ai_summary: log.ai_summary || "",
      created_at: new Date().toISOString()
    };
    db.mission_logs.push(newLog);
    writeDB(db);
    notifyChange('INSERT', 'mission_logs', newLog);
    return newLog;
  },

  clearLogs: () => {
    const db = readDB();
    db.mission_logs = [];
    writeDB(db);
    return true;
  }
};
