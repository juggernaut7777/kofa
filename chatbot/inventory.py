"""Inventory management with Supabase backend and mock data fallback."""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from .config import settings

# Try to import Supabase, but allow fallback to mock data
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None


# Mock product data for testing without Supabase
MOCK_PRODUCTS = [
    {
        "id": "prod-001",
        "name": "Premium Red Sneakers",
        "price_ngn": 45000,
        "stock_level": 12,
        "description": "Fresh kicks for the street",
        "voice_tags": ["sneakers", "red shoe", "kicks", "trainers"],
        "category": "footwear"
    },
    {
        "id": "prod-002",
        "name": "Lagos Beach Shorts",
        "price_ngn": 8500,
        "stock_level": 25,
        "description": "Perfect for that Elegushi flex",
        "voice_tags": ["shorts", "beach wear", "summer", "knickers"],
        "category": "clothing"
    },
    {
        "id": "prod-003",
        "name": "Ankara Print Shirt",
        "price_ngn": 15000,
        "stock_level": 8,
        "description": "Traditional meets modern",
        "voice_tags": ["ankara", "shirt", "native", "African print"],
        "category": "clothing"
    },
    {
        "id": "prod-004",
        "name": "Designer Sunglasses",
        "price_ngn": 22000,
        "stock_level": 15,
        "description": "Block out Lagos sun in style",
        "voice_tags": ["shades", "glasses", "sunglasses", "sun glasses"],
        "category": "accessories"
    },
    {
        "id": "prod-005",
        "name": "Gold Chain Necklace",
        "price_ngn": 85000,
        "stock_level": 5,
        "description": "Shine like Burna Boy",
        "voice_tags": ["chain", "jewelry", "gold", "necklace", "neck piece"],
        "category": "jewelry"
    },
    {
        "id": "prod-006",
        "name": "Leather Wallet",
        "price_ngn": 12000,
        "stock_level": 20,
        "description": "Keep your Naira secure",
        "voice_tags": ["wallet", "leather", "purse", "money holder"],
        "category": "accessories"
    },
]


@dataclass
class Product:
    """Represents a product in inventory."""
    id: str
    name: str
    price_ngn: float
    stock_level: int
    voice_tags: List[str] = field(default_factory=list)
    description: str = ""
    category: str = ""


@dataclass
class Order:
    """Represents a customer order."""
    order_id: str
    customer_phone: str
    items: List[Dict[str, Any]]
    status: str
    total_amount_ngn: float
    payment_ref: Optional[str] = None


