import asyncio
import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from ..db.database import SessionLocal
from ..db import models
from .routing_engine import haversine_distance, calculate_lane_penalty, get_osrm_route
from .nasa_usgs_service import fetch_global_hazards
from .gemini_service import generate_mitigation_brief
from .firebase_service import stream_update

logger = logging.getLogger(__name__)

# Seed Data Configurations
# Seed Data Configurations
SEED_PORTS = [
    {"name": "Shanghai", "latitude": 31.2, "longitude": 121.5, "status": "NORMAL", "congestion_level": 0.15},
    {"name": "Singapore", "latitude": 1.3, "longitude": 103.8, "status": "NORMAL", "congestion_level": 0.22},
    {"name": "Rotterdam", "latitude": 51.9, "longitude": 4.1, "status": "NORMAL", "congestion_level": 0.18},
    {"name": "New York", "latitude": 40.7, "longitude": -74.0, "status": "NORMAL", "congestion_level": 0.12},
    {"name": "Los Angeles", "latitude": 33.7, "longitude": -118.2, "status": "NORMAL", "congestion_level": 0.28},
    {"name": "Yokohama", "latitude": 35.4, "longitude": 139.7, "status": "NORMAL", "congestion_level": 0.14},
    {"name": "Jebel Ali", "latitude": 25.0, "longitude": 55.1, "status": "NORMAL", "congestion_level": 0.20},
    {"name": "Port Said", "latitude": 31.3, "longitude": 32.3, "status": "NORMAL", "congestion_level": 0.25},
    {"name": "Panama City", "latitude": 8.9, "longitude": -79.5, "status": "NORMAL", "congestion_level": 0.35},
    {"name": "Cape Town", "latitude": -33.9, "longitude": 18.4, "status": "NORMAL", "congestion_level": 0.10},
    {"name": "Hamburg", "latitude": 53.5, "longitude": 9.9, "status": "NORMAL", "congestion_level": 0.16},
    {"name": "Houston", "latitude": 29.7, "longitude": -95.3, "status": "NORMAL", "congestion_level": 0.21},
    {"name": "Sydney", "latitude": -33.8, "longitude": 151.2, "status": "NORMAL", "congestion_level": 0.08},
    {"name": "Mumbai", "latitude": 19.0, "longitude": 72.8, "status": "NORMAL", "congestion_level": 0.19},
    {"name": "Santos", "latitude": -23.9, "longitude": -46.3, "status": "NORMAL", "congestion_level": 0.17},
    {"name": "Gibraltar", "latitude": 36.1, "longitude": -5.3, "status": "NORMAL", "congestion_level": 0.05}
]

