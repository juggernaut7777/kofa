"""
Conversation state management for smart multi-turn chatbot.
Tracks context so the bot remembers what products were discussed.
"""
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta


class ConversationState:
    """Tracks conversation context for a user."""
    
    def __init__(self):
        self.last_products: List[dict] = []  # Products from last search
        self.current_product: Optional[dict] = None  # Currently selected product
        self.awaiting_selection: bool = False  # Waiting for user to pick from list
        self.last_query: str = ""
        self.last_updated: datetime = datetime.now()
    
    def is_expired(self, timeout_minutes: int = 30) -> bool:
        """Check if conversation has expired due to inactivity."""
        return datetime.now() - self.last_updated > timedelta(minutes=timeout_minutes)
    
    def reset(self):
        """Reset conversation state."""
        self.last_products = []
        self.current_product = None
        self.awaiting_selection = False
        self.last_query = ""
        self.last_updated = datetime.now()
    
    def set_products(self, products: List[dict], query: str):
        """Store products from a search."""
        self.last_products = products
        self.last_query = query
        self.awaiting_selection = len(products) > 1
        self.current_product = products[0] if len(products) == 1 else None
        self.last_updated = datetime.now()
    
    def select_product(self, product: dict):
        """Select a specific product."""
        self.current_product = product
        self.awaiting_selection = False
        self.last_updated = datetime.now()


class ConversationManager:
    """Manages conversation states for all users."""
    
    def __init__(self):
        self._states: Dict[str, ConversationState] = {}
    
    def get_state(self, user_id: str) -> ConversationState:
        """Get or create conversation state for a user."""
        if user_id not in self._states:
            self._states[user_id] = ConversationState()
        
        state = self._states[user_id]
        
        # Reset if expired
        if state.is_expired():
            state.reset()
        
        return state
    
    def clear_state(self, user_id: str):
        """Clear state for a user."""
        if user_id in self._states:
            self._states[user_id].reset()


# Global conversation manager instance
conversation_manager = ConversationManager()


# =============================================================================
# SYNONYM DATABASE - Map common terms to product-related words
# =============================================================================
PRODUCT_SYNONYMS = {
    # Footwear synonyms
    "shoes": ["shoe", "sneakers", "sneaker", "canvas", "kicks", "trainers", "trainer", "joggers", "footwear"],
    "sneakers": ["sneaker", "canvas", "kicks", "trainers", "shoes", "shoe", "joggers"],
    "canvas": ["sneakers", "kicks", "shoes", "trainers"],
    "kicks": ["sneakers", "canvas", "shoes", "trainers"],
    "trainers": ["sneakers", "canvas", "shoes", "kicks"],
    "slippers": ["slides", "sandals", "flip flops", "pam slippers"],
    
    # Clothing synonyms
    "shirt": ["shirts", "top", "tops", "blouse", "polo"],
    "t-shirt": ["tshirt", "tee", "top", "polo", "round neck"],
    "trouser": ["trousers", "pants", "jeans", "slacks", "chinos"],
    "jeans": ["jean", "denim", "trouser", "pants"],
    "shorts": ["short", "knickers", "boxers"],
    
    # Accessories synonyms
    "bag": ["bags", "handbag", "purse", "backpack", "satchel"],
    "purse": ["bag", "handbag", "wallet"],
    "wallet": ["purse", "money holder", "card holder"],
    "chain": ["necklace", "neck piece", "pendant", "jewelry"],
    "glasses": ["sunglasses", "shades", "specs", "eyewear"],
    "shades": ["sunglasses", "glasses", "specs"],
    
    # Electronics synonyms
    "charger": ["charging cable", "cable", "wire", "charging wire", "power cable"],
    "phone": ["mobile", "cell", "smartphone"],
    "earphones": ["earbuds", "headphones", "airpods", "pods"],
    
    # Colors - expand color mentions
    "red": ["crimson", "scarlet", "maroon", "burgundy"],
    "blue": ["navy", "azure", "royal blue", "sky blue"],
    "white": ["cream", "off-white", "ivory"],
    "black": ["dark", "ebony", "jet black"],
    "gold": ["golden", "yellow gold"],
}


def expand_query_with_synonyms(query: str) -> List[str]:
    """
    Expand a query with synonyms.
    Input: "red shoes"
    Output: ["red shoes", "red shoe", "red sneakers", "red canvas", ...]
    """
    words = query.lower().split()
    expanded_terms = [query.lower()]
    
    for word in words:
        if word in PRODUCT_SYNONYMS:
            for synonym in PRODUCT_SYNONYMS[word]:
                # Replace word with synonym in original query
                new_query = query.lower().replace(word, synonym)
                if new_query not in expanded_terms:
                    expanded_terms.append(new_query)
    
    return expanded_terms


def get_all_synonyms(word: str) -> List[str]:
    """Get all synonyms for a word."""
    word_lower = word.lower()
    synonyms = [word_lower]
    
    if word_lower in PRODUCT_SYNONYMS:
        synonyms.extend(PRODUCT_SYNONYMS[word_lower])
    
    # Also check if this word is a synonym of something else
    for key, values in PRODUCT_SYNONYMS.items():
        if word_lower in values and key not in synonyms:
            synonyms.append(key)
            synonyms.extend([v for v in values if v not in synonyms])
    
    return list(set(synonyms))
