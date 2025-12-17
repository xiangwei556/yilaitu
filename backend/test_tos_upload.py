#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
TOS上传功能测试脚本
用于验证TOS工具类的功能是否正常工作
"""

import os
import sys
import logging
import time
import tempfile
from PIL import Image

# 添加项目根目录到Python路径，确保能导入app模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('tos_test')

# 尝试导入TOS SDK
TOS_AVAILABLE = False
try:
    # 尝试导入volcengine.tos
    try:
        from volcengine.tos import TosClientV2
        logger.info('已成功导入volcengine.tos模块')
        TOS_AVAILABLE = True
    except ImportError:
        # 尝试导入tos
        try:
            import tos
            logger.info('已成功导入tos模块')
            TOS_AVAILABLE = True
        except ImportError:
            logger.warning('未找到TOS SDK，请确保已正确安装volcengine或tos包')
            TOS_AVAILABLE = False
except Exception as e:
    logger.error(f'导入TOS SDK过程中发生未知错误: {e}')
    TOS_AVAILABLE = False
            
# 尝试导入TOSUploader
try:
    from app.utils.tos_utils import TOSUploader
    TOS_UPLOADER_AVAILABLE = True
    logger.info('已成功导入TOSUploader类')
except ImportError as e:
    logger.error(f'导入TOSUploader失败: {e}')
    TOS_UPLOADER_AVAILABLE = False

def create_test_image(image_path: str, size: tuple = (200, 200)) -> None:
    """
    创建一个测试用的图片文件
    
    Args:
        image_path: 图片保存路径
        size: 图片尺寸
    """
    try:
        # 创建一个红色的测试图片
        image = Image.new('RGB', size, color='red')
        image.save(image_path)
        logger.info(f"创建测试图片成功: {image_path}")
    except Exception as e:
        logger.error(f"创建测试图片失败: {str(e)}")
        raise

def test_tos_functionality():
    """
    测试TOS功能的主函数
    """
    logger.info("开始测试TOS上传功能...")
    
    # 测试配置
    csv_config_path = "用户信息.csv"
    test_bucket_name = "image-edit-test-bucket"
    
    # 如果TOSUploader不可用，直接实现简单的CSV读取函数
    def load_config_from_csv_standalone(csv_path):
        import csv
        config = {}
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                headers = next(reader)  # 读取表头
                values = next(reader)   # 读取数据行
                # 查找对应的列并提取值
                for i, header in enumerate(headers):
                    if 'Access Key' in header:
                        config['ak'] = values[i]
                    elif 'Secret Key' in header:
                        config['sk'] = values[i]
                    elif 'Endpoint' in header:
                        config['endpoint'] = values[i]
                    elif 'Region' in header:
                        config['region'] = values[i]
            return config
        except Exception as e:
            logger.error(f'读取CSV配置失败: {e}')
            import traceback
            traceback.print_exc()
            return {}
    
    # 首先检查TOS SDK是否可用
    if not TOS_AVAILABLE:
        logger.error("无法测试上传功能，因为TOS SDK未正确安装")
        logger.info("请尝试以下命令安装正确的SDK：")
        logger.info("1. pip install volcengine")
        logger.info("2. 如果仍然失败，请参考火山引擎官方文档获取正确的安装命令")
        
        # 即使SDK不可用，我们也可以测试CSV配置加载功能
        logger.info("\n测试CSV配置加载功能...")
        try:
            if TOS_UPLOADER_AVAILABLE:
                # 使用TOSUploader的方法加载配置
                access_key, secret_key, endpoint, region = TOSUploader.load_config_from_csv(csv_config_path)
                logger.info("CSV配置加载成功!")
                logger.info(f"Access Key: {access_key}")
                logger.info(f"Secret Key: {'*' * len(secret_key[:-4]) + secret_key[-4:]}")  # 隐藏部分密钥
                logger.info(f"Endpoint: {endpoint}")
                logger.info(f"Region: {region}")
            else:
                # 使用备用方法加载配置
                logger.warning('TOSUploader不可用，尝试使用备用方法加载CSV配置...')
                config = load_config_from_csv_standalone(csv_config_path)
                if config:
                    logger.info("CSV配置加载成功 (备用方法)!")
                    masked_sk = config.get('sk', '')[:4] + '****' if config.get('sk') else 'N/A'
                    logger.info(f"Access Key: {config.get('ak', 'N/A')[:8]}...")
                    logger.info(f"Secret Key: {masked_sk}")
                    logger.info(f"Endpoint: {config.get('endpoint', 'N/A')}")
                    logger.info(f"Region: {config.get('region', 'N/A')}")
                else:
                    logger.error("无法使用备用方法从CSV加载配置")
        except Exception as e:
            logger.error(f"CSV配置加载失败: {str(e)}")
        
        return
    
    try:
        # 1. 测试从CSV初始化
        logger.info("测试1: 从CSV文件初始化TOS客户端")
        tos_uploader = TOSUploader(
            config_csv_path=csv_config_path
        )
        logger.info("TOS客户端初始化成功")
        logger.info(f"使用的配置: endpoint={tos_uploader.endpoint}, region={tos_uploader.region}")
        
        # 2. 列出所有存储桶（验证连接是否正常）
        logger.info("\n测试2: 列出所有存储桶")
        try:
            buckets = tos_uploader.client.list_buckets()
            if buckets:
                logger.info(f"成功获取到{len(buckets)}个存储桶:")
                for bucket in buckets:
                    logger.info(f"- {bucket.name}, 创建时间: {bucket.creation_date}")
            else:
                logger.info("未找到任何存储桶")
        except Exception as e:
            logger.warning(f"列出存储桶失败（可能没有权限或网络问题）: {str(e)}")
        
        # 3. 创建测试图片
        logger.info("\n测试3: 创建测试图片")
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            test_image_path = temp_file.name
        
        create_test_image(test_image_path)
        
        # 4. 上传测试
        logger.info("\n测试4: 上传图片到TOS")
        try:
            # 使用当前时间戳生成唯一的object key
            timestamp = int(time.time())
            object_key = f"test_images/test_image_{timestamp}.jpg"
            
            # 测试上传
            logger.info(f"开始上传图片到TOS，object_key: {object_key}")
            result = tos_uploader.upload_image(
                file_path=test_image_path,
                object_key=object_key,
                bucket_name=test_bucket_name,
                content_type='image/jpeg'
            )
            
            logger.info(f"图片上传成功!")
            logger.info(f"上传结果: {result}")
            logger.info(f"访问URL: {result['object_url']}")
            
        except Exception as e:
            logger.error(f"图片上传失败: {str(e)}")
            # 不要在这里退出，继续测试其他功能
        
        # 5. 测试字节数据上传
        logger.info("\n测试5: 上传图片字节数据")
        try:
            with open(test_image_path, 'rb') as f:
                image_bytes = f.read()
            
            timestamp = int(time.time())
            object_key_bytes = f"test_images/test_image_bytes_{timestamp}.jpg"
            
            result_bytes = tos_uploader.upload_image_bytes(
                image_bytes=image_bytes,
                object_key=object_key_bytes,
                bucket_name=test_bucket_name,
                content_type='image/jpeg'
            )
            
            logger.info(f"字节数据上传成功!")
            logger.info(f"访问URL: {result_bytes['object_url']}")
            
        except Exception as e:
            logger.error(f"字节数据上传失败: {str(e)}")
        
        # 6. 清理测试图片
        try:
            if os.path.exists(test_image_path):
                os.remove(test_image_path)
                logger.info(f"\n清理测试图片: {test_image_path}")
        except Exception as e:
            logger.warning(f"清理测试图片失败: {str(e)}")
        
        logger.info("\nTOS功能测试完成！")
        logger.info("注意事项:")
        logger.info("1. 如果上传失败，请确保存储桶存在且有正确的访问权限")
        logger.info("2. 请根据实际情况修改测试脚本中的存储桶名称")
        logger.info("3. 建议在实际使用前先确认TOS服务的访问权限和网络连接")
        
    except Exception as e:
        logger.error(f"测试过程中出现严重错误: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    # 打印当前Python版本和环境信息
    logger.info(f"Python版本: {sys.version}")
    logger.info(f"当前工作目录: {os.getcwd()}")
    logger.info(f"Python路径: {sys.path}")
    
    test_tos_functionality()
