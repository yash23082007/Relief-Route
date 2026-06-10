const db = require('../config/db');
const { runProximityChecks } = require('./nasaService');
const { checkWeatherAlert } = require('./weatherService');

let simulationInterval = null;

// Initial positions to reset to when they reach destination
const STARTING_POSITIONS = {
  c1: { lat: 34.0522, lon: -118.2437 },
  c2: { lat: 37.7749, lon: -122.4194 },
  c3: { lat: 36.7783, lon: -119.4179 }
};

async function simulateMovement() {
  const convoys = db.getConvoys();
  
  for (const convoy of convoys) {
    // We only simulate moving convoys that are ACTIVE or WARNING or REROUTED
    // If completed or idle, skip
    if (convoy.status === 'COMPLETED') continue;
    
    // Calculate distance to destination
    const latDiff = convoy.dest_lat - convoy.lat;
    const lonDiff = convoy.dest_lon - convoy.lon;
    const distToDest = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
    
    // Snapping margin (very close to destination)
    if (distToDest < 0.005) {
      console.log(`🏁 Convoy ${convoy.call_sign} reached its destination.`);
      // Reset position to loop the simulation indefinitely
      const startPos = STARTING_POSITIONS[convoy.id] || { lat: convoy.lat - 0.1, lon: convoy.lon - 0.1 };
      
      db.updateConvoy(convoy.id, {
        lat: startPos.lat,
        lon: startPos.lon,
        status: 'ACTIVE',
        ai_directive: null
      });
      
      db.insertLog({
        convoy_id: convoy.id,
        convoy_call_sign: convoy.call_sign,
        event_type: 'STATUS_CHANGE',
        ai_summary: `Convoy ${convoy.call_sign} reached destination. Telemetry restarted at origin.`
      });
      
      continue;
    }
    
    // Determine movement step size
    // Convoys that are WARNING or REROUTED move slightly slower (due to hazard/detour)
    let speedFactor = 0.015; // moves 1.5% closer to destination per tick
    if (convoy.status === 'WARNING') speedFactor = 0.008;
    if (convoy.status === 'REROUTED') speedFactor = 0.01;
    
    const newLat = convoy.lat + latDiff * speedFactor;
    const newLon = convoy.lon + lonDiff * speedFactor;
    
    // Update position
    db.updateConvoy(convoy.id, {
      lat: parseFloat(newLat.toFixed(5)),
      lon: parseFloat(newLon.toFixed(5))
    });
    
    // Run localized weather checks on every movement
    checkWeatherAlert(convoy).catch(err => {
      // ignore weather fetch errors silently
    });
  }
  
  // Re-run spatial calculations to check if any movement triggered a hazard boundary crossing
  try {
    await runProximityChecks();
  } catch (err) {
    console.error("Proximity evaluation error during simulation:", err);
  }
}

function startSimulator() {
  if (simulationInterval) return;
  console.log("⚙️ Simulation Engine: Starting active GPS telemetry loops (10s interval)");
  simulationInterval = setInterval(simulateMovement, 10000);
}

function stopSimulator() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    console.log("⚙️ Simulation Engine: Stopped active telemetry loops");
  }
}

module.exports = {
  startSimulator,
  stopSimulator
};
