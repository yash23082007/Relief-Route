import math
import json
import httpx
import logging
import os
from .weather_service import get_weather_risk

logger = logging.getLogger(__name__)

TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY")

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great-circle distance between two points in kilometers.
    """
    R = 6371.0  # Earth's radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)

    a = math.sin(d_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

async def get_tomtom_traffic_risk(lat: float, lon: float) -> float:
    """
    Queries TomTom Traffic Flow Segment API to get traffic flow delay index (0.0 to 1.0).
    """
    if not TOMTOM_API_KEY:
        return 0.2  # default fallback
        
    url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/relative-compact/10/json?key={TOMTOM_API_KEY}&point={lat},{lon}"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                flow = data.get("flowSegmentData", {})
                current_speed = flow.get("currentSpeed", 1.0)
                free_flow_speed = flow.get("freeFlowSpeed", 1.0)
                
                # Delay factor ranges from 0.0 (smooth) to 1.0 (blocked/congested)
                delay_factor = max(0.0, 1.0 - (current_speed / free_flow_speed))
                return round(delay_factor, 2)
    except Exception as e:
        logger.warning(f"Error querying TomTom Traffic Segment flow segment data: {e}")
        
    return 0.2  # fallback

async def get_osrm_route(start_lat: float, start_lon: float, end_lat: float, end_lon: float) -> list:
    """
    Queries public OSRM API to get route coordinates. 
    Falls back to a direct geodesic route (interpolation) if OSRM is unreachable or errors.
    """
    url = f"https://router.project-osrm.org/route/v1/driving/{start_lon},{start_lat};{end_lon},{end_lat}?overview=full&geometries=geojson"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                routes = data.get("routes", [])
                if routes:
                    coords = routes[0].get("geometry", {}).get("coordinates", [])
                    # OSRM outputs [lon, lat], normalize to [lat, lon]
                    return [[c[1], c[0]] for c in coords]
    except Exception as e:
        logger.warning(f"OSRM routing failed: {e}. Interpolating direct geodesic path.")
    
    # Fallback: simple interpolation
    steps = 15
    path = []
    for i in range(steps + 1):
        t = i / steps
        lat = start_lat + t * (end_lat - start_lat)
        lon = start_lon + t * (end_lon - start_lon)
        path.append([lat, lon])
    return path

async def calculate_lane_penalty(coordinates: list, hazards: list) -> float:
    """
    Calculates a weighted disruption penalty (0.0 to 100.0) along a shipping lane.
    Telemetry factors:
    1. Weather: Sample weather along lane coordinates.
    2. Hazards: Check proximity to planetary hazards (NASA EONET, USGS).
    3. Traffic flow: Live TomTom traffic flow query.
    """
    if not coordinates:
        return 0.0

    # 1. Weather Penalty (Sample at start, middle, and end coordinates)
    sample_indices = [0, len(coordinates) // 2, len(coordinates) - 1]
    weather_scores = []
    for idx in sample_indices:
        if idx < len(coordinates):
            lat, lon = coordinates[idx]
            weather_data = await get_weather_risk(lat, lon)
            weather_scores.append(weather_data["weather_penalty"])
    avg_weather_penalty = sum(weather_scores) / len(weather_scores) if weather_scores else 0.0

    # 2. Hazards Penalty
    # If any active hazard is closer than its radius to any coordinate of the lane, add heavy penalty.
    hazard_penalty = 0.0
    for lat, lon in coordinates:
        for hazard in hazards:
            dist = haversine_distance(lat, lon, hazard["latitude"], hazard["longitude"])
            if dist <= hazard["radius_km"]:
                # Severity-based penalty multiplier
                severity = hazard.get("severity", "MEDIUM")
                mult = 1.0
                if severity == "HIGH":
                    mult = 1.5
                elif severity == "LOW":
                    mult = 0.5
                
                # Proximity decay: closer means higher penalty
                proximity_score = (1.0 - (dist / hazard["radius_km"])) * 30.0 * mult
                hazard_penalty = max(hazard_penalty, proximity_score)

    # 3. Traffic Flow Penalty (scaled TomTom flow delay)
    # We sample traffic near the midpoint of the lane coordinates
    tom_tom_flow = 0.2
    if coordinates:
        mid_lat, mid_lon = coordinates[len(coordinates) // 2]
        tom_tom_flow = await get_tomtom_traffic_risk(mid_lat, mid_lon)
        
    traffic_penalty = tom_tom_flow * 20.0

    # Weighted Sum Formula:
    # Weather: 30% weight (max 30 pts)
    # Hazards: 50% weight (max 50 pts)
    # Traffic: 20% weight (max 20 pts)
    total_penalty = (avg_weather_penalty * 30.0) + hazard_penalty + traffic_penalty
    return round(min(total_penalty, 100.0), 2)
