from pydantic_settings import BaseSettings
from typing import Optional, List
import os
from urllib.parse import quote_plus

class Settings(BaseSettings):
    PROJECT_NAME: str = "Unified Login System"
    API_V1_STR: str = "/api/v1"
    
    # Database
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "!QAZ@WSX"
    MYSQL_SERVER: str = "127.0.0.1"
    MYSQL_PORT: str = "3306"
    MYSQL_DB: str = "image_edit_db"
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"mysql+pymysql://{self.MYSQL_USER}:{quote_plus(self.MYSQL_PASSWORD)}@{self.MYSQL_SERVER}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None

    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # Security
    SECRET_KEY: str = "YOUR_SECRET_KEY_CHANGE_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # AES Encryption Key for sensitive data (32 bytes)
    SENSITIVE_DATA_KEY: str = "YOUR_32_BYTE_KEY_FOR_AES_ENCRYPT"

    # WeChat Configuration
    WECHAT_APP_ID: str = "YOUR_WECHAT_APP_ID"
    WECHAT_APP_SECRET: str = "YOUR_WECHAT_APP_SECRET"
    WECHAT_TOKEN: str = "YOUR_WECHAT_TOKEN"
    WECHAT_ENCODING_AES_KEY: Optional[str] = None
    
    # Alibaba Cloud Configuration
    ALIBABA_CLOUD_ACCESS_KEY_ID: str = "YOUR_ACCESS_KEY_ID"
    ALIBABA_CLOUD_ACCESS_KEY_SECRET: str = "YOUR_ACCESS_KEY_SECRET"

    # WeChat Pay Configuration
    WECHAT_PAY_APP_ID: Optional[str] = None
    WECHAT_PAY_MCH_ID: Optional[str] = None
    WECHAT_PAY_API_KEY: Optional[str] = None
    WECHAT_PAY_API_V3_KEY: Optional[str] = None
    WECHAT_PAY_CERT_PATH: Optional[str] = None
    WECHAT_PAY_CERT_SERIAL_NO: Optional[str] = None
    WECHAT_PAY_MCH_PRIVATE_KEY_PATH: Optional[str] = None
    WECHAT_PAY_PLATFORM_CERT_PATH: Optional[str] = None
    WECHAT_PAY_NOTIFY_URL: Optional[str] = None

    # Alipay Configuration
    ALIPAY_APP_ID: Optional[str] = None
    ALIPAY_PRIVATE_KEY: Optional[str] = None
    ALIPAY_PRIVATE_KEY_PATH: Optional[str] = None
    ALIPAY_PUBLIC_KEY: Optional[str] = None
    ALIPAY_NOTIFY_URL: Optional[str] = None
    ALIPAY_RETURN_URL: Optional[str] = None
    ALIPAY_GATEWAY: Optional[str] = None
    ALIPAY_APP_CERT_PATH: Optional[str] = None
    ALIPAY_ALIPAY_CERT_PATH: Optional[str] = None
    ALIPAY_ALIPAY_ROOT_CERT_PATH: Optional[str] = None

    # Order Configuration
    ORDER_EXPIRE_MINUTES: int = 30
    QR_CODE_EXPIRE_MINUTES: int = 15
    PAYMENT_QUERY_RETRY_MAX: int = 5
    
    # Captcha Configuration
    CAPTCHA_EXPIRE_SECONDS: int = 300  # 5 minutes

    # Machine ID for ID Generator (0-99)
    MACHINE_ID: int = 1

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
