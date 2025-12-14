"""Configuration settings for the KOFA chatbot."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Supabase (defaults for testing - override with real values in production)
    supabase_url: str = "http://localhost:54321"
    supabase_key: str = "test-key-for-development"
    
    # Naira Ramp
    naira_ramp_base_url: str = "http://localhost:8001"
    
    # Application
    order_reservation_minutes: int = 15
    min_stock_threshold: int = 1
    
    # Gemini AI (optional - for enhanced chatbot features)
    gemini_api_key: str = ""
    
    # WhatsApp Business API (optional)
    whatsapp_phone_id: str = ""
    whatsapp_access_token: str = ""
    whatsapp_verify_token: str = "kofa_webhook_verify_token"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# Global settings instance
settings = Settings()
