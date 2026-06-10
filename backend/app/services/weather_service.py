import httpx
import logging

logger = logging.getLogger(__name__)

async def get_weather_risk(lat: float, lon: float) -> dict:
    """
    Fetches marine weather from Open-Meteo API or falls back to simulated values.
    Returns a dict with wind_speed, wave_height, and weather_penalty (0.0 to 1.0).
    """
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=wind_speed_10m"
    marine_url = f"https://marine-api.open-meteo.com/v1/marine?latitude={lat}&longitude={lon}&current=wave_height"
    
    wind_speed = 12.0  # default knots/kmh
    wave_height = 1.0  # default meters
    
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            # Try to get wind speed
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                wind_speed = data.get("current", {}).get("wind_speed_10m", wind_speed)
            
            # Try to get marine wave height
            marine_response = await client.get(marine_url)
            if marine_response.status_code == 200:
                marine_data = marine_response.json()
                wave_height = marine_data.get("current", {}).get("wave_height", wave_height)
    except Exception as e:
        logger.warning(f"Error fetching live weather, using simulated fallback: {e}")
        # Deterministic simulation based on coordinates
        wind_speed = float((abs(lat) + abs(lon)) % 35.0)
        wave_height = float((abs(lat) * abs(lon)) % 6.0) / 1.5

    # Guard against None values from land coordinates or missing forecast fields
    if wind_speed is None:
        wind_speed = 12.0
    if wave_height is None:
        wave_height = 1.0

    # Normalize scores:
    # High wind speed > 50 km/h is severe
    # High wave height > 4m is severe
    wind_factor = min(wind_speed / 50.0, 1.0)
    wave_factor = min(wave_height / 4.0, 1.0)
    
    # Combined weather penalty score (0.0 to 1.0)
    weather_penalty = (wind_factor * 0.4) + (wave_factor * 0.6)
    
    return {
        "wind_speed_kmh": round(wind_speed, 2),
        "wave_height_m": round(wave_height, 2),
        "weather_penalty": round(weather_penalty, 2)
    }
