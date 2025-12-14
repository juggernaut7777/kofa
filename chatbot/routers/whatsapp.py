"""WhatsApp Business API webhook integration."""
from fastapi import APIRouter, Request, Response, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json
import hmac
import hashlib

router = APIRouter()


class WhatsAppMessage(BaseModel):
    """Incoming WhatsApp message structure."""
    from_number: str
    message_id: str
    text: str
    timestamp: str
    message_type: str = "text"


class WhatsAppWebhookPayload(BaseModel):
    """WhatsApp Cloud API webhook payload structure."""
    object: str
    entry: List[dict]


# Verification token for webhook setup (should be in env vars in production)
VERIFY_TOKEN = "owoflow_webhook_verify_token"


@router.get("/webhook")
async def verify_webhook(request: Request):
    """
    WhatsApp webhook verification endpoint.
    
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
        print(f"✅ WhatsApp webhook verified successfully")
        return Response(content=challenge, media_type="text/plain")
    else:
        print(f"❌ Webhook verification failed: mode={mode}, token={token}")
        raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def receive_webhook(request: Request):
    """
    Receive incoming WhatsApp messages.
    
    This endpoint receives messages from the WhatsApp Cloud API
    and routes them to the chatbot for processing.
    """
    try:
        body = await request.json()
        
        # Log incoming webhook for debugging
        print(f"📱 WhatsApp webhook received: {json.dumps(body, indent=2)}")
        
        # Parse the message
        messages = extract_messages(body)
        
        for message in messages:
            # Process each message through the chatbot
            await process_whatsapp_message(message)
        
        # Always return 200 to acknowledge receipt
        return {"status": "received", "messages_processed": len(messages)}
        
    except Exception as e:
        print(f"❌ Error processing webhook: {e}")
        # Still return 200 to prevent retry loops
        return {"status": "error", "detail": str(e)}


def extract_messages(payload: dict) -> List[WhatsAppMessage]:
    """Extract messages from WhatsApp webhook payload."""
    messages = []
    
    try:
        # Navigate through the payload structure
        entries = payload.get("entry", [])
        
        for entry in entries:
            changes = entry.get("changes", [])
            
            for change in changes:
                value = change.get("value", {})
                incoming_messages = value.get("messages", [])
                
                for msg in incoming_messages:
                    # Handle text messages
                    if msg.get("type") == "text":
                        messages.append(WhatsAppMessage(
                            from_number=msg.get("from", ""),
                            message_id=msg.get("id", ""),
                            text=msg.get("text", {}).get("body", ""),
                            timestamp=msg.get("timestamp", ""),
                            message_type="text"
                        ))
                    
                    # Handle interactive button replies
                    elif msg.get("type") == "interactive":
                        interactive = msg.get("interactive", {})
                        if interactive.get("type") == "button_reply":
                            messages.append(WhatsAppMessage(
                                from_number=msg.get("from", ""),
                                message_id=msg.get("id", ""),
                                text=interactive.get("button_reply", {}).get("title", ""),
                                timestamp=msg.get("timestamp", ""),
                                message_type="button_reply"
                            ))
    
    except Exception as e:
        print(f"Error extracting messages: {e}")
    
    return messages


async def process_whatsapp_message(message: WhatsAppMessage):
    """
    Process a WhatsApp message through the chatbot.
    
    This function:
    1. Checks if bot should respond (global pause, auto-silence)
    2. Sends the message to the chatbot
    3. Gets the response
    4. Sends the response back via WhatsApp
    """
    from ..main import inventory_manager, intent_recognizer, response_formatter
    from ..intent import Intent
    from ..services import vendor_state
    
    print(f"📨 Processing message from {message.from_number}: {message.text}")
    
    # Check if bot should respond (respects global pause and auto-silence)
    vendor_id = "default"  # In production, extract from context
    should_respond, reason = vendor_state.should_bot_respond(vendor_id, message.from_number)
    
    if not should_respond:
        print(f"🤐 Bot silent for {message.from_number}: {reason}")
        return
    
    try:
        # Recognize intent
        intent, entities = intent_recognizer.recognize(message.text)
        
        # Generate response based on intent (simplified version)
        response_text = generate_chatbot_response(
            intent, 
            entities, 
            inventory_manager,
            response_formatter
        )
        
        # Send response back via WhatsApp
        # Note: This requires WhatsApp Business API credentials
        await send_whatsapp_message(message.from_number, response_text)
        
        print(f"✅ Sent response to {message.from_number}")
        
    except Exception as e:
        print(f"❌ Error processing message: {e}")


def generate_chatbot_response(intent, entities, inventory_manager, formatter) -> str:
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


async def send_whatsapp_message(to_number: str, message_text: str):
    """
    Send a message via WhatsApp Cloud API.
    
    Note: Requires WHATSAPP_PHONE_ID and WHATSAPP_ACCESS_TOKEN in environment.
    """
    import aiohttp
    import os
    
    phone_number_id = os.getenv("WHATSAPP_PHONE_ID", "")
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
    
    if not phone_number_id or not access_token:
        print("⚠️ WhatsApp credentials not configured - message not sent")
        return
    
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "text",
        "text": {
            "body": message_text
        }
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers, json=payload) as response:
            if response.status == 200:
                print(f"✅ Message sent to {to_number}")
            else:
                error = await response.text()
                print(f"❌ Failed to send message: {error}")


# Utility endpoint to test the integration
@router.post("/test")
async def test_message(phone_number: str, message: str):
    """
    Test endpoint to simulate receiving a WhatsApp message.
    
    Usage: POST /whatsapp/test?phone_number=+234xxx&message=hello
    """
    test_message = WhatsAppMessage(
        from_number=phone_number,
        message_id="test-123",
        text=message,
        timestamp="1234567890"
    )
    
    await process_whatsapp_message(test_message)
    
    return {"status": "test message processed", "from": phone_number, "text": message}
