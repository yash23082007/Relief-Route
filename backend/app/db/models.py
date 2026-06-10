import uuid
from sqlalchemy import Column, String, Float, ForeignKey, Text, DateTime, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Port(Base):
    __tablename__ = "ports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    congestion_level = Column(Float, default=0.0)  # 0.0 to 1.0
    status = Column(String, default="NORMAL")       # NORMAL, CONGESTED, BLOCKED

    # Relationships
    customs_buffers = relationship("CustomsBuffer", back_populates="port", cascade="all, delete-orphan")
    vessels = relationship("Vessel", back_populates="destination_port")

class ShippingLane(Base):
    __tablename__ = "shipping_lanes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    coordinates_json = Column(Text, nullable=False)  # JSON array of [lat, lon] coordinates
    status = Column(String, default="OPEN")         # OPEN, CONGESTED, BLOCKED
    current_penalty = Column(Float, default=0.0)    # Weighted routing penalty score

    vessels = relationship("Vessel", back_populates="current_lane")

class CustomsBuffer(Base):
    __tablename__ = "customs_buffers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    port_id = Column(String, ForeignKey("ports.id"), nullable=False)
    radius_km = Column(Float, default=50.0)
    average_clearance_hours = Column(Float, default=12.0)
    status = Column(String, default="NORMAL")        # NORMAL, DELAYED, CRITICAL

    port = relationship("Port", back_populates="customs_buffers")

class Vessel(Base):
    __tablename__ = "vessels"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    type = Column(String, default="CONTAINER")      # CONTAINER, TANKER, CARGO
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    destination_port_id = Column(String, ForeignKey("ports.id"), nullable=True)
    speed_knots = Column(Float, default=15.0)
    status = Column(String, default="SAILING")       # SAILING, MOORED, WARNING, REROUTED
    route_path_json = Column(Text, nullable=True)   # JSON array of [lat, lon] representing planned path
    current_lane_id = Column(String, ForeignKey("shipping_lanes.id"), nullable=True)
    ai_mitigation_brief = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    destination_port = relationship("Port", back_populates="vessels")
    current_lane = relationship("ShippingLane", back_populates="vessels")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    type = Column(String, nullable=False)           # WEATHER, HAZARD, TRAFFIC, CUSTOMS
    severity = Column(String, default="LOW")        # LOW, MEDIUM, HIGH
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    reported_at = Column(DateTime, default=func.now())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, nullable=False, unique=True)
    password = Column(String, nullable=False)  # Plaintext password for demo simplicity
    role = Column(String, default="operator")  # admin, operator

