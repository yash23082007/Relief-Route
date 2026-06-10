import os
import json
import asyncio
import logging
import contextlib
from typing import List
from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from .db.database import get_db, engine, SessionLocal
from .db import models
from .services.simulator import run_simulation_loop, seed_database
from .services.firebase_service import register_sse_listener, unregister_sse_listener, stream_update
from .services.gemini_service import generate_mitigation_brief

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Pydantic schemas for request validation
class HazardSimulationRequest(BaseModel):
    title: str
    hazard_type: str  # wildfire, storm, volcano, earthquake, traffic
    latitude: float
    longitude: float
    radius_km: float = 80.0
    severity: str = "MEDIUM"

class RerouteRequest(BaseModel):
    custom_action: str = ""

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    logger.info("Initializing database tables...")
    models.Base.metadata.create_all(bind=engine)
    
    # Pre-seed DB
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
        
    # Start the simulation background loop
    sim_task = asyncio.create_task(run_simulation_loop())
    yield
    # Shutdown logic
    logger.info("Stopping simulation task...")
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="ReliefRoute Logistics Risk Control API",
    description="FastAPI backend for monitoring shipping lanes, port networks, and customs buffers",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AuthRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    email: str
    password: str
    role: str = "operator"

@app.post("/api/auth/signup")
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    user = models.User(
        email=payload.email,
        password=payload.password,
        role=payload.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "user": {
            "email": user.email,
            "role": user.role,
            "id": user.id
        },
        "session": {
            "access_token": f"mock-token-{user.id}",
            "expires_in": 3600
        }
    }

@app.post("/api/auth/login")
def login(payload: AuthRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.email == payload.email,
        models.User.password == payload.password
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "user": {
            "email": user.email,
            "role": user.role,
            "id": user.id
        },
        "session": {
            "access_token": f"mock-token-{user.id}",
            "expires_in": 3600
        }
    }

# Endpoints
@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "ReliefRoute Logistics Engine",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/ports")
def get_ports(db: Session = Depends(get_db)):
    ports = db.query(models.Port).all()
    return ports

@app.get("/api/lanes")
def get_lanes(db: Session = Depends(get_db)):
    lanes = db.query(models.ShippingLane).all()
    # Parse JSON list inside coordinates_json
    result = []
    for l in lanes:
        result.append({
            "id": l.id,
            "name": l.name,
            "coordinates": json.loads(l.coordinates_json),
            "status": l.status,
            "current_penalty": l.current_penalty
        })
    return result

@app.get("/api/customs-buffers")
def get_customs_buffers(db: Session = Depends(get_db)):
    buffers = db.query(models.CustomsBuffer).all()
    return buffers

@app.get("/api/vessels")
def get_vessels(db: Session = Depends(get_db)):
    vessels = db.query(models.Vessel).all()
    result = []
    for v in vessels:
        result.append({
            "id": v.id,
            "name": v.name,
            "type": v.type,
            "latitude": v.latitude,
            "longitude": v.longitude,
            "dest_lat": v.destination_port.latitude if v.destination_port else 0.0,
            "dest_lon": v.destination_port.longitude if v.destination_port else 0.0,
            "destination_port": v.destination_port.name if v.destination_port else "",
            "speed_knots": v.speed_knots,
            "status": v.status,
            "ai_mitigation_brief": json.loads(v.ai_mitigation_brief) if v.ai_mitigation_brief else None,
            "updated_at": v.updated_at.isoformat() if v.updated_at else None
        })
    return result

@app.get("/api/alerts")
def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(models.Alert).order_by(models.Alert.reported_at.desc()).limit(50).all()
    return alerts

