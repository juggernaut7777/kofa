"""Intent recognition for customer messages."""
from enum import Enum
from typing import Optional
from fuzzywuzzy import fuzz


class Intent(str, Enum):
    """Possible customer intents."""
    PRICE_INQUIRY = "price_inquiry"
    AVAILABILITY_CHECK = "availability_check"
    PURCHASE = "purchase"
    GREETING = "greeting"
    HELP = "help"
    PAYMENT_CONFIRMATION = "payment_confirmation"
    ORDER_STATUS = "order_status"
    UNKNOWN = "unknown"


class IntentRecognizer:
    """Recognizes customer intent from message text."""
    
    # Keywords for each intent (including Nigerian English/Pidgin)
    PRICE_KEYWORDS = [
        "price", "cost", "how much", "rate", "amount", "naira",
        "how far", "wetin be the price", "na how much", "how much you dey sell",
        "how much be", "wetin e cost", "na wetin"
    ]
    AVAILABILITY_KEYWORDS = [
        "available", "have", "stock", "in stock", "do you have", "get",
        "you get", "una get", "you dey sell", "hope you get", "make I see",
        "abeg you get", "I need", "I wan buy", "you fit sell me"
    ]
    PURCHASE_KEYWORDS = [
        "buy", "purchase", "order", "get", "want", "need", "yes", "okay", "ok", "sure",
        "I go buy", "I wan buy", "make I buy", "abeg sell me", "I dey buy",
        "send link", "gimme", "make I pay", "I go pay", "proceed"
    ]
    GREETING_KEYWORDS = [
        "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
        "how far", "wetin dey", "sup", "oya", "abeg"
    ]
    HELP_KEYWORDS = [
        "help", "assist", "support", "what can", "how do",
        "abeg help me", "I no understand", "wetin I go do"
    ]
    PAYMENT_CONFIRMATION_KEYWORDS = [
        "i paid", "i have paid", "i don pay", "don pay", "done paying",
        "payment made", "sent the money", "transferred", "i don transfer",
        "check my payment", "confirm payment", "payment successful"
    ]
    ORDER_STATUS_KEYWORDS = [
        "order status", "my order", "where is my order", "tracking",
        "delivery", "when will", "how long", "where my order"
    ]
    
    def __init__(self, fuzzy_threshold: int = 70):
        """
        Initialize the intent recognizer.
        
        Args:
            fuzzy_threshold: Minimum fuzzy match score (0-100) to consider a match
        """
        self.fuzzy_threshold = fuzzy_threshold
    
    def recognize(self, message: str) -> Intent:
        """
        Recognize the intent from a message.
        
        Args:
            message: The customer's message text
            
        Returns:
            The recognized intent
        """
        message_lower = message.lower().strip()
        
        # Product indicators - presence suggests product inquiry
        product_indicators = ['canvas', 'shoe', 'shirt', 'bag', 'jeans', 'charger', 
                             'trouser', 'joggers', 'polo', 'packing', 'sneakers']
        has_product_mention = any(word in message_lower for word in product_indicators)
        
        # Check for help requests early - especially "how do/how to" questions
        # These should take priority over purchase intent
        is_question_about_how = 'how do' in message_lower or 'how to' in message_lower or 'what can' in message_lower
        if is_question_about_how or self._matches_keywords(message_lower, self.HELP_KEYWORDS):
            # But if it seems like a purchase confirmation, let purchase take precedence
            if not any(word in message_lower for word in ['yes', 'okay', 'ok', 'sure', 'proceed', 'buy now']):
                return Intent.HELP
        
        # Check purchase intent (most specific action) - but only for clear purchase signals
        # Words that indicate actual purchase, not inquiry about purchase
        clear_purchase_signals = ['yes', 'okay', 'ok', 'sure', 'buy', 'buy now', 'purchase', 'purchase it', 
                                  'i\'ll take it', 'proceed', 'send link', 'make i pay', 
                                  'i go pay', 'i dey buy', 'gimme', 'abeg sell me']
        if any(signal in message_lower for signal in clear_purchase_signals):
            return Intent.PURCHASE
        
        # Check "I want to buy" patterns (intent to purchase)
        if 'i want' in message_lower or 'i wan' in message_lower:
            if 'buy' in message_lower:
                return Intent.PURCHASE
        
        # Check for price inquiry (specific)
        if self._matches_keywords(message_lower, self.PRICE_KEYWORDS):
            return Intent.PRICE_INQUIRY
        
        # Check for availability
        if self._matches_keywords(message_lower, self.AVAILABILITY_KEYWORDS):
            return Intent.AVAILABILITY_CHECK
        
        # Check for payment confirmation
        if self._matches_keywords(message_lower, self.PAYMENT_CONFIRMATION_KEYWORDS):
            return Intent.PAYMENT_CONFIRMATION
        
        # Check for order status
        if self._matches_keywords(message_lower, self.ORDER_STATUS_KEYWORDS):
            return Intent.ORDER_STATUS
        
        # Check for greetings LAST (least specific)
        # But only if there are NO product-related terms
        if self._matches_keywords(message_lower, self.GREETING_KEYWORDS):
            if not has_product_mention:
                return Intent.GREETING
            else:
                # Likely availability check with casual greeting
                return Intent.AVAILABILITY_CHECK
        
        return Intent.UNKNOWN
    
    def _matches_keywords(self, message: str, keywords: list[str]) -> bool:
        """
        Check if message matches any of the keywords using fuzzy matching.
        
        Args:
            message: The message to check
            keywords: List of keywords to match against
            
        Returns:
            True if any keyword matches
        """
        for keyword in keywords:
            # Direct substring match
            if keyword in message:
                return True
            
            # Fuzzy match for individual words
            words = message.split()
            for word in words:
                if fuzz.ratio(word, keyword) >= self.fuzzy_threshold:
                    return True
        
        return False
    
    def extract_product_query(self, message: str) -> Optional[str]:
        """
        Extract product name/description from message.
        
        Args:
            message: The customer's message
            
        Returns:
            Extracted product query or None
        """
        message_lower = message.lower().strip()
        
        # Nigerian English filler words to remove
        nigerian_fillers = [
            "abeg", "oya", "na", "wetin", "dey", "fit", "una", "am", "e", "o",
            "that", "this", "my", "brother", "sister", "hope", "you", "me", "I",
            "wan", "make", "for", "be", "go", "don"
        ]
        
        # Combine all filters
        all_filters = set(
            ["the", "a", "an", "?", ".", ",", "!", "get", "need", "have"] +
            nigerian_fillers
        )
        
        words = message_lower.split()
        product_words = []
        
        for word in words:
            # Clean punctuation
            clean_word = word.strip("?.,!")
            # Keep if not a filter word and meaningful length
            if clean_word not in all_filters and len(clean_word) > 1:
                product_words.append(clean_word)
        
        if product_words:
            return " ".join(product_words)
        
        return None
