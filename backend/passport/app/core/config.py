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
    WECHAT_ENCODING_AES_KEY: str = "YOUR_WECHAT_ENCODING_AES_KEY"
    
    # Captcha Configuration
    CAPTCHA_EXPIRE_SECONDS: int = 300  # 5 minutes

    # Aliyun SMS
    ALIBABA_CLOUD_ACCESS_KEY_ID: Optional[str] = None
    ALIBABA_CLOUD_ACCESS_KEY_SECRET: Optional[str] = None

    # 微信支付配置
    WECHAT_PAY_APP_ID: Optional[str] = None
    WECHAT_PAY_MCH_ID: Optional[str] = None
    WECHAT_PAY_API_KEY: Optional[str] = None
    WECHAT_PAY_CERT_PATH: Optional[str] = None  # 证书路径
    WECHAT_PAY_NOTIFY_URL: Optional[str] = None
    WECHAT_PAY_API_V3_KEY: Optional[str] = None  # API v3密钥
    WECHAT_PAY_CERT_SERIAL_NO: Optional[str] = None  # 证书序列号
    WECHAT_PAY_MCH_PRIVATE_KEY_PATH: Optional[str] = None  # 商户私钥路径
    WECHAT_PAY_PLATFORM_CERT_PATH: Optional[str] = None  # 微信支付平台证书路径

    # 支付宝配置
    ALIPAY_APP_ID: Optional[str] = None
    ALIPAY_PRIVATE_KEY: Optional[str] = None
    ALIPAY_PRIVATE_KEY_PATH: Optional[str] = None  # 商户私钥证书路径
    ALIPAY_PUBLIC_KEY: Optional[str] = None
    ALIPAY_NOTIFY_URL: Optional[str] = None
    ALIPAY_RETURN_URL: Optional[str] = None
    ALIPAY_SIGN_TYPE: str = "RSA2"
    ALIPAY_GATEWAY: str = "https://openapi.alipay.com/gateway.do"  # 生产环境
    # ALIPAY_GATEWAY: str = "https://openapi.alipaydev.com/gateway.do"  # 沙箱环境
    
    # 支付宝证书配置
    ALIPAY_APP_CERT_PATH: Optional[str] = None  # 应用公钥证书路径
    ALIPAY_ALIPAY_CERT_PATH: Optional[str] = None  # 支付宝公钥证书路径
    ALIPAY_ALIPAY_ROOT_CERT_PATH: Optional[str] = None  # 支付宝根证书路径

    # 订单配置
    ORDER_EXPIRE_MINUTES: int = 30  # 订单过期时间(分钟)
    QR_CODE_EXPIRE_MINUTES: int = 15  # 二维码过期时间(分钟)
    PAYMENT_QUERY_RETRY_MAX: int = 5  # 支付状态查询最大重试次数

    # 机器ID配置（多服务器部署时，每台服务器配置不同的值 0-99）
    MACHINE_ID: int = 0


    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        # 允许从项目根目录或当前目录查找.env文件
        extra = "ignore"

settings = Settings()
