from fastapi import FastAPI, HTTPException, APIRouter
from pydantic import BaseModel
from typing import Optional, List
import uuid

from .inventory import InventoryManager
from .intent import IntentRecognizer, Intent
from .payment import PaymentManager
from .response_formatter import ResponseFormatter, ResponseStyle
from .routers import (
    expenses, delivery, analytics, invoice, 
    recommendations, notifications, installments, profit_loss, sales_channels, whatsapp
)

app = FastAPI(
    title="KOFA Commerce Engine",
    description="AI-powered commerce platform for modern merchants",
    version="2.0.0"
)

# In‑memory store for demo purposes (User preferences)
USERS: dict = {}
router = APIRouter()

# Initialize components
inventory_manager = InventoryManager()
intent_recognizer = IntentRecognizer()
payment_manager = PaymentManager()
# Default to street style for demo, but could be dynamic based on user profile
response_formatter = ResponseFormatter(style=ResponseStyle.CORPORATE)

class MessageRequest(BaseModel):
    """Incoming message payload."""
    user_id: str  # Customer phone number
    message_text: str

class MessageResponse(BaseModel):
    """Chatbot reply."""
    response: str
    intent: str
    product: Optional[dict] = None
    payment_link: Optional[str] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    price_ngn: float
    stock_level: int
    description: Optional[str] = None
    voice_tags: Optional[List[str]] = None

class OrderItem(BaseModel):
    product_id: str
    quantity: int

class OrderRequest(BaseModel):
    items: List[OrderItem]
    user_id: str # Phone number

class OrderResponse(BaseModel):
    order_id: str
    payment_link: str
    amount_ngn: float
    message: str

# Health endpoints
@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "online", "service": "KOFA Commerce Engine", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@router.get("/products")
async def get_products():
    """Get all products from inventory."""
    return inventory_manager.list_products()

@router.post("/orders", response_model=OrderResponse)
async def create_order(request: OrderRequest):
    """Create a new order and generate payment link."""
    total_amount = 0.0
    
    # Calculate total and verify stock (simplified)
    # in a real app, we should lock stock or check immediately before
    for item in request.items:
        # We need to fetch product details. For now we assume we have them or fetch them.
        # Since InventoryManager.list_products returns dicts, we can use that or get_product_by_id if we added it.
        # For MVP, let's just trust the price passed or fetch all products to look up price.
        # Optimally: InventoryManager should have get_product_by_id
        pass 
    
    # Let's iterate over inventory to find prices. This is inefficient but fine for this MVP step.
    # In production, implement get_product_by_id in InventoryManager
    all_products = inventory_manager.list_products()
    product_map = {str(p.get('id')): p for p in all_products}
    
    for item in request.items:
        product = product_map.get(item.product_id)
        if not product:
            # If not found by ID, maybe mock logic used name as ID? 
            # In Supabase logic, ID should be UUID.
            # If we can't find it, skip or error.
            print(f"Product {item.product_id} not found")
            continue
            
        total_amount += product['price_ngn'] * item.quantity

    if total_amount == 0:
        # Fallback for testing if IDs don't match or empty
        # If we are testing with mocks, let's assume a default price
        total_amount = 1000.0 * len(request.items)

    order_id = str(uuid.uuid4())
    payment_link = payment_manager.generate_payment_link(
        order_id=order_id,
        amount_ngn=int(total_amount),
        customer_phone=request.user_id,
        description=f"Order {order_id[:8]}"
    )
    
    if not payment_link:
        raise HTTPException(status_code=500, detail="Failed to generate payment link")
        
    return OrderResponse(
        order_id=order_id,
        payment_link=payment_link,
        amount_ngn=total_amount,
        message="Order created successfully"
    )