SEED_LANES = [
    {
        "name": "Shanghai-Yokohama-LA Lane (North Pacific Route)",
        "coordinates": [[31.2, 121.5], [35.4, 139.7], [38.0, 160.0], [38.0, -160.0], [35.0, -135.0], [33.7, -118.2]],
        "status": "OPEN"
    },
    {
        "name": "LA-Panama-Houston-New York (Panama Canal Route)",
        "coordinates": [[33.7, -118.2], [20.0, -110.0], [12.0, -90.0], [8.9, -79.5], [15.0, -78.0], [24.0, -88.0], [29.7, -95.3], [24.0, -82.0], [28.0, -79.0], [40.7, -74.0]],
        "status": "OPEN"
    },
    {
        "name": "New York-Rotterdam-Hamburg (North Atlantic Route)",
        "coordinates": [[40.7, -74.0], [42.0, -50.0], [46.0, -30.0], [49.0, -10.0], [50.0, -2.0], [51.9, 4.1], [53.5, 9.9]],
        "status": "OPEN"
    },
    {
        "name": "Rotterdam-Gibraltar-Port Said (Suez Approach)",
        "coordinates": [[51.9, 4.1], [50.0, -2.0], [48.0, -6.0], [36.1, -5.3], [37.0, 5.0], [35.0, 20.0], [31.3, 32.3]],
        "status": "OPEN"
    },
    {
        "name": "Port Said-Jebel Ali-Singapore (Suez Passage)",
        "coordinates": [[31.3, 32.3], [29.9, 32.5], [20.0, 38.0], [12.0, 43.0], [12.0, 50.0], [25.0, 55.1], [10.0, 65.0], [5.0, 80.0], [5.0, 95.0], [1.3, 103.8]],
        "status": "OPEN"
    },
    {
        "name": "Singapore-Shanghai (East Asia Corridor)",
        "coordinates": [[1.3, 103.8], [10.0, 110.0], [18.0, 115.0], [22.0, 120.0], [31.2, 121.5]],
        "status": "OPEN"
    },
    {
        "name": "Singapore-Mumbai (Indian Ocean Express)",
        "coordinates": [[1.3, 103.8], [5.0, 95.0], [8.0, 90.0], [5.0, 80.0], [12.0, 72.0], [19.0, 72.8]],
        "status": "OPEN"
    },
    {
        "name": "Mumbai-Cape Town (Indian Ocean Southern Route)",
        "coordinates": [[19.0, 72.8], [0.0, 65.0], [-15.0, 50.0], [-29.8, 31.0], [-33.9, 18.4]],
        "status": "OPEN"
    },
    {
        "name": "Cape Town-Rotterdam (Atlantic Cape Route)",
        "coordinates": [[-33.9, 18.4], [-20.0, 10.0], [0.0, -10.0], [15.0, -25.0], [38.0, -28.0], [36.1, -5.3], [48.0, -6.0], [51.9, 4.1]],
        "status": "OPEN"
    },
    {
        "name": "Santos-Cape Town (South Atlantic Route)",
        "coordinates": [[-23.9, -46.3], [-28.0, -20.0], [-32.0, 0.0], [-33.9, 18.4]],
        "status": "OPEN"
    },
    {
        "name": "Santos-Panama (South America East to West Route)",
        "coordinates": [[-23.9, -46.3], [-10.0, -35.0], [2.0, -45.0], [11.0, -60.0], [12.0, -70.0], [8.9, -79.5]],
        "status": "OPEN"
    },
    {
        "name": "Sydney-Singapore (Oceania Express)",
        "coordinates": [[-33.8, 151.2], [-20.0, 148.0], [-10.0, 140.0], [-8.0, 125.0], [-5.0, 112.0], [1.3, 103.8]],
        "status": "OPEN"
    },
    {
        "name": "Sydney-LA (South Pacific Route)",
        "coordinates": [[-33.8, 151.2], [-18.0, 178.0], [0.0, -165.0], [20.0, -157.0], [28.0, -140.0], [33.7, -118.2]],
        "status": "OPEN"
    }
]

