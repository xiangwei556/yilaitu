# -*- coding: utf-8 -*-
"""
应用配置文件
用于管理应用程序的所有配置信息，包括TOS相关配置
"""
import os

# TOS配置类
class TOSConfig:
    """火山引擎对象存储(TOS)配置类"""
    # 从环境变量获取配置，如果环境变量未设置则使用默认值或从CSV文件读取
    # 注意：这些默认值仅用于开发环境，生产环境应该通过环境变量或配置文件设置
    
    # Access Key ID - 从环境变量获取或使用默认值
    ACCESS_KEY = os.getenv("TOS_ACCESS_KEY", "")
    
    # Secret Access Key - 从环境变量获取或使用默认值
    SECRET_KEY = os.getenv("TOS_SECRET_KEY", "")
    
    # TOS服务端点 - 使用从CSV中获取的实际endpoint
    ENDPOINT = os.getenv("TOS_ENDPOINT", "tos-cn-guangzhou.volces.com")
    
    # TOS区域 - 使用从CSV中获取的实际region
    REGION = os.getenv("TOS_REGION", "cn-guangzhou")
    
    # 默认存储桶名称
    BUCKET = os.getenv("TOS_BUCKET", "image-edit-hsyq")
    
    # CSV配置文件路径（如果需要从CSV加载配置）
    CSV_CONFIG_PATH = os.getenv("TOS_CSV_CONFIG_PATH", "用户信息.csv")
    
    # 上传文件大小限制（字节）
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    # 允许的图片格式
    ALLOWED_IMAGE_FORMATS = ["jpg", "jpeg", "png", "gif", "webp"]

# 应用配置类
class AppConfig:
    """应用程序通用配置类"""
    # 应用名称
    APP_NAME = "Image Edit Backend"
    
    # 应用版本
    APP_VERSION = "1.0.0"
    
    # 是否启用调试模式
    DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    
    # ARK API密钥
    ARK_API_KEY = os.getenv("ARK_API_KEY", "")
    
    # 兼容性配置，保持原有API_KEY设置
    API_KEY = os.getenv("API_KEY", ARK_API_KEY)

# 创建配置实例，方便导入使用
tos_config = TOSConfig()
app_config = AppConfig()

# 导出配置类和实例
__all__ = ["TOSConfig", "AppConfig", "tos_config", "app_config"]
