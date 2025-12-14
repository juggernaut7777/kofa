"""Instagram Messenger API integration for KOFA.

Handles incoming DMs and sends automated replies via Instagram Graph API.
"""
from fastapi import APIRouter, Request, Response, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json
import os
from datetime import datetime

router = APIRouter()

# Verification token for webhook setup
VERIFY_TOKEN = os.getenv("INSTAGRAM_VERIFY_TOKEN", "kofa_instagram_verify_token")

# Store for tracking messages (for analytics)
INSTAGRAM_MESSAGES: List[dict] = []


class InstagramMessage(BaseModel):
    """Incoming Instagram message structure."""
    sender_id: str
    message_id: str
    text: str
    timestamp: str


class InstagramWebhookPayload(BaseModel):
    """Instagram webhook payload structure."""
    object: str
    entry: List[dict]


@router.get("/webhook")
async def verify_webhook(request: Request):
    """
    Instagram webhook verification endpoint.
    
    Meta sends a GET request with:
    - hub.mode: 'subscribe'
    - hub.verify_token: Your verification token
    - hub.challenge: A challenge string to return
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    if mode == "subscribe" and token == VERIFY_TOKEN:
        print(f"✅ Instagram webhook verified successfully")
        return Response(content=challenge, media_type="text/plain")
    else:
        print(f"❌ Instagram webhook verification failed: mode={mode}, token={token}")
        raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def receive_webhook(request: Request):
    """
    Receive incoming Instagram messages.
    
    Routes messages to the chatbot for processing.
    """
    try:
        body = await request.json()
        
        print(f"📸 Instagram webhook received: {json.dumps(body, indent=2)}")
        
        # Parse the message
        messages = extract_messages(body)
        
        for message in messages:
            # Track for analytics
            track_message(message, "customer")
            
            # Process each message through the chatbot
            await process_instagram_message(message)
        
        return {"status": "received", "messages_processed": len(messages)}
        
    except Exception as e:
        print(f"❌ Error processing Instagram webhook: {e}")
        return {"status": "error", "detail": str(e)}


def extract_messages(payload: dict) -> List[InstagramMessage]:
    """Extract messages from Instagram webhook payload."""
    messages = []
    
    try:
        entries = payload.get("entry", [])
        
        for entry in entries:
            # Instagram uses 'messaging' array
            messaging = entry.get("messaging", [])
            
            for msg_event in messaging:
                sender = msg_event.get("sender", {})
                message = msg_event.get("message", {})
                
                if message.get("text"):
                    messages.append(InstagramMessage(
                        sender_id=sender.get("id", ""),
                        message_id=message.get("mid", ""),
                        text=message.get("text", ""),
                        timestamp=str(msg_event.get("timestamp", ""))
                    ))
    
    except Exception as e:
        print(f"Error extracting Instagram messages: {e}")
    
    return messages


def track_message(message: InstagramMessage, message_type: str):
    """Track message for analytics."""
    INSTAGRAM_MESSAGES.append({
        "platform": "instagram",
        "customer_id": message.sender_id,
        "message_type": message_type,
        "timestamp": datetime.utcnow().isoformat()
    })


async def process_instagram_message(message: InstagramMessage):
    """
    Process an Instagram message through the chatbot.
    
    Checks bot state before responding.
    """
    from ..services import vendor_state
    
    print(f"📨 Processing Instagram message from {message.sender_id}: {message.text}")
    
    # Check if bot should respond
    vendor_id = "default"
    should_respond, reason = vendor_state.should_bot_respond(vendor_id, message.sender_id)
    
    if not should_respond:
        print(f"🤐 Bot silent for Instagram user {message.sender_id}: {reason}")
        return
    
    try:
        from ..main import inventory_manager, intent_recognizer, response_formatter
        from ..intent import Intent
        
        # Recognize intent
        intent, entities = intent_recognizer.recognize(message.text)
        
        # Generate response
        response_text = generate_response(intent, entities, inventory_manager, response_formatter)
        
        # Track bot response
        track_message(InstagramMessage(
            sender_id="bot",
            message_id="",
            text=response_text,
            timestamp=datetime.utcnow().isoformat()
        ), "bot")
        
        # Send response back via Instagram
        await send_instagram_message(message.sender_id, response_text)
        
        print(f"✅ Sent Instagram response to {message.sender_id}")
        
    except Exception as e:
        print(f"❌ Error processing Instagram message: {e}")


def generate_response(intent, entities, inventory_manager, formatter) -> str:
    """Generate a response based on intent and entities."""
    from ..intent import Intent
    from ..payment import PaymentManager
    
    payment_manager = PaymentManager()
    
    if intent == Intent.GREETING:
        return formatter.format_greeting()
    
    elif intent == Intent.HELP:
        return formatter.format_help()
    
    elif intent in [Intent.AVAILABILITY_CHECK, Intent.PRICE_INQUIRY]:
        product_query = entities.get("product", "")
        if product_query:
            products = inventory_manager.smart_search_products(product_query)
            if products and len(products) > 0:
                product = products[0]
                price_formatted = payment_manager.format_naira(product.get("price_ngn", 0))
                stock = product.get("stock_level", 0)
                return formatter.format_product_available(
                    product.get("name", "Product"),
                    price_formatted,
                    stock
                )
            else:
                return formatter.format_product_not_found(product_query)
        return formatter.format_purchase_no_context()
    
    elif intent == Intent.ORDER_STATUS:
        return "Check your order status in the KOFA merchant app! 📱"
    
    else:
        return formatter.format_unknown_message()


async def send_instagram_message(recipient_id: str, message_text: str):
    """
    Send a message via Instagram Graph API.
    
    Requires INSTAGRAM_PAGE_ID and INSTAGRAM_ACCESS_TOKEN in environment.
    """
    import aiohttp
    
    page_id = os.getenv("INSTAGRAM_PAGE_ID", "")
    access_token = os.getenv("INSTAGRAM_ACCESS_TOKEN", "")
    
    if not page_id or not access_token:
        print("⚠️ Instagram credentials not configured - message not sent")
        return
    
    url = f"https://graph.facebook.com/v18.0/{page_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": message_text}
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers, json=payload) as response:
            if response.status == 200:
                print(f"✅ Instagram message sent to {recipient_id}")
            else:
                error = await response.text()
                print(f"❌ Failed to send Instagram message: {error}")


# Analytics endpoint
@router.get("/stats")
async def get_instagram_stats():
    """Get Instagram messaging statistics."""
    customer_messages = [m for m in INSTAGRAM_MESSAGES if m["message_type"] == "customer"]
    bot_messages = [m for m in INSTAGRAM_MESSAGES if m["message_type"] == "bot"]
    
    # Unique customers
    unique_customers = len(set(m["customer_id"] for m in customer_messages))
    
    return {
        "platform": "instagram",
        "total_messages": len(INSTAGRAM_MESSAGES),
        "customer_messages": len(customer_messages),
        "bot_replies": len(bot_messages),
        "unique_customers": unique_customers
    }


# Test endpoint
@router.post("/test")
async def test_message(sender_id: str, message: str):
    """Test endpoint to simulate receiving an Instagram message."""
    test_msg = InstagramMessage(
        sender_id=sender_id,
        message_id="test-ig-123",
        text=message,
        timestamp=str(datetime.utcnow().timestamp())
    )
    
    await process_instagram_message(test_msg)
    
    return {"status": "test message processed", "from": sender_id, "text": message}