@router.get("/orders")
async def get_orders(status: Optional[str] = None):
    """
    Get all orders for merchant dashboard.
    For MVP, returns mock orders. In production, query Supabase.
    """
    # In production, this would query Supabase:
    # orders = supabase.table("orders").select("*").execute()
    
    # For MVP demo, return mock orders
    import datetime
    
    mock_orders = [
        {
            "id": "order-001",
            "customer_phone": "+2348012345678",
            "items": [
                {"product_id": "1", "product_name": "Nike Air Max Red", "quantity": 1, "price": 45000}
            ],
            "total_amount": 45000,
            "status": "pending",
            "created_at": (datetime.datetime.now() - datetime.timedelta(minutes=30)).isoformat()
        },
        {
            "id": "order-002",
            "customer_phone": "+2349087654321",
            "items": [
                {"product_id": "3", "product_name": "Men Formal Shirt White", "quantity": 2, "price": 15000},
                {"product_id": "6", "product_name": "Plain Round Neck T-Shirt", "quantity": 3, "price": 8000}
            ],
            "total_amount": 54000,
            "status": "paid",
            "payment_ref": "PAY-ABC123",
            "created_at": (datetime.datetime.now() - datetime.timedelta(hours=2)).isoformat()
        },
        {
            "id": "order-003",
            "customer_phone": "+2348055551234",
            "items": [
                {"product_id": "5", "product_name": "Black Leather Bag", "quantity": 1, "price": 35000}
            ],
            "total_amount": 35000,
            "status": "fulfilled",
            "payment_ref": "PAY-XYZ789",
            "created_at": (datetime.datetime.now() - datetime.timedelta(days=1)).isoformat()
        }
    ]
    
    # Filter by status if provided
    if status:
        mock_orders = [o for o in mock_orders if o["status"].lower() == status.lower()]
    
    return mock_orders

