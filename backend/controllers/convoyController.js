const db = require('../config/db');
const { runProximityChecks } = require('../services/nasaService');

exports.getConvoys = (req, res) => {
  try {
    const convoys = db.getConvoys();
    res.json(convoys);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createConvoy = async (req, res) => {
  try {
    const newConvoy = db.insertConvoy(req.body);
    // Trigger proximity evaluation for the newly created convoy
    await runProximityChecks();
    res.status(201).json(newConvoy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateConvoy = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = db.updateConvoy(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Convoy not found" });
    }
    // Check if the coordinate updates triggered any proximity warnings
    await runProximityChecks();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.patchConvoyQuery = async (req, res) => {
  // Matches Supabase eq query style PATCH /api/convoys?id=eq.c1
  try {
    const queryKey = Object.keys(req.query)[0];
    if (!queryKey) {
      return res.status(400).json({ error: "Query parameter required" });
    }
    
    const queryVal = req.query[queryKey];
    let id;
    if (queryVal.startsWith('eq.')) {
      id = queryVal.replace('eq.', '');
    } else {
      id = queryVal;
    }
    
    const updated = db.updateConvoy(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Convoy not found" });
    }
    
    await runProximityChecks();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteConvoy = (req, res) => {
  try {
    const { id } = req.params;
    const success = db.deleteConvoy(id);
    if (!success) {
      return res.status(404).json({ error: "Convoy not found" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.resetConvoys = async (req, res) => {
  try {
    // Reset to default convoys
    const defaultConvoys = [
      {
        id: "c1",
        call_sign: "convoy-alpha",
        cargo_type: "Medical Supplies",
        lat: 34.0522,
        lon: -118.2437,
        dest_lat: 34.1500,
        dest_lon: -118.1500,
        status: "ACTIVE",
        ai_directive: null
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
        ai_directive: null
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
        ai_directive: null
      }
    ];

    const currentConvoys = db.getConvoys();
    // Delete all current ones
    for (const c of currentConvoys) {
      db.deleteConvoy(c.id);
    }
    // Re-insert defaults
    for (const c of defaultConvoys) {
      db.insertConvoy(c);
    }
    
    await runProximityChecks();
    res.json({ success: true, convoys: db.getConvoys() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