class InventoryManager:
    """
    Manages product inventory, dual-currency pricing, and stock levels.
    Uses Supabase when configured, falls back to mock data otherwise.
    """

    def __init__(self):
        self._supabase: Optional[Client] = None
        self._use_mock = False
        self._mock_products = [p.copy() for p in MOCK_PRODUCTS]  # Local copy for mutations
        
    def _check_supabase_connection(self) -> bool:
        """Check if Supabase is properly configured and available."""
        if not SUPABASE_AVAILABLE:
            return False
        # Check if we have valid-looking credentials
        if not settings.supabase_url or settings.supabase_url == "http://localhost:54321":
            if not settings.supabase_key or settings.supabase_key == "test-key-for-development":
                return False
        return True

    @property
    def supabase(self) -> Optional[Client]:
        """Lazy initialization of Supabase client."""
        if self._use_mock:
            return None
        if self._supabase is None:
            if not self._check_supabase_connection():
                self._use_mock = True
                print("⚠️  Supabase not configured - using mock data")
                return None
            try:
                from supabase import create_client
                self._supabase = create_client(settings.supabase_url, settings.supabase_key)
            except Exception as e:
                print(f"⚠️  Supabase connection failed: {e} - using mock data")
                self._use_mock = True
                return None
        return self._supabase

    def _dict_to_product(self, data: dict) -> Product:
        """Convert a dictionary to a Product object."""
        return Product(
            id=data.get("id", ""),
            name=data.get("name", ""),
            price_ngn=data.get("price_ngn", 0.0),
            stock_level=data.get("stock_level", 0),
            voice_tags=data.get("voice_tags") or [],
            description=data.get("description") or "",
            category=data.get("category") or ""
        )

    def _dict_to_order(self, data: dict) -> Order:
        """Convert a dictionary to an Order object."""
        return Order(
            order_id=data.get("order_id", ""),
            customer_phone=data.get("customer_phone", ""),
            items=data.get("items", []),
            status=data.get("status", "Pending"),
            total_amount_ngn=data.get("total_amount_ngn", 0.0),
            payment_ref=data.get("payment_ref")
        )

    def add_product(self, name_or_dict, stock: int = 0, price_ngn: float = 0.0, price_usd: float = 0.0) -> dict:
        """Adds a new product to inventory. Accepts either a dict or positional args."""
        import uuid
        
        # Handle dict input (from KOFA 2.0 API)
        if isinstance(name_or_dict, dict):
            product = {
                "id": name_or_dict.get("id", f"prod-{str(uuid.uuid4())[:8]}"),
                "name": name_or_dict.get("name", "Unnamed Product"),
                "stock_level": name_or_dict.get("stock_level", 0),
                "price_ngn": name_or_dict.get("price_ngn", 0.0),
                "voice_tags": name_or_dict.get("voice_tags", [name_or_dict.get("name", "").lower()]),
                "description": name_or_dict.get("description", ""),
                "category": name_or_dict.get("category", "")
            }
        else:
            # Original positional args
            product = {
                "id": f"prod-{str(uuid.uuid4())[:8]}",
                "name": name_or_dict,
                "stock_level": stock,
                "price_ngn": price_ngn,
                "voice_tags": [name_or_dict.lower()],
                "description": "",
                "category": ""
            }
        
        # Use mock data if Supabase unavailable
        if self._use_mock or self.supabase is None:
            self._mock_products.append(product)
            return product
        
        data = self.supabase.table("products").insert(product).execute()
        return data.data[0] if data.data else product

    def search_product(self, query: str) -> Optional[Product]:
        """
        Search for a product by name or voice tag.
        Returns the first matching product as a Product object.
        """
        query_lower = query.lower()
        
        # Use mock data if Supabase unavailable
        if self._use_mock or self.supabase is None:
            for prod in self._mock_products:
                # Check name match
                if query_lower in prod["name"].lower():
                    return self._dict_to_product(prod)
                # Check voice tags
                for tag in prod.get("voice_tags", []):
                    if query_lower in tag.lower() or tag.lower() in query_lower:
                        return self._dict_to_product(prod)
            return None
        
        # 1. Try name match using ILIKE
        response = self.supabase.table("products").select("*").ilike("name", f"%{query}%").execute()
        if response.data:
            return self._dict_to_product(response.data[0])
        
        # 2. Fallback: fetch all and check voice tags
        all_products = self.supabase.table("products").select("*").execute()
        for prod in all_products.data:
            tags = prod.get("voice_tags") or []
            # Check if query matches any voice tag
            for tag in tags:
                if query_lower in tag.lower() or tag.lower() in query_lower:
                    return self._dict_to_product(prod)
        
        return None

    def get_product_by_name(self, name: str) -> Optional[dict]:
        """Finds a product by name (case-insensitive partial match or voice tag)."""
        name_lower = name.lower()
        query_words = name_lower.split()  # Split query into individual words
        
        def matches_product(prod: dict) -> bool:
            """Check if any query word matches product name or tags."""
            prod_name_lower = prod["name"].lower()
            tags = [t.lower() for t in prod.get("voice_tags", [])]
            
            for word in query_words:
                # Skip very short words (articles, etc)
                if len(word) < 3:
                    continue
                    
                # Check if word is in product name
                if word in prod_name_lower:
                    return True
                
                # Check if word matches any voice tag
                for tag in tags:
                    if word in tag or tag in word:
                        return True
            
            # Also check full query against tags (for multi-word tags like "red shoe")
            for tag in tags:
                if name_lower in tag or tag in name_lower:
                    return True
            
            return False
        
        # Use mock data if Supabase unavailable
        if self._use_mock or self.supabase is None:
            for prod in self._mock_products:
                if matches_product(prod):
                    return prod
            return None
        
        # Try name match first using ILIKE
        response = self.supabase.table("products").select("*").ilike("name", f"%{name}%").execute()
        if response.data:
            return response.data[0]
            
        # Fallback: check all products with improved matching
        all_products = self.supabase.table("products").select("*").execute()
        for prod in all_products.data:
            if matches_product(prod):
                return prod
                
        return None

    def check_stock(self, product_id: str) -> int:
        """Check the stock level for a product by ID."""
        # Use mock data if Supabase unavailable
        if self._use_mock or self.supabase is None:
            for prod in self._mock_products:
                if prod["id"] == product_id:
                    return prod.get("stock_level", 0)
            return 0
        
        response = self.supabase.table("products").select("stock_level").eq("id", product_id).execute()
        if response.data:
            return response.data[0].get("stock_level", 0)
        return 0

    def decrement_stock(self, product_id: str, quantity: int) -> bool:
        """
        Decrement stock for a product. Returns True if successful, False if insufficient stock.
        """
        # Handle mock mode
        if self._use_mock or self.supabase is None:
            for prod in self._mock_products:
                if str(prod.get("id")) == product_id:
                    if prod.get("stock_level", 0) >= quantity:
                        prod["stock_level"] -= quantity
                        return True
                    return False
            return False
        
        # Get current stock
        response = self.supabase.table("products").select("stock_level").eq("id", product_id).execute()
        if not response.data:
            return False
            
        current_stock = response.data[0].get("stock_level", 0)
        
        # Check if we have enough stock
        if current_stock < quantity:
            return False
        
        # Update stock
        new_stock = current_stock - quantity
        self.supabase.table("products").update({"stock_level": new_stock}).eq("id", product_id).execute()
        return True

    def update_stock(self, product_id: str, quantity_delta: int) -> Optional[dict]:
        """Updates stock level (positive for restock, negative for sale)."""
        # Handle mock mode
        if self._use_mock or self.supabase is None:
            for prod in self._mock_products:
                if str(prod.get("id")) == product_id:
                    old_stock = prod.get("stock_level", 0)
                    prod["stock_level"] = max(0, old_stock + quantity_delta)
                    return {"stock_level": prod["stock_level"]}
            return None
        
        response = self.supabase.table("products").select("stock_level").eq("id", product_id).execute()
        if not response.data:
            return None
            
        current_stock = response.data[0]["stock_level"]
        new_stock = max(0, current_stock + quantity_delta)
        
        update_response = self.supabase.table("products").update({"stock_level": new_stock}).eq("id", product_id).execute()
        return update_response.data[0] if update_response.data else None

    def update_product_fields(self, product_id: str, updates: dict) -> Optional[dict]:
        """Update product fields (name, price, stock, description, etc.)."""
        # Handle mock mode
        if self._use_mock or self.supabase is None:
            for prod in self._mock_products:
                if str(prod.get("id")) == product_id:
                    for key, value in updates.items():
                        if value is not None:
                            prod[key] = value
                    return prod
            return None
        
        # Clean updates - only include non-None values
        clean_updates = {k: v for k, v in updates.items() if v is not None}
        if not clean_updates:
            return None
            
        response = self.supabase.table("products").update(clean_updates).eq("id", product_id).execute()
        return response.data[0] if response.data else None
    
    def list_products(self) -> List[dict]:
        """List all products."""
        # Use mock data if Supabase unavailable
        if self._use_mock or self.supabase is None:
            return self._mock_products
        
        response = self.supabase.table("products").select("*").execute()
        return response.data

    def create_order(self, customer_phone: str, items: List[Dict], total_amount_ngn: float) -> Optional[Order]:
        """Create a new order."""
        order_data = {
            "customer_phone": customer_phone,
            "items": items,
            "status": "Pending",
            "total_amount_ngn": total_amount_ngn,
            "payment_ref": None
        }
        response = self.supabase.table("orders").insert(order_data).execute()
        if response.data:
            return self._dict_to_order(response.data[0])
        return None

    def smart_search_products(self, query: str) -> List[dict]:
        """
        Smart product search that ALWAYS tries to find matching products.
        Uses multiple strategies to avoid false "not found" responses.
        
        Returns: List of matching products (may be empty only if truly nothing matches)
        """
        from fuzzywuzzy import fuzz
        from .conversation import expand_query_with_synonyms, get_all_synonyms
        
        query_lower = query.lower().strip()
        query_words = query_lower.split()
        all_products = self.list_products()
        
        if not all_products:
            return []
        
        # Score each product based on multiple matching strategies
        scored_products = []
        
        for product in all_products:
            score = 0
            name_lower = product.get("name", "").lower()
            description_lower = product.get("description", "").lower()
            category_lower = product.get("category", "").lower()
            tags = [t.lower() for t in product.get("voice_tags", [])]
            
            # ========== STRATEGY 1: Exact name match (highest priority) ==========
            if query_lower in name_lower:
                score += 100
            
            # ========== STRATEGY 2: Exact voice tag match ==========
            for tag in tags:
                if query_lower == tag or query_lower in tag or tag in query_lower:
                    score += 80
                    break
            
            # ========== STRATEGY 3: Word-by-word matching ==========
            for word in query_words:
                if len(word) < 2:  # Skip very short words
                    continue
                
                # Check word in name
                if word in name_lower:
                    score += 40
                
                # Check word in tags
                for tag in tags:
                    if word in tag:
                        score += 35
                        break
                
                # Check word in description
                if word in description_lower:
                    score += 15
                
                # Check word in category
                if word in category_lower:
                    score += 25
            
            # ========== STRATEGY 4: Synonym matching ==========
            for word in query_words:
                if len(word) < 3:
                    continue
                synonyms = get_all_synonyms(word)
                for synonym in synonyms:
                    if synonym in name_lower:
                        score += 30
                    for tag in tags:
                        if synonym in tag:
                            score += 25
                            break
                    if synonym in category_lower:
                        score += 20
            
            # ========== STRATEGY 5: Fuzzy matching (for typos/variations) ==========
            # Check fuzzy match against product name
            name_fuzzy = fuzz.partial_ratio(query_lower, name_lower)
            if name_fuzzy > 70:
                score += name_fuzzy // 4  # Up to 25 points
            
            # Check fuzzy match against each tag
            for tag in tags:
                tag_fuzzy = fuzz.ratio(query_lower, tag)
                if tag_fuzzy > 70:
                    score += tag_fuzzy // 5  # Up to 20 points
                    break
            
            # ========== STRATEGY 6: Category fallback ==========
            # If query seems to be a category, include all from that category
            category_terms = {
                "footwear": ["shoe", "shoes", "sneaker", "sneakers", "canvas", "kicks"],
                "clothing": ["shirt", "shorts", "jeans", "trouser", "top", "clothes"],
                "accessories": ["bag", "wallet", "chain", "glasses", "shades"],
                "jewelry": ["chain", "necklace", "gold", "ring", "earring"],
                "electronics": ["charger", "phone", "cable", "earphones"]
            }
            
            for cat, terms in category_terms.items():
                if any(term in query_lower for term in terms):
                    if category_lower == cat:
                        score += 20
            
            if score > 0:
                scored_products.append((product, score))
        
        # Sort by score (highest first) and return products
        scored_products.sort(key=lambda x: x[1], reverse=True)
        
        # Return products with meaningful scores
        results = [p for p, s in scored_products if s >= 20]
        
        # If no results, try even more aggressive matching
        if not results:
            # Last resort: return any product that contains ANY query word
            for product in all_products:
                name_lower = product.get("name", "").lower()
                tags = [t.lower() for t in product.get("voice_tags", [])]
                
                for word in query_words:
                    if len(word) >= 3:
                        if word in name_lower or any(word in t for t in tags):
                            if product not in results:
                                results.append(product)
        
        return results

    def find_product_by_selection(self, selection: str, product_list: List[dict]) -> Optional[dict]:
        """
        Find a product from a list based on user selection.
        Handles: "1", "first", "the red one", "green yam", etc.
        PRIORITIZES exact name matches over partial matches.
        """
        from fuzzywuzzy import fuzz
        
        selection_lower = selection.lower().strip()
        
        # Handle numeric selection: "1", "2", etc.
        if selection_lower.isdigit():
            idx = int(selection_lower) - 1
            if 0 <= idx < len(product_list):
                return product_list[idx]
        
        # Handle ordinal selection: "first", "second", etc.
        ordinals = {"first": 0, "second": 1, "third": 2, "1st": 0, "2nd": 1, "3rd": 2}
        if selection_lower in ordinals:
            idx = ordinals[selection_lower]
            if idx < len(product_list):
                return product_list[idx]
        
        # Clean selection - remove common filler words
        clean_selection = selection_lower
        for filler in ["the", "one", "please", "i want", "give me", "show me"]:
            clean_selection = clean_selection.replace(filler, "")
        clean_selection = clean_selection.strip()
        
        # PRIORITY 1: Check for exact name match (case insensitive)
        for product in product_list:
            name_lower = product.get("name", "").lower()
            if clean_selection == name_lower or clean_selection in name_lower:
                return product
        
        # PRIORITY 2: Check if full selection phrase appears in name
        for product in product_list:
            name_lower = product.get("name", "").lower()
            # Calculate how many words from selection appear IN ORDER in name
            if all(word in name_lower for word in clean_selection.split() if len(word) >= 3):
                return product
        
        # PRIORITY 3: Score-based matching (fallback)
        best_match = None
        best_score = 0
        
        for product in product_list:
            name_lower = product.get("name", "").lower()
            tags = [t.lower() for t in product.get("voice_tags", [])]
            score = 0
            
            # Full phrase fuzzy match against name
            name_fuzzy = fuzz.ratio(clean_selection, name_lower)
            score += name_fuzzy
            
            # Check word-by-word
            selection_words = clean_selection.split()
            words_matched = 0
            for word in selection_words:
                if len(word) >= 3:
                    if word in name_lower:
                        words_matched += 1
                        score += 20
                    for tag in tags:
                        if word in tag:
                            score += 10
                            break
            
            # Bonus for matching more words
            if len(selection_words) > 0:
                match_ratio = words_matched / len(selection_words)
                score += int(match_ratio * 50)
            
            if score > best_score:
                best_score = score
                best_match = product
        
        return best_match