@router.post("/message")
async def process_message(request: MessageRequest):
    """
    Smart conversational message handler:
    1. Check conversation context (are we awaiting a selection?)
    2. Use smart search to find products (ALWAYS tries to find something)
    3. Handle multiple matches by asking user to choose
    4. Remember context for follow-up queries
    """
    from .conversation import conversation_manager
    
    user_id = request.user_id
    text = request.message_text
    
    # Get conversation state for this user
    state = conversation_manager.get_state(user_id)
    
    response_text = ""
    product_data = None
    payment_link = None
    
    # Recognize intent
    intent = intent_recognizer.recognize(text)
    
    # ========== STEP 1: Check if user is selecting from a previous list ==========
    if state.awaiting_selection and state.last_products:
        # Try to find which product they're selecting
        selected = inventory_manager.find_product_by_selection(text, state.last_products)
        
        if selected:
            state.select_product(selected)
            product_data = selected
            price_fmt = payment_manager.format_naira(selected["price_ngn"])
            
            # Show the selected product details
            if selected["stock_level"] > 0:
                response_text = response_formatter.format_product_available(
                    selected["name"], price_fmt, selected["stock_level"]
                )
            else:
                response_text = response_formatter.format_out_of_stock(selected["name"])
            
            return MessageResponse(
                response=response_text,
                intent="selection",
                product=product_data,
                payment_link=None
            )
    
    # ========== STEP 2: Check if this is a follow-up action on current product ==========
    if state.current_product and intent == Intent.PURCHASE:
        # User said "buy", "yes", etc. after viewing a product
        product = state.current_product
        product_data = product
        price_fmt = payment_manager.format_naira(product["price_ngn"])
        
        if product["stock_level"] > 0:
            prod_id = str(product.get("id", ""))
            link = payment_manager.generate_payment_link(
                order_id=f"ORD-{user_id[-4:]}-{prod_id[:4]}",
                amount_ngn=int(product["price_ngn"]),
                customer_phone=user_id,
                description=f"Purchase {product['name']}"
            )
            if link:
                payment_link = link
                response_text = response_formatter.format_payment_link(
                    product['name'], link, price_fmt, 15
                )
            else:
                response_text = response_formatter.format_payment_link_failed()
        else:
            response_text = response_formatter.format_out_of_stock(product["name"])
        
        return MessageResponse(
            response=response_text,
            intent=intent.value,
            product=product_data,
            payment_link=payment_link
        )
    
    # ========== STEP 3: Handle standard intents ==========
    if intent == Intent.GREETING:
        state.reset()  # Clear any previous context
        response_text = response_formatter.format_greeting()
        
    elif intent == Intent.HELP:
        response_text = response_formatter.format_help()
        
    elif intent in [Intent.PRICE_INQUIRY, Intent.AVAILABILITY_CHECK, Intent.PURCHASE]:
        # Extract product query
        product_query = intent_recognizer.extract_product_query(text)
        
        if not product_query:
            # No product mentioned - if purchase, ask what they want
            if intent == Intent.PURCHASE:
                if state.current_product:
                    # They said "buy" but we have context
                    product = state.current_product
                    product_data = product
                    price_fmt = payment_manager.format_naira(product["price_ngn"])
                    
                    if product["stock_level"] > 0:
                        prod_id = str(product.get("id", ""))
                        link = payment_manager.generate_payment_link(
                            order_id=f"ORD-{user_id[-4:]}-{prod_id[:4]}",
                            amount_ngn=int(product["price_ngn"]),
                            customer_phone=user_id,
                            description=f"Purchase {product['name']}"
                        )
                        if link:
                            payment_link = link
                            response_text = response_formatter.format_payment_link(
                                product['name'], link, price_fmt, 15
                            )
                        else:
                            response_text = response_formatter.format_payment_link_failed()
                    else:
                        response_text = response_formatter.format_out_of_stock(product["name"])
                else:
                    response_text = response_formatter.format_purchase_no_context()
            else:
                response_text = response_formatter.format_unknown_message()
        else:
            # ========== SMART SEARCH: Find all matching products ==========
            matching_products = inventory_manager.smart_search_products(product_query)
            
            if not matching_products:
                # Truly nothing found - but this should be very rare now
                response_text = response_formatter.format_product_not_found(product_query)
                
            elif len(matching_products) == 1:
                # Single match - show it directly
                product = matching_products[0]
                state.set_products([product], product_query)
                product_data = product
                price_fmt = payment_manager.format_naira(product["price_ngn"])
                
                if intent == Intent.PURCHASE:
                    if product["stock_level"] > 0:
                        prod_id = str(product.get("id", ""))
                        link = payment_manager.generate_payment_link(
                            order_id=f"ORD-{user_id[-4:]}-{prod_id[:4]}",
                            amount_ngn=int(product["price_ngn"]),
                            customer_phone=user_id,
                            description=f"Purchase {product['name']}"
                        )
                        if link:
                            payment_link = link
                            response_text = response_formatter.format_payment_link(
                                product['name'], link, price_fmt, 15
                            )
                        else:
                            response_text = response_formatter.format_payment_link_failed()
                    else:
                        response_text = response_formatter.format_out_of_stock(product["name"])
                else:
                    if product["stock_level"] > 0:
                        response_text = response_formatter.format_product_available(
                            product["name"], price_fmt, product["stock_level"]
                        )
                    else:
                        response_text = response_formatter.format_out_of_stock(product["name"])
            else:
                # Multiple matches - ask user to choose
                state.set_products(matching_products, product_query)
                response_text = response_formatter.format_multiple_products(
                    matching_products,
                    payment_manager.format_naira
                )
    else:
        # Unknown intent - try smart search on the whole message as fallback
        matching_products = inventory_manager.smart_search_products(text)
        
        if matching_products:
            if len(matching_products) == 1:
                product = matching_products[0]
                state.set_products([product], text)
                product_data = product
                price_fmt = payment_manager.format_naira(product["price_ngn"])
                
                if product["stock_level"] > 0:
                    response_text = response_formatter.format_product_available(
                        product["name"], price_fmt, product["stock_level"]
                    )
                else:
                    response_text = response_formatter.format_out_of_stock(product["name"])
            else:
                state.set_products(matching_products, text)
                response_text = response_formatter.format_multiple_products(
                    matching_products,
                    payment_manager.format_naira
                )
        else:
            response_text = response_formatter.format_unknown_message()

    return MessageResponse(
        response=response_text,
        intent=intent.value,
        product=product_data,
        payment_link=payment_link
    )

