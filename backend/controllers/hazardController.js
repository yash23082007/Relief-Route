const db = require('../config/db');
const { runProximityChecks, fetchAndIngestHazards } = require('../services/nasaService');

exports.getHazards = (req, res) => {
  try {
    const hazards = db.getHazards();
    res.json(hazards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createHazard = async (req, res) => {
  try {
    const newHazard = db.insertHazard(req.body);
    if (!newHazard) {
      return res.status(400).json({ error: "Hazard already exists with this ID" });
    }
    await runProximityChecks();
    res.status(201).json(newHazard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.upsertHazard = async (req, res) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    
    for (const record of records) {
      const result = db.upsertHazard(record);
      results.push(result);
    }
    
    await runProximityChecks();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.triggerIngest = async (req, res) => {
  try {
    const result = await fetchAndIngestHazards();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.clearHazards = async (req, res) => {
  try {
    const database = require('../config/db');
    // Clear all elements in hazards list by mutating database.json
    const fs = require('fs');
    const path = require('path');
    const DB_FILE = path.join(__dirname, '../db.json');
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const data = JSON.parse(raw);
    data.hazards = [];
    
    // Also reset convoy status to ACTIVE and remove AI directives
    data.convoys = data.convoys.map(c => ({
      ...c,
      status: 'ACTIVE',
      ai_directive: null
    }));
    
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    
    // Broadcast updates to clients
    const convoys = database.getConvoys();
    for (const convoy of convoys) {
      // Broadcast update for each convoy resetting them
      // In db.js, we have notifyChange. But since we manually edited, we can notify manually or let db.js do it.
      // Actually, we can just call db.updateConvoy for each to trigger the notifications.
      database.updateConvoy(convoy.id, { status: 'ACTIVE', ai_directive: null });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