SEED_VESSELS = [
    {"name": "Maersk Horizon", "type": "CONTAINER", "speed_knots": 18.5, "start_port": "Singapore", "dest_port": "Shanghai", "lane_name": "Singapore-Shanghai (East Asia Corridor)"},
    {"name": "Ever Given II", "type": "CONTAINER", "speed_knots": 15.0, "start_port": "Singapore", "dest_port": "Rotterdam", "lane_name": "Port Said-Jebel Ali-Singapore (Suez Passage)"},
    {"name": "Pacific Voyager", "type": "TANKER", "speed_knots": 13.5, "start_port": "Rotterdam", "dest_port": "New York", "lane_name": "New York-Rotterdam-Hamburg (North Atlantic Route)"},
    {"name": "Atlantic Spirit", "type": "CARGO", "speed_knots": 14.0, "start_port": "New York", "dest_port": "Los Angeles", "lane_name": "LA-Panama-Houston-New York (Panama Canal Route)"},
    {"name": "Cosco Glory", "type": "CONTAINER", "speed_knots": 17.0, "start_port": "Los Angeles", "dest_port": "Shanghai", "lane_name": "Shanghai-Yokohama-LA Lane (North Pacific Route)"},
    {"name": "MSC Amelia", "type": "CONTAINER", "speed_knots": 21.0, "start_port": "Shanghai", "dest_port": "Los Angeles", "lane_name": "Shanghai-Yokohama-LA Lane (North Pacific Route)"},
    {"name": "Hyundai Integrity", "type": "LNG_CARRIER", "speed_knots": 19.5, "start_port": "Port Said", "dest_port": "Jebel Ali", "lane_name": "Port Said-Jebel Ali-Singapore (Suez Passage)"},
    {"name": "CMA CGM Antoine", "type": "CONTAINER", "speed_knots": 16.5, "start_port": "Rotterdam", "dest_port": "Hamburg", "lane_name": "New York-Rotterdam-Hamburg (North Atlantic Route)"},
    {"name": "One Triton", "type": "CONTAINER", "speed_knots": 18.0, "start_port": "Yokohama", "dest_port": "Los Angeles", "lane_name": "Shanghai-Yokohama-LA Lane (North Pacific Route)"},
    {"name": "Zim Kingston", "type": "CARGO", "speed_knots": 14.5, "start_port": "New York", "dest_port": "Houston", "lane_name": "LA-Panama-Houston-New York (Panama Canal Route)"},
    {"name": "Valemax Brasil", "type": "CARGO", "speed_knots": 12.0, "start_port": "Santos", "dest_port": "Rotterdam", "lane_name": "Cape Town-Rotterdam (Atlantic Cape Route)"},
    {"name": "HMM Algeciras", "type": "CONTAINER", "speed_knots": 22.0, "start_port": "Singapore", "dest_port": "Shanghai", "lane_name": "Singapore-Shanghai (East Asia Corridor)"},
    {"name": "Nordic Hercules", "type": "TANKER", "speed_knots": 13.0, "start_port": "Rotterdam", "dest_port": "Gibraltar", "lane_name": "Rotterdam-Gibraltar-Port Said (Suez Approach)"},
    {"name": "Stolt Gemini", "type": "TANKER", "speed_knots": 14.0, "start_port": "Singapore", "dest_port": "Mumbai", "lane_name": "Singapore-Mumbai (Indian Ocean Express)"},
    {"name": "Suezmax Monarch", "type": "TANKER", "speed_knots": 15.5, "start_port": "Port Said", "dest_port": "Jebel Ali", "lane_name": "Port Said-Jebel Ali-Singapore (Suez Passage)"},
    {"name": "USS Mercy", "type": "CARGO", "speed_knots": 17.5, "start_port": "Sydney", "dest_port": "Singapore", "lane_name": "Sydney-Singapore (Oceania Express)"},
    {"name": "Global Hope", "type": "CARGO", "speed_knots": 13.0, "start_port": "Singapore", "dest_port": "Mumbai", "lane_name": "Singapore-Mumbai (Indian Ocean Express)"},
    {"name": "Alaskan Frontier", "type": "TANKER", "speed_knots": 16.0, "start_port": "Los Angeles", "dest_port": "Yokohama", "lane_name": "Shanghai-Yokohama-LA Lane (North Pacific Route)"},
    {"name": "Pacific Explorer", "type": "CARGO", "speed_knots": 15.0, "start_port": "Sydney", "dest_port": "Los Angeles", "lane_name": "Sydney-LA (South Pacific Route)"},
    {"name": "Rotterdam Express", "type": "CONTAINER", "speed_knots": 19.0, "start_port": "New York", "dest_port": "Rotterdam", "lane_name": "New York-Rotterdam-Hamburg (North Atlantic Route)"},
    {"name": "Santos Monarch", "type": "CARGO", "speed_knots": 14.0, "start_port": "Santos", "dest_port": "Cape Town", "lane_name": "Santos-Cape Town (South Atlantic Route)"},
    {"name": "Shanghai Pioneer", "type": "LNG_CARRIER", "speed_knots": 20.0, "start_port": "Shanghai", "dest_port": "Yokohama", "lane_name": "Shanghai-Yokohama-LA Lane (North Pacific Route)"},
    {"name": "Arabian Star", "type": "LNG_CARRIER", "speed_knots": 18.0, "start_port": "Jebel Ali", "dest_port": "Mumbai", "lane_name": "Port Said-Jebel Ali-Singapore (Suez Passage)"},
    {"name": "Timor Sentinel", "type": "CARGO", "speed_knots": 24.0, "start_port": "Sydney", "dest_port": "Singapore", "lane_name": "Sydney-Singapore (Oceania Express)"},
    {"name": "Cape Hope Voyager", "type": "CARGO", "speed_knots": 13.5, "start_port": "Mumbai", "dest_port": "Cape Town", "lane_name": "Mumbai-Cape Town (Indian Ocean Southern Route)"}
]