# Endpoint to set seller's preferred closing channel
@router.post("/users/{user_id}/preferred-channel")
async def set_preferred_channel(user_id: str, payload: dict):
    channel = payload.get("channel")
    if channel not in {"whatsapp", "facebook", "instagram", "tiktok"}:
        raise HTTPException(status_code=400, detail="Invalid channel")
    USERS.setdefault(user_id, {})["preferred_channel"] = channel
    return {"status": "success", "user_id": user_id, "preferred_channel": channel}

# Endpoint for seller bank account details (NGN payouts)
@router.post("/seller/{seller_id}/account-details")
async def set_seller_account(seller_id: str, payload: dict):
    bank_name = payload.get("bank_name")
    bank_account = payload.get("bank_account_number")
    if not bank_name or not bank_account:
        raise HTTPException(status_code=400, detail="Missing bank_name or bank_account_number")
    USERS.setdefault(seller_id, {})["bank_name"] = bank_name
    USERS[seller_id]["bank_account_number"] = bank_account
    return {"status": "success", "seller_id": seller_id}


# ============== KOFA 2.0 NEW ENDPOINTS ==============

class BotStyleRequest(BaseModel):
    """Bot style preference."""
    style: str  # "corporate" or "street"

class ProductCreate(BaseModel):
    """Create a new product."""
    name: str
    price_ngn: float
    stock_level: int = 0
    description: Optional[str] = None
    category: Optional[str] = None
    voice_tags: Optional[List[str]] = None

class ManualSale(BaseModel):
    """Log a manual sale."""
    product_name: str
    quantity: int
    amount_ngn: float
    channel: str  # "instagram", "walk-in", "whatsapp", "other"
    notes: Optional[str] = None


@router.post("/settings/bot-style")
async def set_bot_style(request: BotStyleRequest, user_id: str = "default"):
    """Toggle bot personality between Corporate and Nigerian Pidgin."""
    global response_formatter
    if request.style.lower() == "street":
        response_formatter = ResponseFormatter(style=ResponseStyle.STREET)
    else:
        response_formatter = ResponseFormatter(style=ResponseStyle.CORPORATE)
    
    USERS.setdefault(user_id, {})["bot_style"] = request.style.lower()
    return {
        "status": "success",
        "bot_style": request.style.lower(),
        "message": f"Bot personality set to {request.style}"
    }


@router.get("/settings/bot-style")
async def get_bot_style():
    """Get current bot style."""
    return {
        "current_style": response_formatter.style.value,
        "available_styles": ["corporate", "street"]
    }


@router.post("/products")
async def create_product(product: ProductCreate):
    """Add a new product to inventory."""
    new_product = {
        "id": f"prod-{uuid.uuid4().hex[:8]}",
        "name": product.name,
        "price_ngn": product.price_ngn,
        "stock_level": product.stock_level,
        "description": product.description or "",
        "category": product.category or "uncategorized",
        "voice_tags": product.voice_tags or []
    }
    
    # Add to inventory (in production, this would insert to Supabase)
    inventory_manager.add_product(new_product)
    
    return {
        "status": "success",
        "message": f"Product '{product.name}' added successfully",
        "product": new_product
    }


class ProductUpdate(BaseModel):
    """Update product fields."""
    name: Optional[str] = None
    price_ngn: Optional[float] = None
    stock_level: Optional[int] = None
    description: Optional[str] = None
    category: Optional[str] = None
    voice_tags: Optional[List[str]] = None


