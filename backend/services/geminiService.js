const axios = require('axios');
const db = require('../config/db');

/**
 * Generate simulated detour advice when Gemini API is unavailable or key is missing
 */
function getSimulatedDetour(convoy, hazard) {
  const directions = ["North-East via Route 9", "South-West via Bypass 4", "East via Interstate 80 detour", "North via Ridge Road"];
  const randomDirection = directions[Math.floor(Math.random() * directions.length)];
  const randomMinutes = Math.floor(Math.random() * 45) + 15; // 15 to 60 mins
  
  let hazardDescription = hazard.title || "hazard area";
  
  return {
    recommended_detour: `Detour ${randomDirection}`,
    estimated_delay_minutes: randomMinutes,
    tactical_summary: `Impending danger from ${hazardDescription} detected within ${hazard.radius_km}km. Detouring via ${randomDirection} is recommended to maintain safe clearance and avoid response delays.`
  };
}

/**
 * Trigger Gemini AI rerouting for an endangered convoy
 */
async function triggerRerouting(convoy, hazard) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY' || apiKey.trim() === '') {
    console.log(`Gemini Service: No API Key found. Generating simulated routing advice for ${convoy.call_sign}...`);
    // Simulate latency for realism
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const simulatedAdvice = getSimulatedDetour(convoy, hazard);
    db.updateConvoy(convoy.id, {
      status: 'REROUTED',
      ai_directive: simulatedAdvice
    });
    db.insertLog({
      convoy_id: convoy.id,
      convoy_call_sign: convoy.call_sign,
      event_type: 'AI_REROUTED',
      ai_summary: `AI Detour vector calculated: ${simulatedAdvice.recommended_detour} (Delay: +${simulatedAdvice.estimated_delay_minutes}m). Threat details: proximity collision with ${hazard.title}.`
    });
    return simulatedAdvice;
  }

  try {
    console.log(`Gemini Service: Contacting Gemini API for ${convoy.call_sign}...`);
    
    // We make a direct REST call to the Gemini API v1beta endpoint.
    // This is extremely robust and avoids version incompatibilities of SDK wrappers.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = {
      systemInstruction: {
        parts: [
          { text: "You are an elite disaster logistics routing agent for civil administration. Provide safe, alternative routing directions strictly as JSON." }
        ]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `CRITICAL INTERSECTION DETECTED.
              Convoy Call Sign: ${convoy.call_sign}
              Supplies Dispatched: ${convoy.cargo_type}
              Current Coordinates: Lat ${convoy.lat}, Lon ${convoy.lon}
              Destination Coordinates: Lat ${convoy.dest_lat}, Lon ${convoy.dest_lon}
              
              IMPENDING HAZARD:
              Hazard Title: ${hazard.title}
              Hazard Type/Category: ${hazard.hazard_type}
              Hazard Epicenter: Lat ${hazard.lat}, Lon ${hazard.lon}
              Danger Radius: ${hazard.radius_km} km
              
              TASK: Analyze the collision zone. Calculate a cardinal detour direction/vector (e.g. "Detour North-East via Route 7") and a 2-sentence tactical summary detailing the operational risk.`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            recommended_detour: { type: "STRING" },
            estimated_delay_minutes: { type: "INTEGER" },
            tactical_summary: { type: "STRING", description: "Max 2 sentence brief." }
          },
          required: ["recommended_detour", "estimated_delay_minutes", "tactical_summary"]
        }
      }
    };

    const response = await axios.post(url, prompt, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    const resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error("Invalid response format from Gemini API");
    }

    const aiDirective = JSON.parse(resultText.trim());
    console.log(`Gemini Service: Rerouting directive successfully generated for ${convoy.call_sign}:`, aiDirective);
    
    db.updateConvoy(convoy.id, {
      status: 'REROUTED',
      ai_directive: aiDirective
    });
    db.insertLog({
      convoy_id: convoy.id,
      convoy_call_sign: convoy.call_sign,
      event_type: 'AI_REROUTED',
      ai_summary: `Gemini AI Detour generated: ${aiDirective.recommended_detour} (Delay: +${aiDirective.estimated_delay_minutes}m). ${aiDirective.tactical_summary}`
    });

    return aiDirective;
  } catch (error) {
    console.error(`Gemini Service Error: Failed to query Gemini API: ${error.message}. Falling back to simulation.`);
    
    const simulatedAdvice = getSimulatedDetour(convoy, hazard);
    db.updateConvoy(convoy.id, {
      status: 'REROUTED',
      ai_directive: simulatedAdvice
    });
    db.insertLog({
      convoy_id: convoy.id,
      convoy_call_sign: convoy.call_sign,
      event_type: 'AI_REROUTED',
      ai_summary: `AI Detour vector calculated (API fallback): ${simulatedAdvice.recommended_detour} (Delay: +${simulatedAdvice.estimated_delay_minutes}m). Threat details: proximity collision with ${hazard.title}.`
    });
    return simulatedAdvice;
  }
}

module.exports = {
  triggerRerouting
};
