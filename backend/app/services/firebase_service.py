import os
import httpx
import logging
import asyncio
from typing import List

logger = logging.getLogger(__name__)

FIREBASE_DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL")
FIREBASE_SECRET = os.getenv("FIREBASE_SECRET")

# Cleanup URL if trailing slash is present
if FIREBASE_DATABASE_URL and FIREBASE_DATABASE_URL.endswith("/"):
    FIREBASE_DATABASE_URL = FIREBASE_DATABASE_URL[:-1]

# Local SSE Listeners (Queues)
_sse_queues: List[asyncio.Queue] = []

def register_sse_listener() -> asyncio.Queue:
    """
    Registers a client SSE queue for receiving real-time broadcasts.
    """
    queue = asyncio.Queue()
    _sse_queues.append(queue)
    return queue

def unregister_sse_listener(queue: asyncio.Queue):
    """
    Removes an SSE queue listener.
    """
    if queue in _sse_queues:
        _sse_queues.remove(queue)

async def stream_update(path: str, data: dict):
    """
    Dual-mode pipeline sync:
    1. Write to Firebase Realtime Database via REST if configured.
    2. Broadcast to all active local SSE client queues.
    """
    # 1. Sync to Firebase
    if FIREBASE_DATABASE_URL:
        # Construct URL
        url = f"{FIREBASE_DATABASE_URL}/{path}.json"
        params = {}
        if FIREBASE_SECRET:
            params["auth"] = FIREBASE_SECRET
            
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                # Use PUT to set or PATCH to merge
                response = await client.patch(url, json=data, params=params)
                if response.status_code not in (200, 201, 204):
                    logger.warning(f"Firebase RTDB write returned code {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Failed to sync to Firebase RTDB: {e}")
            
    # 2. Local SSE Broadcast
    payload = {
        "path": path,
        "data": data
    }
    
    # Broadcast to all active queues
    if _sse_queues:
        for queue in _sse_queues:
            await queue.put(payload)
            
    logger.debug(f"Streamed update to {path}: {data}")