@app.post("/api/simulate/hazard")
async def simulate_hazard(payload: HazardSimulationRequest, db: Session = Depends(get_db)):
    """
    Simulates a hazard in real-time, inserting an Alert and triggering lane recalculation.
    """
    logger.info(f"Injecting simulated hazard: {payload.title}")
    
    # Save alert to SQL database
    alert = models.Alert(
        type=payload.hazard_type.upper(),
        severity=payload.severity.upper(),
        description=f"SIMULATED: {payload.title} active in radius {payload.radius_km}km",
        latitude=payload.latitude,
        longitude=payload.longitude,
        reported_at=datetime.utcnow()
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    # Stream alert event immediately
    alert_data = {
        "id": alert.id,
        "type": alert.type,
        "severity": alert.severity,
        "description": alert.description,
        "latitude": alert.latitude,
        "longitude": alert.longitude,
        "reported_at": alert.reported_at.isoformat()
    }
    await stream_update(f"alerts/{alert.id}", alert_data)
    
    # Force lanes recalculation (performed by background loop quickly, but broadcast alert immediately)
    return {"message": "Hazard injected successfully", "alert": alert_data}

@app.post("/api/vessels/{vessel_id}/reroute")
async def trigger_vessel_reroute(vessel_id: str, payload: RerouteRequest, db: Session = Depends(get_db)):
    """
    Manually triggers Gemini AI mitigation advice and updates vessel status to REROUTED.
    """
    vessel = db.query(models.Vessel).filter(models.Vessel.id == vessel_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
        
    dest_name = vessel.destination_port.name if vessel.destination_port else "Unknown Port"
    disruption = payload.custom_action or "Manual operator routing instruction triggered."
    
    # Call Gemini (or rule-based fallback)
    brief = await generate_mitigation_brief(
        vessel_name=vessel.name,
        vessel_type=vessel.type,
        current_lat=vessel.latitude,
        current_lon=vessel.longitude,
        destination_port=dest_name,
        disruption_description=disruption,
        severity="HIGH"
    )
    
    vessel.status = "REROUTED"
    vessel.ai_mitigation_brief = json.dumps(brief)
    db.commit()
    
    # Stream vessel update
    vessel_data = {
        "id": vessel.id,
        "name": vessel.name,
        "type": vessel.type,
        "latitude": vessel.latitude,
        "longitude": vessel.longitude,
        "dest_lat": vessel.destination_port.latitude if vessel.destination_port else 0.0,
        "dest_lon": vessel.destination_port.longitude if vessel.destination_port else 0.0,
        "destination_port": dest_name,
        "speed_knots": vessel.speed_knots,
        "status": vessel.status,
        "ai_mitigation_brief": brief,
        "updated_at": vessel.updated_at.isoformat() if vessel.updated_at else datetime.utcnow().isoformat()
    }
    await stream_update(f"vessels/{vessel.id}", vessel_data)
    
    # Add Alert logs
    alert = models.Alert(
        type="TRAFFIC",
        severity="MEDIUM",
        description=f"Operator manually rerouted {vessel.name}: {brief['recommended_action']}",
        latitude=vessel.latitude,
        longitude=vessel.longitude
    )
    db.add(alert)
    db.commit()
    
    await stream_update(f"alerts/{alert.id}", {
        "id": alert.id,
        "type": alert.type,
        "severity": alert.severity,
        "description": alert.description,
        "latitude": alert.latitude,
        "longitude": alert.longitude,
        "reported_at": alert.reported_at.isoformat()
    })
    
    return {"message": f"Rerouted {vessel.name}", "vessel": vessel_data}

@app.post("/api/hazards/clear")
def clear_hazards(db: Session = Depends(get_db)):
    db.query(models.Alert).delete()
    db.commit()
    return {"message": "Hazards cleared"}

@app.post("/api/mission_logs/clear")
def clear_logs(db: Session = Depends(get_db)):
    db.query(models.Alert).delete()
    db.commit()
    return {"message": "Logs cleared"}

@app.post("/api/convoys/reset")
def reset_convoys_endpoint(db: Session = Depends(get_db)):
    db.query(models.Alert).delete()
    db.query(models.Vessel).delete()
    db.query(models.ShippingLane).delete()
    db.query(models.CustomsBuffer).delete()
    db.query(models.Port).delete()
    db.commit()
    seed_database(db)
    return {"message": "Simulation reset completed"}

@app.get("/api/stream")
async def sse_stream(request: Request):
    """
    Exposes a Server-Sent Events stream for push notifications to React clients.
    """
    queue = register_sse_listener()
    
    async def event_generator():
        try:
            # Yield initial keep-alive
            yield f"data: {json.dumps({'event': 'connected'})}\n\n"
            
            while True:
                # Disconnect check
                if await request.is_disconnected():
                    logger.info("SSE client disconnected")
                    break
                    
                try:
                    # Non-blocking fetch with 10s timeout to allow periodic keep-alive
                    payload = await asyncio.wait_for(queue.get(), timeout=10.0)
                    yield f"data: {json.dumps(payload)}\n\n"
                except asyncio.TimeoutError:
                    # Send empty ping to keep connection alive
                    yield "data: {\"ping\": true}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            unregister_sse_listener(queue)
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")
