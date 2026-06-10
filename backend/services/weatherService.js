const axios = require('axios');
const db = require('../config/db');

/**
 * Checks the live weather at a convoy's coordinates using Open-Meteo
 * and declares a weather warning state if precipitation or windspeed is extreme.
 */
async function checkWeatherAlert(convoy) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${convoy.lat}&longitude=${convoy.lon}&current_weather=true&forecast_days=1`;
    const res = await axios.get(url, { timeout: 5000 });
    const weather = res.data?.current_weather;
    
    if (!weather) return null;
    
    const windSpeed = weather.windspeed || 0;
    // Weather condition code mapping or precipitation estimation
    // For simplicity, we check if windspeed > 35 km/h or if specific stormy condition codes (e.g., code > 70) exist
    const isHighWind = windSpeed > 35;
    const weatherCode = weather.weathercode || 0;
    const isSevereWeather = [95, 96, 99, 85, 86, 71, 73, 75, 77].includes(weatherCode); // Thunderstorms, heavy snow, showers
    
    if (isHighWind || isSevereWeather) {
      let reason = "";
      if (isHighWind) reason += `High Winds (${windSpeed} km/h) `;
      if (isSevereWeather) reason += `Severe Storm Conditions (Code ${weatherCode}) `;
      
      console.log(`⚠️ WEATHER WARNING for ${convoy.call_sign}: ${reason}`);
      
      // Update convoy status if it is currently ACTIVE
      if (convoy.status === 'ACTIVE') {
        const updated = db.updateConvoy(convoy.id, { 
          status: 'WARNING',
          ai_directive: {
            recommended_detour: "Maintain holding pattern or detour to nearest depot",
            estimated_delay_minutes: 30,
            tactical_summary: `Severe weather detected: ${reason.trim()}. Convoy instructed to proceed with maximum caution.`
          }
        });
        
        // Write to mission logs
        db.insertLog({
          convoy_id: convoy.id,
          convoy_call_sign: convoy.call_sign,
          event_type: 'WEATHER_ALERT',
          ai_summary: `Severe weather alert triggered for ${convoy.call_sign}: ${reason.trim()}. Delay estimated +30m.`
        });
        
        return updated;
      }
    } else if (convoy.status === 'WARNING' && convoy.ai_directive?.tactical_summary?.includes('Severe weather')) {
      // Clear weather warning if weather improves
      const updated = db.updateConvoy(convoy.id, { 
        status: 'ACTIVE',
        ai_directive: null
      });
      
      db.insertLog({
        convoy_id: convoy.id,
        convoy_call_sign: convoy.call_sign,
        event_type: 'STATUS_CHANGE',
        ai_summary: `Weather cleared for ${convoy.call_sign}. Status restored to ACTIVE.`
      });
      
      return updated;
    }
  } catch (error) {
    console.error(`Failed to fetch weather forecast for ${convoy.call_sign}:`, error.message);
  }
  return null;
}

module.exports = {
  checkWeatherAlert
};
