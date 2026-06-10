import os
import json
import logging
import httpx

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    logger.info("Using direct HTTPS REST endpoint for Gemini API Decision Support.")
else:
    logger.info("GEMINI_API_KEY not found. Operating with rule-based fallback decision support.")

async def generate_mitigation_brief(
    vessel_name: str,
    vessel_type: str,
    current_lat: float,
    current_lon: float,
    destination_port: str,
    disruption_description: str,
    severity: str
) -> dict:
    """
    Generates a context-aware logistics mitigation brief and rerouting recommendation.
    Uses Google Gemini REST API if API key is present, otherwise falls back to a rule-based system.
    """
    
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            prompt = f"""
            You are an AI maritime logistics risk management and routing assistant.
            Provide a structured logistics mitigation action plan and route decision brief for:
            - Vessel: {vessel_name} ({vessel_type})
            - Current Location: [{current_lat}, {current_lon}]
            - Destination Port: {destination_port}
            - Disruption: {disruption_description} (Severity: {severity})

            You must reply with a valid JSON object matching this structure EXACTLY:
            {{
                "recommended_action": "Detailed operational action, such as rerouting, anchoring, or reducing speed.",
                "estimated_delay_hours": 12.5,
                "mitigation_brief": "A professional paragraph detailing the reasoning, weather/hazard impacts, and port queue avoidance strategies."
            }}
            """
            
            payload = {
                "contents": [{
                    "parts": [{
                        "text": prompt
                    }]
                }],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text:
                            result = json.loads(text.strip())
                            return result
                else:
                    logger.error(f"Gemini REST response error {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Gemini API direct REST query failed: {e}. Falling back to rule-based briefing.")

    # Rule-Based Fallback Generator
    action = "Proceed with caution along planned lane at reduced speed (10 knots)."
    delay = 6.0
    brief = (
        f"Automated risk check flagged a {severity.lower()} severity disruption ({disruption_description}) near the path to {destination_port}. "
        f"Standard maritime protocol advises maintaining a distance of at least 80km from hazard coordinates. "
        f"Speed reduction recommended to mitigate wave impact and prevent terminal queue bottlenecks."
    )

    if severity == "HIGH":
        if "storm" in disruption_description.lower() or "wave" in disruption_description.lower():
            action = f"Reroute vessel to avoid active weather cell. Hold position or request detour lane."
            delay = 24.0
            brief = (
                f"Severe maritime weather warning active. Waves or winds exceed safe operational thresholds for {vessel_name}. "
                f"Recommended action is to alter course away from the storm front and stand by for traffic control instructions "
                f"outside the high wind zone."
            )
        elif "congestion" in disruption_description.lower() or "clearance" in disruption_description.lower() or "port" in disruption_description.lower():
            action = "Slow-steam to delay arrival or divert to nearest alternative port buffer."
            delay = 36.0
            brief = (
                f"Critical port congestion detected at {destination_port}. Vessel {vessel_name} will experience extended customs wait times. "
                f"Transitioning to slow-steaming mode saves fuel while minimizing queue piling outside the customs buffer zone."
            )
        else:
            action = "Activate emergency rerouting protocol. Follow alternative shipping lane corridor."
            delay = 18.0
            brief = (
                f"A high-severity hazard ({disruption_description}) has compromised the primary lane. "
                f"Vessel logistics should divert to secondary lanes to ensure cargo security and vessel safety."
            )
    elif severity == "MEDIUM":
        action = "Initiate moderate detour to bypass direct impact zone."
        delay = 10.0
        brief = (
            f"Moderate hazard reported in the vicinity of {vessel_name}. "
            f"Adjusting heading by 15 degrees is sufficient to maintain standard safety margins without significant fuel penalty."
        )

    return {
        "recommended_action": action,
        "estimated_delay_hours": float(delay),
        "mitigation_brief": brief
    }
