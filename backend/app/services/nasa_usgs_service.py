import httpx
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# List of critical maritime choke points to simulate hazards near if APIs fail or are empty
CHOKE_POINTS = [
    {"title": "Malacca Strait Congestion", "hazard_type": "traffic", "lat": 1.4, "lon": 103.0, "radius_km": 120.0},
    {"title": "Suez Canal Storm Hazard", "hazard_type": "storm", "lat": 29.9, "lon": 32.5, "radius_km": 80.0},
    {"title": "Panama Canal Drought restriction", "hazard_type": "traffic", "lat": 9.1, "lon": -79.9, "radius_km": 90.0},
    {"title": "South China Sea Volcanic Hazard", "hazard_type": "volcano", "lat": 12.0, "lon": 114.0, "radius_km": 150.0},
    {"title": "Gibraltar Strait Storm Front", "hazard_type": "storm", "lat": 35.9, "lon": -5.6, "radius_km": 100.0}
]

async def fetch_global_hazards() -> list:
    """
    Fetches planetary hazards from NASA EONET (wildfires, storms, volcanoes) 
    and USGS Earthquake API. Normalizes and aggregates them.
    """
    hazards = []

    # 1. Fetch from NASA EONET (limit to 50 active events)
    try:
        nasa_url = "https://eonet.gsfc.nasa.gov/api/v3/events?limit=50&status=open"
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(nasa_url)
            if response.status_code == 200:
                data = response.json()
                for event in data.get("events", []):
                    categories = event.get("categories", [])
                    cat_id = categories[0].get("id") if categories else "unknown"
                    
                    # Map NASA hazard categories
                    hazard_type = "unknown"
                    if "wildfires" in cat_id.lower():
                        hazard_type = "wildfire"
                    elif "severeStorms" in cat_id.lower() or "storms" in cat_id.lower():
                        hazard_type = "storm"
                    elif "volcanoes" in cat_id.lower():
                        hazard_type = "volcano"
                    elif "floods" in cat_id.lower():
                        hazard_type = "flood"
                    else:
                        continue  # Skip irrelevant NASA categories
                    
                    geometries = event.get("geometry", [])
                    if not geometries:
                        continue
                    
                    # NASA coordinates can be Point or Polygon. We take the latest point.
                    geom = geometries[-1]
                    coords = geom.get("coordinates", [])
                    if len(coords) >= 2:
                        lon, lat = coords[0], coords[1]
                        hazards.append({
                            "id": f"nasa-{event.get('id')}",
                            "title": event.get("title", "NASA EONET Event"),
                            "hazard_type": hazard_type,
                            "latitude": float(lat),
                            "longitude": float(lon),
                            "radius_km": 100.0,  # Default search radius for hazards
                            "reported_at": geom.get("date", datetime.utcnow().isoformat())
                        })
    except Exception as e:
        logger.warning(f"Error fetching NASA EONET: {e}")

    # 2. Fetch from USGS Earthquakes (Magnitude >= 4.5)
    try:
        usgs_url = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4.5&limit=20"
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(usgs_url)
            if response.status_code == 200:
                data = response.json()
                for feature in data.get("features", []):
                    props = feature.get("properties", {})
                    geom = feature.get("geometry", {})
                    coords = geom.get("coordinates", [])
                    
                    if len(coords) >= 2:
                        lon, lat = coords[0], coords[1]
                        mag = props.get("mag", 4.5)
                        hazards.append({
                            "id": f"usgs-{feature.get('id')}",
                            "title": f"M{mag} Earthquake - {props.get('place', 'Unknown location')}",
                            "hazard_type": "earthquake",
                            "latitude": float(lat),
                            "longitude": float(lon),
                            "radius_km": float(mag * 20.0),  # Radius scales with magnitude
                            "reported_at": datetime.fromtimestamp(props.get("time", 0) / 1000.0).isoformat()
                        })
    except Exception as e:
        logger.warning(f"Error fetching USGS earthquakes: {e}")

    # 3. Fallback / Seed simulation choke points if list is thin
    if len(hazards) < 5:
        logger.info("Fewer than 5 global hazards found. Seeding critical choke-point simulated hazards.")
        for idx, cp in enumerate(CHOKE_POINTS):
            hazards.append({
                "id": f"sim-hazard-{idx}",
                "title": cp["title"],
                "hazard_type": cp["hazard_type"],
                "latitude": cp["lat"],
                "longitude": cp["lon"],
                "radius_km": cp["radius_km"],
                "reported_at": datetime.utcnow().isoformat()
            })

    return hazards
