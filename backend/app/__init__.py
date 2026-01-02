"""易可图AI商品图合成后端应用"""
# -*- coding: utf-8 -*-
"""
App包初始化文件
初始化应用配置和全局组件
"""
import logging
from typing import Optional

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 尝试导入TOS配置和上传器
_tos_uploader: Optional['TOSUploader'] = None

# 延迟导入TOSUploader，避免循环引用
def init_tos_uploader():
    """初始化TOS上传器实例"""
    global _tos_uploader
    try:
        from .config import TOSConfig, tos_config
        from .utils.tos_utils import TOSClient
        
        # 优先使用CSV配置文件路径（如果配置了）
        if hasattr(tos_config, 'CSV_CONFIG_PATH') and tos_config.CSV_CONFIG_PATH:
            logger.info(f'尝试从CSV文件初始化TOS上传器: {tos_config.CSV_CONFIG_PATH}')
            _tos_uploader = TOSClient(config_csv_path=tos_config.CSV_CONFIG_PATH)
        else:
            # 使用直接配置的参数
            logger.info('使用配置文件参数初始化TOS上传器')
            _tos_uploader = TOSClient(
                ak=tos_config.ACCESS_KEY,
                sk=tos_config.SECRET_KEY,
                endpoint=tos_config.ENDPOINT,
                region=tos_config.REGION,
                bucket_name=tos_config.BUCKET
            )
        
        logger.info('TOS上传器初始化成功')
    except ImportError as e:
        logger.warning(f'无法导入TOS相关模块: {e}')
        _tos_uploader = None
    except Exception as e:
        logger.error(f'TOS上传器初始化失败: {e}')
        _tos_uploader = None

# 获取TOS上传器实例
def get_tos_uploader():
    """获取TOS上传器实例，如果未初始化则尝试初始化"""
    global _tos_uploader
    if _tos_uploader is None:
        init_tos_uploader()
    return _tos_uploader

# 尝试自动初始化TOS上传器（可选）
# 如果不希望自动初始化，可以删除以下代码
if __name__ == "__main__":
    # 仅在直接运行该模块时初始化
    init_tos_uploader()

# 导出函数供外部使用
__all__ = ['init_tos_uploader', 'get_tos_uploader']
