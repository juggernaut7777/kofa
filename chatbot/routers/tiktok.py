"""TikTok Shop API integration for KOFA (Placeholder).

Note: TikTok's DM API is limited. This router tracks TikTok Shop orders
and provides message tracking for analytics.
"""
from fastapi import APIRouter, Request, Response, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json
import os
from datetime import datetime

router = APIRouter()

# Verification token for webhook setup
VERIFY_TOKEN = os.getenv("TIKTOK_VERIFY_TOKEN", "kofa_tiktok_verify_token")

# Store for tracking messages (for analytics)
TIKTOK_MESSAGES: List[dict] = []


class TikTokMessage(BaseModel):
    """TikTok message/event structure."""
    user_id: str
    message_id: str
    text: str
    timestamp: str


@router.get("/webhook")
async def verify_webhook(request: Request):
    """
    TikTok webhook verification endpoint.
    """
    params = request.query_params
    challenge = params.get("challenge")
    
    if challenge:
        print(f"✅ TikTok webhook verified")
        return Response(content=challenge, media_type="text/plain")
    
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def receive_webhook(request: Request):
    """
    Receive TikTok Shop events.
    
    Note: TikTok Shop API focuses on order events, not DMs.
    DM automation is not publicly available as of Dec 2024.
    """
    try:
        body = await request.json()
        
        print(f"🎵 TikTok webhook received: {json.dumps(body, indent=2)}")
        
        # Track event for analytics
        event_type = body.get("type", "unknown")
        
        TIKTOK_MESSAGES.append({
            "platform": "tiktok",
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return {"status": "received", "event_type": event_type}
        
    except Exception as e:
        print(f"❌ Error processing TikTok webhook: {e}")
        return {"status": "error", "detail": str(e)}


def track_message(user_id: str, message_type: str):
    """Track message for analytics."""
    TIKTOK_MESSAGES.append({
        "platform": "tiktok",
        "customer_id": user_id,
        "message_type": message_type,
        "timestamp": datetime.utcnow().isoformat()
    })


# Analytics endpoint
@router.get("/stats")
async def get_tiktok_stats():
    """Get TikTok messaging/event statistics."""
    customer_messages = [m for m in TIKTOK_MESSAGES if m.get("message_type") == "customer"]
    
    return {
        "platform": "tiktok",
        "total_events": len(TIKTOK_MESSAGES),
        "customer_interactions": len(customer_messages),
        "note": "TikTok DM API is limited - tracking Shop events only"
    }


# Manual tracking endpoint (for vendors to log TikTok interactions)
class TikTokInteraction(BaseModel):
    """Manual TikTok interaction log."""
    customer_username: str
    interaction_type: str  # "inquiry", "sale", "support"
    notes: Optional[str] = None


@router.post("/log-interaction")
async def log_tiktok_interaction(interaction: TikTokInteraction):
    """
    Manually log a TikTok interaction.
    
    Since TikTok DM API is limited, vendors can manually log
    interactions for analytics purposes.
    """
    TIKTOK_MESSAGES.append({
        "platform": "tiktok",
        "customer_id": interaction.customer_username,
        "message_type": interaction.interaction_type,
        "notes": interaction.notes,
        "manual": True,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    return {
        "status": "success",
        "message": f"TikTok interaction with @{interaction.customer_username} logged"
    }


# Test endpoint
@router.post("/test")
async def test_event(user_id: str, event_type: str = "message"):
    """Test endpoint to simulate a TikTok event."""
    track_message(user_id, event_type)
    
    return {"status": "test event logged", "user_id": user_id, "event_type": event_type}
