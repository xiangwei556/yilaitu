from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Image Edit API"
    VERSION: str = "1.0.0"
    
    # Database settings
    DATABASE_URL: str = "sqlite:///./image_edit.db"
    
    # Redis settings
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security settings
    SECRET_KEY: str = "your-secret-key-change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # WeChat settings
    WECHAT_APP_ID: str = "your-wechat-app-id"
    WECHAT_APP_SECRET: str = "your-wechat-app-secret"
    WECHAT_REDIRECT_URI: str = "your-wechat-redirect-uri"
    
    # SMS settings
    SMS_ACCESS_KEY_ID: str = "your-sms-access-key-id"
    SMS_ACCESS_KEY_SECRET: str = "your-sms-access-key-secret"
    SMS_SIGN_NAME: str = "your-sms-sign-name"
    SMS_TEMPLATE_CODE: str = "your-sms-template-code"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()