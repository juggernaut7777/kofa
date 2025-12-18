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
                    
                    # Handle voice/audio messages
                    elif msg.get("type") == "audio":
                        audio_data = msg.get("audio", {})
                        media_id = audio_data.get("id", "")
                        
                        # Store media_id in text field for later transcription
                        messages.append(WhatsAppMessage(
                            from_number=msg.get("from", ""),
                            message_id=msg.get("id", ""),
                            text=f"VOICE_NOTE:{media_id}",  # Special marker
                            timestamp=msg.get("timestamp", ""),
                            message_type="audio"
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
    1. Transcribes voice notes if needed
    2. Checks if bot should respond (global pause, auto-silence)
    3. Sends the message to the chatbot
    4. Gets the response
    5. Sends the response back via WhatsApp
    """
    from ..main import inventory_manager, intent_recognizer, response_formatter
    from ..intent import Intent
    from ..services import vendor_state
    from ..services.voice_transcription import voice_service
    
    message_text = message.text
    
    # Handle voice notes - transcribe first
    if message.message_type == "audio" and message_text.startswith("VOICE_NOTE:"):
        media_id = message_text.replace("VOICE_NOTE:", "")
        print(f"🎤 Transcribing voice note from {message.from_number}...")
        
        transcribed_text = await voice_service.transcribe_whatsapp_voice(media_id)
        
        if transcribed_text:
            message_text = transcribed_text
            print(f"📝 Transcribed: \"{message_text}\"")
        else:
            # Transcription failed - send helpful message
            await send_whatsapp_message(
                message.from_number, 
                "Sorry, I couldn't understand that voice note. Please try sending a text message instead! 🙏"
            )
            return
    
    print(f"📨 Processing message from {message.from_number}: {message_text}")
    
    # Check if bot should respond (respects global pause and auto-silence)
    vendor_id = "default"  # In production, extract from context
    should_respond, reason = vendor_state.should_bot_respond(vendor_id, message.from_number)
    
    if not should_respond:
        print(f"🤐 Bot silent for {message.from_number}: {reason}")
        return
    
    try:
        # Recognize intent from text (original or transcribed)
        intent, entities = intent_recognizer.recognize(message_text)
        
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
    """
    Generate a response based on intent and entities.
    
    IMPORTANT: Responses should NEVER end the conversation!
    Always include a follow-up question to keep the 24-hour window open.
    This saves money on WhatsApp Business API costs.
    """
    from ..intent import Intent
    from ..payment import PaymentManager
    
    payment_manager = PaymentManager()
    
    # Follow-up prompts to keep conversation alive (saves API costs!)
    FOLLOW_UPS = [
        "\n\n💬 *Anything else you'd like?*",
        "\n\n🛒 *Want me to check other products for you?*",
        "\n\n📦 *Need help with anything else?*",
        "\n\n✨ *Can I help with something else today?*",
    ]
    import random
    follow_up = random.choice(FOLLOW_UPS)
    
    if intent == Intent.GREETING:
        return formatter.format_greeting() + follow_up
    
    elif intent == Intent.HELP:
        return formatter.format_help() + follow_up
    
    elif intent in [Intent.AVAILABILITY_CHECK, Intent.PRICE_INQUIRY]:
        product_query = entities.get("product", "")
        if product_query:
            products = inventory_manager.smart_search_products(product_query)
            if products and len(products) > 0:
                product = products[0]
                price_formatted = payment_manager.format_naira(product.get("price_ngn", 0))
                stock = product.get("stock_level", 0)
                base_response = formatter.format_product_available(
                    product.get("name", "Product"),
                    price_formatted,
                    stock
                )
                return base_response + "\n\n🛍️ *Want to add this to your order?* Reply YES to proceed!"
            else:
                return formatter.format_product_not_found(product_query) + "\n\n🔍 *Try describing it differently?*"
        return formatter.format_purchase_no_context() + follow_up
    
    elif intent == Intent.ORDER_STATUS:
        return "Check your order status in the KOFA merchant app! 📱" + "\n\n📋 *Want a receipt sent to you?*"
    
    else:
        return formatter.format_unknown_message() + follow_up


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


# ============== VENDOR WHATSAPP ONBOARDING ==============

class VendorOnboardRequest(BaseModel):
    """Request to onboard a vendor's WhatsApp number."""
    code: str  # Authorization code from Meta Embedded Signup
    vendor_id: str


class VendorOnboardResponse(BaseModel):
    """Response after vendor onboarding."""
    status: str
    message: str
    waba_id: Optional[str] = None
    phone_number_id: Optional[str] = None


@router.post("/onboard_vendor", response_model=VendorOnboardResponse)
async def onboard_vendor(request: VendorOnboardRequest):
    """
    Exchange Meta authorization code for access token (Embedded Signup Step 2).
    
    This endpoint is called after a vendor completes the Meta Embedded Signup
    popup in the mobile app. It:
    1. Exchanges the code for a System User Access Token
    2. Retrieves the vendor's WABA ID and Phone Number ID
    3. Saves credentials to the database
    
    Reference: https://developers.facebook.com/docs/whatsapp/embedded-signup
    """
    import os
    import aiohttp
    
    META_APP_ID = os.getenv("META_APP_ID", "")
    META_APP_SECRET = os.getenv("META_APP_SECRET", "")
    
    if not META_APP_ID or not META_APP_SECRET:
        return VendorOnboardResponse(
            status="error",
            message="Meta App credentials not configured on server"
        )
    
    try:
        # Step 1: Exchange code for access token
        token_url = "https://graph.facebook.com/v21.0/oauth/access_token"
        params = {
            "client_id": META_APP_ID,
            "client_secret": META_APP_SECRET,
            "code": request.code
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(token_url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Token exchange failed: {error_text}")
                    return VendorOnboardResponse(
                        status="error",
                        message="Failed to exchange authorization code"
                    )
                
                token_data = await response.json()
                access_token = token_data.get("access_token")
        
        if not access_token:
            return VendorOnboardResponse(
                status="error",
                message="No access token received from Meta"
            )
        
        # Step 2: Get the vendor's WhatsApp Business Accounts
        # This returns the WABA ID(s) the vendor has access to
        waba_url = "https://graph.facebook.com/v21.0/me/whatsapp_business_accounts"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(waba_url, headers=headers) as response:
                waba_data = await response.json()
        
        waba_list = waba_data.get("data", [])
        if not waba_list:
            return VendorOnboardResponse(
                status="error",
                message="No WhatsApp Business Account found for this user"
            )
        
        # Use the first WABA (vendors typically have one)
        waba_id = waba_list[0].get("id")
        
        # Step 3: Get phone numbers for this WABA
        phones_url = f"https://graph.facebook.com/v21.0/{waba_id}/phone_numbers"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(phones_url, headers=headers) as response:
                phones_data = await response.json()
        
        phone_list = phones_data.get("data", [])
        phone_number_id = phone_list[0].get("id") if phone_list else None
        
        # Step 4: Save to database (Supabase)
        # TODO: Implement actual database save
        # For now, log the successful onboarding
        print(f"✅ Vendor {request.vendor_id} onboarded successfully!")
        print(f"   WABA ID: {waba_id}")
        print(f"   Phone ID: {phone_number_id}")
        print(f"   Token: {access_token[:20]}...")
        
        # In production, save to Supabase:
        # supabase.table('vendors').update({
        #     'waba_id': waba_id,
        #     'phone_number_id': phone_number_id,
        #     'meta_access_token': access_token,
        #     'whatsapp_connected': True
        # }).eq('id', request.vendor_id).execute()
        
        return VendorOnboardResponse(
            status="success",
            message="WhatsApp Business Account connected successfully!",
            waba_id=waba_id,
            phone_number_id=phone_number_id
        )
        
    except Exception as e:
        print(f"❌ Onboarding error: {e}")
        return VendorOnboardResponse(
            status="error",
            message=f"Onboarding failed: {str(e)}"
        )


@router.get("/connection_status/{vendor_id}")
async def get_connection_status(vendor_id: str):
    """
    Check if a vendor has connected their WhatsApp Business Account.
    """
    # TODO: Query Supabase for vendor's connection status
    # For now, return mock status
    return {
        "vendor_id": vendor_id,
        "connected": False,
        "phone_number": None,
        "waba_id": None
    }


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

