"""Vendor bot state management service.

Tracks bot pause state and auto-silence for each vendor.
"""
from datetime import datetime, timedelta
from typing import Dict, Optional
import os

# In-memory store (use Supabase in production)
# Structure: {vendor_id: {is_paused, paused_at, customer_activity: {customer_id: last_active_at}}}
VENDOR_STATE: Dict[str, dict] = {}

# Auto-silence duration (30 minutes)
AUTO_SILENCE_DURATION_MINUTES = 30


def get_vendor_state(vendor_id: str = "default") -> dict:
    """Get or create vendor state."""
    if vendor_id not in VENDOR_STATE:
        VENDOR_STATE[vendor_id] = {
            "is_paused": False,
            "paused_at": None,
            "customer_activity": {}
        }
    return VENDOR_STATE[vendor_id]


def is_bot_paused(vendor_id: str = "default") -> bool:
    """Check if bot is globally paused for this vendor."""
    state = get_vendor_state(vendor_id)
    return state.get("is_paused", False)


def set_bot_paused(vendor_id: str = "default", paused: bool = True) -> dict:
    """Toggle global bot pause state."""
    state = get_vendor_state(vendor_id)
    state["is_paused"] = paused
    state["paused_at"] = datetime.utcnow().isoformat() if paused else None
    return {
        "is_paused": state["is_paused"],
        "paused_at": state["paused_at"]
    }


def record_vendor_activity(vendor_id: str, customer_id: str) -> dict:
    """
    Record that vendor is active in a conversation.
    This triggers auto-silence for 30 minutes.
    """
    state = get_vendor_state(vendor_id)
    now = datetime.utcnow()
    state["customer_activity"][customer_id] = now.isoformat()
    return {
        "customer_id": customer_id,
        "silenced_until": (now + timedelta(minutes=AUTO_SILENCE_DURATION_MINUTES)).isoformat()
    }


def is_auto_silenced(vendor_id: str, customer_id: str) -> bool:
    """
    Check if bot should be silent for this customer.
    Returns True if vendor was active in this conversation within the last 30 minutes.
    """
    state = get_vendor_state(vendor_id)
    activity = state.get("customer_activity", {})
    
    if customer_id not in activity:
        return False
    
    last_active_str = activity[customer_id]
    try:
        last_active = datetime.fromisoformat(last_active_str)
        silence_until = last_active + timedelta(minutes=AUTO_SILENCE_DURATION_MINUTES)
        return datetime.utcnow() < silence_until
    except (ValueError, TypeError):
        return False


def should_bot_respond(vendor_id: str, customer_id: str) -> tuple[bool, str]:
    """
    Check if bot should respond to this customer.
    Returns (should_respond, reason).
    """
    # Check global pause first
    if is_bot_paused(vendor_id):
        return False, "Bot is globally paused"
    
    # Check auto-silence
    if is_auto_silenced(vendor_id, customer_id):
        return False, f"Auto-silenced (vendor was active within {AUTO_SILENCE_DURATION_MINUTES} mins)"
    
    return True, "Bot is active"


def get_bot_status(vendor_id: str = "default") -> dict:
    """Get full bot status for dashboard display."""
    state = get_vendor_state(vendor_id)
    
    # Count active silences
    active_silences = 0
    now = datetime.utcnow()
    for customer_id, last_active_str in state.get("customer_activity", {}).items():
        try:
            last_active = datetime.fromisoformat(last_active_str)
            if now < last_active + timedelta(minutes=AUTO_SILENCE_DURATION_MINUTES):
                active_silences += 1
        except (ValueError, TypeError):
            pass
    
    return {
        "is_paused": state.get("is_paused", False),
        "paused_at": state.get("paused_at"),
        "active_silences": active_silences,
        "auto_silence_duration_minutes": AUTO_SILENCE_DURATION_MINUTES
    }


def clear_expired_silences(vendor_id: str = "default") -> int:
    """Clean up expired auto-silence entries. Returns count of cleared entries."""
    state = get_vendor_state(vendor_id)
    activity = state.get("customer_activity", {})
    now = datetime.utcnow()
    
    expired = []
    for customer_id, last_active_str in activity.items():
        try:
            last_active = datetime.fromisoformat(last_active_str)
            if now >= last_active + timedelta(minutes=AUTO_SILENCE_DURATION_MINUTES):
                expired.append(customer_id)
        except (ValueError, TypeError):
            expired.append(customer_id)
    
    for customer_id in expired:
        del activity[customer_id]
    
    return len(expired)