def seed_database(db: Session):
    """
    Seeds initial ports, lanes, customs buffers, and vessels if database is empty.
    """
    # 1. Seed Ports
    if db.query(models.Port).count() == 0:
        logger.info("Seeding ports...")
        for port_data in SEED_PORTS:
            port = models.Port(**port_data)
            db.add(port)
        db.commit()

    # Get ports mappings
    ports = {p.name: p for p in db.query(models.Port).all()}

    # 2. Seed Customs Buffers
    if db.query(models.CustomsBuffer).count() == 0:
        logger.info("Seeding customs buffers...")
        for port_name, port in ports.items():
            buffer = models.CustomsBuffer(
                port_id=port.id,
                radius_km=70.0,
                average_clearance_hours=12.0 + (port.congestion_level * 24.0),
                status="NORMAL"
            )
            db.add(buffer)
        db.commit()

    # 3. Seed Lanes
    if db.query(models.ShippingLane).count() == 0:
        logger.info("Seeding shipping lanes...")
        for lane_data in SEED_LANES:
            lane = models.ShippingLane(
                name=lane_data["name"],
                coordinates_json=json.dumps(lane_data["coordinates"]),
                status=lane_data["status"],
                current_penalty=0.0
            )
            db.add(lane)
        db.commit()

    # Get lanes mappings
    lanes = {l.name: l for l in db.query(models.ShippingLane).all()}

    # 4. Seed Vessels
    if db.query(models.Vessel).count() == 0:
        logger.info("Seeding vessels...")
        for v_data in SEED_VESSELS:
            start_p = ports[v_data["start_port"]]
            dest_p = ports[v_data["dest_port"]]
            lane = lanes[v_data["lane_name"]]
            
            # Use lane coordinates as path
            path = json.loads(lane.coordinates_json)
            
            vessel = models.Vessel(
                name=v_data["name"],
                type=v_data["type"],
                speed_knots=v_data["speed_knots"],
                latitude=start_p.latitude,
                longitude=start_p.longitude,
                destination_port_id=dest_p.id,
                status="SAILING",
                route_path_json=json.dumps(path),
                current_lane_id=lane.id
            )
            db.add(vessel)
        db.commit()