class RestockRequest(BaseModel):
    """Restock a product."""
    quantity: int


class OrderStatusUpdate(BaseModel):
    """Update order status."""
    status: str  # "pending", "paid", "fulfilled"


# In-memory orders store (for demo - normally would be in Supabase)
ORDERS_STORE = {}


@router.put("/products/{product_id}")
async def update_product(product_id: str, updates: ProductUpdate):
    """Update an existing product."""
    # Find product in inventory
    products = inventory_manager.list_products()
    product_found = None
    product_index = None
    
    for i, p in enumerate(products):
        if str(p.get('id')) == product_id:
            product_found = p
            product_index = i
            break
    
    if not product_found:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    
    # Update fields that were provided
    if updates.name is not None:
        product_found['name'] = updates.name
    if updates.price_ngn is not None:
        product_found['price_ngn'] = updates.price_ngn
    if updates.stock_level is not None:
        product_found['stock_level'] = updates.stock_level
    if updates.description is not None:
        product_found['description'] = updates.description
    if updates.category is not None:
        product_found['category'] = updates.category
    if updates.voice_tags is not None:
        product_found['voice_tags'] = updates.voice_tags
    
    return {
        "status": "success",
        "message": f"Product '{product_found['name']}' updated",
        "product": product_found
    }


@router.post("/products/{product_id}/restock")
async def restock_product(product_id: str, restock: RestockRequest):
    """Add stock to a product."""
    if restock.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    
    # Find product
    products = inventory_manager.list_products()
    product_found = None
    
    for p in products:
        if str(p.get('id')) == product_id:
            product_found = p
            break
    
    if not product_found:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    
    # Update stock using the inventory manager method
    old_stock = product_found.get('stock_level', 0)
    inventory_manager.update_stock(product_id, restock.quantity)
    new_stock = old_stock + restock.quantity
    
    return {
        "status": "success",
        "message": f"Added {restock.quantity} units to {product_found['name']}",
        "new_stock_level": new_stock
    }


@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, update: OrderStatusUpdate):
    """Update order status."""
    valid_statuses = ["pending", "paid", "fulfilled"]
    if update.status.lower() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # For demo purposes, we'll just return success
    # In production, this would update Supabase
    ORDERS_STORE[order_id] = update.status.lower()
    
    return {
        "status": "success",
        "message": f"Order {order_id} marked as {update.status}",
        "order": {
            "id": order_id,
            "status": update.status.lower()
        }
    }



@router.post("/sales/manual")
async def log_manual_sale(sale: ManualSale):
    """Log a sale made outside of KOFA (walk-in, Instagram DM, etc.)."""
    sale_record = {
        "id": f"sale-{uuid.uuid4().hex[:8]}",
        "product_name": sale.product_name,
        "quantity": sale.quantity,
        "amount_ngn": sale.amount_ngn,
        "channel": sale.channel,
        "notes": sale.notes,
        "source": "manual",
        "created_at": __import__('datetime').datetime.now().isoformat()
    }
    
    # In production, save to Supabase
    return {
        "status": "success",
        "message": f"Sale of {sale.quantity}x {sale.product_name} logged from {sale.channel}",
        "sale": sale_record
    }

# Include routers
app.include_router(router)
app.include_router(expenses.router, prefix="/expenses", tags=["Spend"])
app.include_router(delivery.router, prefix="/delivery", tags=["Delivery"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(invoice.router, prefix="/invoice", tags=["Invoice"])
app.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
app.include_router(installments.router, prefix="/installments", tags=["Installments"])
app.include_router(profit_loss.router, prefix="/profit-loss", tags=["Profit/Loss"])
app.include_router(sales_channels.router, prefix="/channels", tags=["Sales Channels"])
app.include_router(whatsapp.router, prefix="/whatsapp", tags=["WhatsApp"])



