const axios = require('axios');
const db = require('../config/db');
const { calculateDistance } = require('../utils/haversine');
const { triggerRerouting } = require('./geminiService');

const NASA_EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events';

// Assign realistic danger radii (in km) based on hazard category
function getRadiusForCategory(category) {
  switch (category) {
    case 'wildfires':
      return 15.0; // Wildfires: 15km zone
    case 'severeStorms':
      return 50.0; // Severe Storms: 50km zone
    case 'floods':
      return 30.0; // Floods: 30km zone
    case 'volcanoes':
      return 40.0; // Volcanoes: 40km zone
    case 'earthquakes':
      return 60.0; // Earthquakes: 60km zone
    default:
      return 25.0; // Default hazard radius
  }
}

/**
 * Fetch and ingest latest hazards from NASA EONET
 */
async function fetchAndIngestHazards() {
  try {
    console.log('Ingestion Service: Fetching NASA EONET events...');
    const response = await axios.get(NASA_EONET_URL, { timeout: 10000 });
    const allEvents = response.data.events || [];
    
    // Filter to relevant categories for logistics: wildfires, storms, floods, volcanoes
    const relevantCategories = new Set(['wildfires', 'severeStorms', 'floods', 'volcanoes']);
    const events = allEvents.filter(event => {
      const catId = event.categories[0]?.id;
      return relevantCategories.has(catId);
    }).slice(0, 150); // Limit to 150 most recent events for optimal UI rendering speed
    
    console.log(`Ingestion Service: Filtered to ${events.length} relevant active events.`);
    
    let newHazardsCount = 0;
    
    // Clear old hazards first to keep the database size constant and clean
    const dbFile = require('path').join(__dirname, '../db.json');
    const fs = require('fs');
    if (fs.existsSync(dbFile)) {
      const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      data.hazards = [];
      fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
    }
    
    for (const event of events) {
      // Ensure we have geometry data
      if (!event.geometry || event.geometry.length === 0) continue;
      
      // Get the latest geometry point (usually the last entry)
      const latestGeo = event.geometry[event.geometry.length - 1];
      if (latestGeo.type !== 'Point' || !latestGeo.coordinates) continue;
      
      const [lon, lat] = latestGeo.coordinates;
      const categoryId = event.categories[0]?.id || 'unknown';
      
      const hazardData = {
        id: event.id,
        title: event.title,
        hazard_type: categoryId,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        radius_km: getRadiusForCategory(categoryId),
        reported_at: latestGeo.date || new Date().toISOString()
      };
      
      db.upsertHazard(hazardData);
      newHazardsCount++;
    }
    
    console.log(`Ingestion Service: Successfully processed ${newHazardsCount} hazards.`);
    
    // Trigger Proximity Checks for all convoys
    await runProximityChecks();
    
    return { success: true, count: newHazardsCount };
  } catch (error) {
    console.error('Ingestion Service Error: Failed to ingest NASA EONET data:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * For every active convoy, check if it intersects with any active hazard.
 * If yes, trigger the AI rerouting protocol.
 */
async function runProximityChecks() {
  const convoys = db.getConvoys();
  const hazards = db.getHazards();
  
  console.log(`Proximity Monitor: Evaluating ${convoys.length} convoys against ${hazards.length} hazards.`);
  
  for (const convoy of convoys) {
    // We only evaluate active convoys or warning status convoys
    if (convoy.status === 'REROUTED') continue;
    
    let endangeringHazard = null;
    let minDistance = Infinity;
    
    for (const hazard of hazards) {
      const dist = calculateDistance(convoy.lat, convoy.lon, hazard.lat, hazard.lon);
      if (dist <= hazard.radius_km) {
        if (dist < minDistance) {
          minDistance = dist;
          endangeringHazard = hazard;
        }
      }
    }
    
    if (endangeringHazard) {
      console.log(`🚨 DANGER DETECTED: Convoy "${convoy.call_sign}" is ${minDistance.toFixed(2)} km from "${endangeringHazard.title}" (Radius: ${endangeringHazard.radius_km} km)`);
      
      // Update convoy status to WARNING first so the client sees the issue
      db.updateConvoy(convoy.id, { status: 'WARNING' });
      
      // Trigger AI rerouting logic asynchronously to avoid blocking the main cycle
      triggerRerouting(convoy, endangeringHazard).catch(err => {
        console.error(`Gemini Service Error for convoy ${convoy.id}:`, err);
      });
    } else if (convoy.status === 'WARNING') {
      // If the convoy is no longer in danger and was in WARNING status, restore to ACTIVE
      db.updateConvoy(convoy.id, { status: 'ACTIVE', ai_directive: null });
    }
  }
}

module.exports = {
  fetchAndIngestHazards,
  runProximityChecks
};