async def run_simulation_loop():
    """
    Main background loop simulating vessel updates and spatial penalty checks.
    """
    logger.info("Starting simulator background loop...")
    await asyncio.sleep(5)  # Let server boot first

    while True:
        try:
            db = SessionLocal()
            
            # Ensure DB is seeded
            seed_database(db)

            # Fetch active hazards
            hazards = await fetch_global_hazards()
            
            # 1. Update Lane Penalties
            lanes = db.query(models.ShippingLane).all()
            for lane in lanes:
                coords = json.loads(lane.coordinates_json)
                penalty = await calculate_lane_penalty(coords, hazards)
                
                # Check for alert trigger if penalty transitioned to very high
                old_penalty = lane.current_penalty
                lane.current_penalty = penalty
                if penalty > 45.0:
                    lane.status = "CONGESTED"
                if penalty > 75.0:
                    lane.status = "BLOCKED"
                if penalty <= 45.0:
                    lane.status = "OPEN"
                
                # If penalty increased significantly, log an alert
                if penalty > 40.0 and old_penalty <= 40.0:
                    alert = models.Alert(
                        type="HAZARD",
                        severity="HIGH" if penalty > 70.0 else "MEDIUM",
                        description=f"Critical transit penalty on {lane.name} (Risk index: {penalty})",
                        latitude=coords[len(coords)//2][0],
                        longitude=coords[len(coords)//2][1]
                    )
                    db.add(alert)
                    db.flush()
                    await stream_update(f"alerts/{alert.id}", {
                        "id": alert.id,
                        "type": alert.type,
                        "severity": alert.severity,
                        "description": alert.description,
                        "latitude": alert.latitude,
                        "longitude": alert.longitude,
                        "reported_at": alert.reported_at.isoformat()
                    })

            # Save lane updates
            db.commit()
            
            # Stream lane updates to Firebase
            for lane in lanes:
                await stream_update(f"lanes/{lane.id}", {
                    "id": lane.id,
                    "name": lane.name,
                    "status": lane.status,
                    "current_penalty": lane.current_penalty
                })

            # 2. Update Vessels Telemetry
            vessels = db.query(models.Vessel).all()
            for vessel in vessels:
                if not vessel.route_path_json:
                    continue
                
                path = json.loads(vessel.route_path_json)
                if not path:
                    continue

                dest_port = vessel.destination_port
                if not dest_port:
                    continue

                # If vessel is moored, count down or randomly depart
                if vessel.status == "MOORED":
                    # Simulating arrival completion: randomly redeploy to another port
                    import random
                    available_ports = db.query(models.Port).filter(models.Port.id != dest_port.id).all()
                    if available_ports and random.random() < 0.15: # 15% chance to set off
                        new_dest = random.choice(available_ports)
                        logger.info(f"Redeploying moored vessel {vessel.name} from {dest_port.name} to {new_dest.name}")
                        
                        # Generate route
                        new_path = await get_osrm_route(
                            vessel.latitude, vessel.longitude, new_dest.latitude, new_dest.longitude
                        )
                        
                        vessel.destination_port_id = new_dest.id
                        vessel.route_path_json = json.dumps(new_path)
                        vessel.status = "SAILING"
                        vessel.ai_mitigation_brief = None
                        db.flush()
                    continue

                # Check proximity to destination
                dist_to_dest = haversine_distance(
                    vessel.latitude, vessel.longitude, dest_port.latitude, dest_port.longitude
                )

                if dist_to_dest <= 5.0: # Arrived
                    vessel.status = "MOORED"
                    vessel.latitude = dest_port.latitude
                    vessel.longitude = dest_port.longitude
                    db.flush()
                    
                    alert = models.Alert(
                        type="CUSTOMS",
                        severity="LOW",
                        description=f"Vessel {vessel.name} moored at port {dest_port.name}. Entering customs clearance.",
                        latitude=vessel.latitude,
                        longitude=vessel.longitude
                    )
                    db.add(alert)
                    db.flush()
                    await stream_update(f"alerts/{alert.id}", {
                        "id": alert.id,
                        "type": alert.type,
                        "severity": alert.severity,
                        "description": alert.description,
                        "latitude": alert.latitude,
                        "longitude": alert.longitude,
                        "reported_at": alert.reported_at.isoformat()
                    })
                    continue

                # Check if inside customs buffer
                buffer = dest_port.customs_buffers[0] if dest_port.customs_buffers else None
                buffer_radius = buffer.radius_km if buffer else 70.0
                
                if dist_to_dest <= buffer_radius:
                    # Slow down for customs queue
                    vessel.status = "ARRIVING"
                    speed_factor = 0.3
                else:
                    vessel.status = "SAILING"
                    speed_factor = 1.0

                # Check current lane risk and trigger AI rerouting if severe hazard detected
                current_lane = vessel.current_lane
                if current_lane and current_lane.current_penalty > 55.0 and vessel.status != "REROUTED":
                    # Fetch lane coordinates to describe block
                    disruption_info = f"Severe hazard/weather blockage detected along lane {current_lane.name} with risk penalty {current_lane.current_penalty}"
                    
                    # Generate Gemini LLM decision mitigation
                    logger.info(f"Triggering Gemini mitigation for vessel {vessel.name} due to high lane risk.")
                    brief_data = await generate_mitigation_brief(
                        vessel_name=vessel.name,
                        vessel_type=vessel.type,
                        current_lat=vessel.latitude,
                        current_lon=vessel.longitude,
                        destination_port=dest_port.name,
                        disruption_description=disruption_info,
                        severity="HIGH"
                    )
                    
                    # Reroute vessel: append detour message and change status
                    vessel.status = "REROUTED"
                    vessel.ai_mitigation_brief = json.dumps(brief_data)
                    
                    # Log alert
                    alert = models.Alert(
                        type="WEATHER" if "weather" in disruption_info.lower() else "HAZARD",
                        severity="HIGH",
                        description=f"AI mitigation activated for {vessel.name}: {brief_data['recommended_action']}",
                        latitude=vessel.latitude,
                        longitude=vessel.longitude
                    )
                    db.add(alert)
                    db.flush()
                    await stream_update(f"alerts/{alert.id}", {
                        "id": alert.id,
                        "type": alert.type,
                        "severity": alert.severity,
                        "description": alert.description,
                        "latitude": alert.latitude,
                        "longitude": alert.longitude,
                        "reported_at": alert.reported_at.isoformat()
                    })

                # Move vessel coordinates (simulate progression)
                # 1 knot = 1.852 km/h
                # Let's say each simulation step represents 4 hours of sailing to make movement visible
                hours_per_step = 4.0
                distance_moved = vessel.speed_knots * 1.852 * hours_per_step * speed_factor
                
                # Find current point in path and step forward
                # Simple progress: find the coordinate in the list closest to vessel, and move towards the next coordinate
                min_dist = float('inf')
                closest_idx = 0
                for idx, pt in enumerate(path):
                    d = haversine_distance(vessel.latitude, vessel.longitude, pt[0], pt[1])
                    if d < min_dist:
                        min_dist = d
                        closest_idx = idx
                
                # Target coordinate is next point in route path
                target_idx = min(closest_idx + 1, len(path) - 1)
                target_pt = path[target_idx]
                
                # If we've reached the end of the path but aren't moored, point straight to destination port
                if target_idx == len(path) - 1:
                    target_pt = [dest_port.latitude, dest_port.longitude]

                dist_to_target = haversine_distance(vessel.latitude, vessel.longitude, target_pt[0], target_pt[1])
                
                if dist_to_target <= distance_moved:
                    # Step all the way to target coordinate
                    vessel.latitude = target_pt[0]
                    vessel.longitude = target_pt[1]
                else:
                    # Interpolate movement
                    ratio = distance_moved / dist_to_target
                    vessel.latitude = vessel.latitude + ratio * (target_pt[0] - vessel.latitude)
                    vessel.longitude = vessel.longitude + ratio * (target_pt[1] - vessel.longitude)

                db.flush()

            db.commit()

            # Stream vessel updates to Firebase/SSE
            for vessel in db.query(models.Vessel).all():
                await stream_update(f"vessels/{vessel.id}", {
                    "id": vessel.id,
                    "name": vessel.name,
                    "type": vessel.type,
                    "latitude": vessel.latitude,
                    "longitude": vessel.longitude,
                    "destination_port": vessel.destination_port.name if vessel.destination_port else "",
                    "speed_knots": vessel.speed_knots,
                    "status": vessel.status,
                    "ai_mitigation_brief": vessel.ai_mitigation_brief,
                    "updated_at": vessel.updated_at.isoformat() if vessel.updated_at else datetime.utcnow().isoformat()
                })
                
            db.close()
        except Exception as e:
            logger.error(f"Error in simulator execution: {e}", exc_info=True)
            if 'db' in locals():
                db.close()
                
        await asyncio.sleep(8)  # Run simulation every 8 seconds
