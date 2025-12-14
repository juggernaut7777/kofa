"""Response formatter for Nigerian market."""
from enum import Enum


class ResponseStyle(str, Enum):
    """Response style options."""
    CORPORATE = "corporate"  # Professional, formal tone
    STREET = "street"        # Casual, Nigerian English/Pidgin


class ResponseFormatter:
    """Formats chatbot responses based on chosen style."""
    
    def __init__(self, style: ResponseStyle = ResponseStyle.CORPORATE):
        """
        Initialize response formatter.
        
        Args:
            style: Response style to use
        """
        self.style = style
    
    def format_greeting(self) -> str:
        """Format greeting message."""
        if self.style == ResponseStyle.CORPORATE:
            return "Hello! 👋 Welcome to our store. I can help you check prices, availability, and make purchases. What are you looking for?"
        else:  # STREET
            return "Hello! 👋 How far? Wetin you dey find? I fit help you check price, availability, and buy anything. Talk to me!"
    
    def format_help(self) -> str:
        """Format help message."""
        if self.style == ResponseStyle.CORPORATE:
            return (
                "Here's what I can help you with:\n\n"
                "✅ Check product availability\n"
                "✅ Get prices\n"
                "✅ Make purchases\n\n"
                "Just tell me what you're looking for!"
            )
        else:  # STREET
            return (
                "See wetin I fit do for you:\n\n"
                "✅ Check if we get the product\n"
                "✅ Show you price\n"
                "✅ Help you buy\n\n"
                "Just tell me wetin you need!"
            )
    
    def format_product_not_found(self, query: str) -> str:
        """Format product not found message."""
        if self.style == ResponseStyle.CORPORATE:
            return f"Sorry, I couldn't find '{query}' in our inventory. Can you describe it differently?"
        else:  # STREET
            return f"Omo, I no see '{query}' for our shop o. You fit talk am another way?"
    
    def format_out_of_stock(self, product_name: str) -> str:
        """Format out of stock message."""
        if self.style == ResponseStyle.CORPORATE:
            return f"Sorry, {product_name} is currently sold out. 😔"
        else:  # STREET
            return f"Omo sorry o, {product_name} don finish. 😔 E don sell comot."
    
    def format_product_available(
        self,
        product_name: str,
        price_formatted: str,
        stock_level: int
    ) -> str:
        """Format product availability message."""
        if self.style == ResponseStyle.CORPORATE:
            return (
                f"Yes! We have {product_name} in stock. ✅\n\n"
                f"💰 Price: {price_formatted}\n"
                f"📦 {stock_level} {'piece' if stock_level == 1 else 'pieces'} left in stock\n\n"
                f"Want to buy? Just say 'Yes' or 'Buy'!"
            )
        else:  # STREET
            pieces_text = "piece" if stock_level == 1 else "pieces"
            return (
                f"We get am! ✅ {product_name} dey available.\n\n"
                f"💰 Price na {price_formatted}\n"
                f"📦 {stock_level} {pieces_text} remain for shop\n\n"
                f"You wan buy? Just talk 'Yes' or 'I wan buy'!"
            )
    
    def format_payment_link(
        self,
        product_name: str,
        payment_link: str,
        price_formatted: str,
        reservation_minutes: int
    ) -> str:
        """Format payment link message."""
        if self.style == ResponseStyle.CORPORATE:
            return (
                f"Great! Here's your payment link for {product_name}:\n\n"
                f"💳 {payment_link}\n\n"
                f"Amount: {price_formatted}\n"
                f"⏰ Order reserved for {reservation_minutes} minutes.\n\n"
                f"Pay now to confirm your order!"
            )
        else:  # STREET
            return (
                f"Oya na! 🎉 See your payment link for {product_name}:\n\n"
                f"💳 {payment_link}\n\n"
                f"Amount: {price_formatted}\n"
                f"⏰ I don hold the product for you for {reservation_minutes} minutes.\n\n"
                f"Pay sharp make you secure am!"
            )
    
    def format_purchase_no_context(self) -> str:
        """Format purchase without context message."""
        if self.style == ResponseStyle.CORPORATE:
            return "What would you like to buy? Please tell me the product name."
        else:  # STREET
            return "Wetin you wan buy? Abeg tell me the product name make I check for you."
    
    def format_order_creation_failed(self) -> str:
        """Format order creation failure message."""
        if self.style == ResponseStyle.CORPORATE:
            return "Sorry, we couldn't create your order. Please try again."
        else:  # STREET
            return "Wahala dey o, I no fit create your order. Abeg try again."
    
    def format_payment_link_failed(self) -> str:
        """Format payment link generation failure message."""
        if self.style == ResponseStyle.CORPORATE:
            return "Sorry, we couldn't generate a payment link. Please contact support."
        else:  # STREET
            return "Omo sorry o, payment link no generate. Abeg contact customer care."
    
    def format_unknown_message(self) -> str:
        """Format unknown intent message."""
        if self.style == ResponseStyle.CORPORATE:
            return (
                "I'm not sure what you're looking for. 🤔\n\n"
                "You can ask me about:\n"
                "• Product availability\n"
                "• Prices\n"
                "• Making a purchase\n\n"
                "What would you like to know?"
            )
        else:  # STREET
            return (
                "I no too understand wetin you talk o. 🤔\n\n"
                "You fit ask me about:\n"
                "• If product dey available\n"
                "• How much e be\n"
                "• How to buy am\n\n"
                "Wetin you wan know?"
            )
    
    def format_multiple_products(
        self,
        products: list,
        format_price_fn
    ) -> str:
        """Format response when multiple products match a query."""
        if self.style == ResponseStyle.CORPORATE:
            lines = ["I found several matching products:\n"]
            for i, product in enumerate(products[:5], 1):  # Max 5 products
                price = format_price_fn(product.get("price_ngn", 0))
                stock = product.get("stock_level", 0)
                status = "✅" if stock > 0 else "❌ Sold out"
                lines.append(f"{i}. **{product['name']}** - {price} {status}")
            
            lines.append("\n\nWhich one would you like? Reply with the number or name.")
            return "\n".join(lines)
        else:  # STREET
            lines = ["See the ones wey we get:\n"]
            for i, product in enumerate(products[:5], 1):
                price = format_price_fn(product.get("price_ngn", 0))
                stock = product.get("stock_level", 0)
                status = "✅ dey" if stock > 0 else "❌ don finish"
                lines.append(f"{i}. **{product['name']}** - {price} {status}")
            
            lines.append("\n\nWhich one you want? Just talk the number or name.")
            return "\n".join(lines)
    
    def format_clarification_by_attribute(
        self,
        products: list,
        attribute: str  # "color", "size", etc.
    ) -> str:
        """Ask for clarification based on specific attribute."""
        if self.style == ResponseStyle.CORPORATE:
            if attribute == "color":
                colors = set()
                for p in products:
                    name = p.get("name", "").lower()
                    for color in ["red", "blue", "white", "black", "gold", "green", "pink"]:
                        if color in name:
                            colors.add(color.capitalize())
                if colors:
                    return f"We have that in: {', '.join(colors)}. Which color would you prefer?"
            return "Could you be more specific about which one you'd like?"
        else:  # STREET
            if attribute == "color":
                colors = set()
                for p in products:
                    name = p.get("name", "").lower()
                    for color in ["red", "blue", "white", "black", "gold", "green", "pink"]:
                        if color in name:
                            colors.add(color.capitalize())
                if colors:
                    return f"We get am for: {', '.join(colors)}. Which colour you prefer?"
            return "Abeg tell me which one exactly you wan."
    
    def format_single_product_found(
        self,
        product: dict,
        price_formatted: str
    ) -> str:
        """Format response for single product match with details."""
        stock = product.get("stock_level", 0)
        name = product.get("name", "Product")
        
        if stock <= 0:
            return self.format_out_of_stock(name)
        
        return self.format_product_available(name, price_formatted, stock)

