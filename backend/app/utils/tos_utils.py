"""
火山引擎对象存储(TOS)工具类

该模块提供了与火山引擎对象存储(TOS)服务交互的完整功能封装，包括：
1. 存储桶管理：创建桶
2. 对象操作：上传、下载、删除、列举、复制、获取元信息
3. 批量操作：批量删除对象

使用示例:

# 1. 初始化客户端
from app.utils.tos_utils import TOSClient

# 方式1：直接传入参数
tos_client = TOSClient(
    endpoint='your-endpoint.tos-cn-beijing.volces.com',
    access_key='your-access-key',
    secret_key='your-secret-key',
    bucket_name='your-bucket-name'
)

# 方式2：从环境变量加载
tos_client = TOSClient()  # 自动从环境变量TOS_ENDPOINT, TOS_ACCESS_KEY, TOS_SECRET_KEY等加载

# 方式3：从CSV文件加载配置
tos_client = TOSClient(config_csv_path='path/to/config.csv')

# 2. 创建存储桶
result = tos_client.create_bucket('your-new-bucket', acl='private')
print(f"创建结果: {result['success']}, 请求ID: {result['request_id']}")

# 3. 上传文件
result = tos_client.put_object_from_file(
    object_key='images/photo.jpg',
    file_path='local/path/to/photo.jpg',
    headers={'Content-Type': 'image/jpeg'}
)
print(f"上传结果: {result['success']}, 对象URL: {result.get('object_url')}")

# 4. 上传字节数据
content = b'Hello, TOS!'
result = tos_client.put_object(
    object_key='hello.txt',
    content=content,
    headers={'Content-Type': 'text/plain'}
)

# 5. 下载对象到文件
result = tos_client.get_object_to_file(
    object_key='images/photo.jpg',
    file_path='downloaded_photo.jpg'
)
print(f"下载结果: {result['success']}, 文件大小: {result['file_size']} bytes")

# 6. 获取对象内容
result = tos_client.get_object(object_key='hello.txt')
content = result['content'].decode('utf-8')
print(f"获取内容: {content}")

# 7. 获取对象元信息
result = tos_client.head_object(object_key='images/photo.jpg')
print(f"内容类型: {result['content_type']}, 文件大小: {result['content_length']} bytes")

# 8. 列举对象
result = tos_client.list_objects(prefix='images/', max_keys=100)
print(f"找到对象数量: {len(result['objects'])}")
for obj in result['objects']:
    print(f"对象键: {obj['key']}, 大小: {obj['size']} bytes")

# 9. 复制对象
result = tos_client.copy_object(
    source_key='images/photo.jpg',
    dest_key='backup/photo.jpg'
)

# 10. 批量删除对象
result = tos_client.delete_objects(
    object_keys=['images/photo1.jpg', 'images/photo2.jpg']
)
print(f"删除成功数量: {len(result['deleted'])}, 失败数量: {len(result['errors'])}")

# 11. 删除单个对象
result = tos_client.delete_object(object_key='hello.txt')

异常处理:
try:
    result = tos_client.put_object_from_file('test.txt', 'non_existent_file.txt')
except FileNotFoundError as e:
    print(f"文件不存在: {e}")
except tos.exceptions.TosClientError as e:
    print(f"TOS客户端错误: {e.message}, 原因: {e.cause}")
except tos.exceptions.TosServerError as e:
    print(f"TOS服务端错误: 错误码={e.code}, 消息={e.message}, 请求ID={e.request_id}")
except Exception as e:
    print(f"其他错误: {str(e)}")
"""

import os
import csv
from typing import Dict, Any, Optional, Tuple, Union, IO, List
import logging

# 尝试从volcengine包中导入tos模块
try:
    # 尝试直接导入tos模块
    import tos
except ImportError:
    try:
        # 尝试从volcengine包中导入tos
        from volcengine import tos
    except ImportError:
        # 如果都失败，创建一个空的tos模块以避免导入错误
        import types
        tos = types.ModuleType('tos')
        # 添加必要的类和异常定义以避免运行时错误
        class TosClientV2:
            def __init__(self, **kwargs):
                raise ImportError("Failed to import tos module from volcengine")
        
        class ACLType:
            ACL_Private = 'private'
            ACL_PublicRead = 'public-read'
            ACL_PublicReadWrite = 'public-read-write'
        
        class exceptions:
            class TosClientError(Exception):
                def __init__(self, message, cause=None):
                    self.message = message
                    self.cause = cause
                    super().__init__(message)
            class TosServerError(Exception):
                def __init__(self, code, message, status_code, request_id, ec=None, request_url=None):
                    self.code = code
                    self.message = message
                    self.status_code = status_code
                    self.request_id = request_id
                    self.ec = ec
                    self.request_url = request_url
                    super().__init__(message)
        
        tos.TosClientV2 = TosClientV2
        tos.ACLType = ACLType
        tos.exceptions = exceptions

logger = logging.getLogger(__name__)


class TOSClient:
    """
    火山引擎对象存储(TOS)客户端类
    
    该类提供了与火山引擎对象存储服务交互的完整接口，封装了各种操作的参数验证、异常处理和结果格式化。
    支持多种配置方式：直接参数、环境变量和CSV配置文件。
    
    主要功能特性：
    - 支持存储桶的创建和管理
    - 支持对象的上传、下载、删除、列举、复制等操作
    - 支持批量操作和元数据管理
    - 统一的异常处理机制，包括TosClientError和TosServerError的处理
    - 结构化的结果返回格式
    
    属性：
        endpoint: TOS服务的访问域名
        ak: 访问密钥ID
        sk: 访问密钥Secret
        region: TOS区域
        bucket_name: 默认存储桶名称
        client: 底层TOS客户端实例
        
    使用示例：
        # 初始化客户端
        client = TOSClient(ak='your-ak', sk='your-sk', endpoint='your-endpoint', region='cn-beijing')
        
        # 创建桶
        result = client.create_bucket('your-bucket')
        
        # 上传文件
        result = client.put_object_from_file('object-key.txt', 'local-file.txt')
        
        # 下载文件
        result = client.get_object_to_file('object-key.txt', 'downloaded-file.txt')
    """
    
    def _handle_tos_exception(self, operation: str, bucket: str, error: Exception, additional_info: Optional[str] = None) -> None:
        """
        统一处理TOS异常的辅助方法
        
        Args:
            operation: 操作名称
            bucket: 存储桶名称
            error: 捕获的异常
            additional_info: 额外的信息
            
        Raises:
            重新抛出原始异常
        """
        error_info = f"{operation} - 存储桶: {bucket}"
        if additional_info:
            error_info += f", {additional_info}"
            
        if isinstance(error, tos.exceptions.TosClientError):
            # 客户端错误，通常是非法请求参数或网络异常
            logger.error(
                f"TOS客户端错误 - {error_info} | "
                f"消息: {error.message} | "
                f"原因: {str(error.cause) if error.cause else 'N/A'}"
            )
        elif isinstance(error, tos.exceptions.TosServerError):
            # 服务端错误，可从返回信息中获取详细错误信息
            logger.error(
                f"TOS服务端错误 - {error_info} | "
                f"错误码: {error.code} | "
                f"消息: {error.message} | "
                f"请求ID: {error.request_id} | "
                f"HTTP状态码: {error.status_code}"
            )
        else:
            # 其他未预期异常
            logger.error(f"未知错误 - {error_info} | 错误: {str(error)}")
            
        # 重新抛出异常，让调用者决定如何处理
        raise
    
    @staticmethod
    def load_config_from_csv(csv_path: str) -> Tuple[str, str, str, str, str]:
        """
        从CSV文件加载TOS配置信息
        
        Args:
            csv_path: CSV文件路径
            
        Returns:
            (access_key, secret_key, endpoint, region, bucket_name)元组
            
        Raises:
            FileNotFoundError: CSV文件不存在
            ValueError: CSV文件格式错误或缺少必要信息
        """
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"CSV配置文件不存在: {csv_path}")
        
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                # 读取标题行
                headers = next(reader)
                # 读取数据行
                data = next(reader)
                
                # 确保数据行有足够的列
                if len(data) < 9:
                    raise ValueError("CSV文件格式错误，缺少必要的配置信息")
                
                # 提取所需信息
                # 第5列是Access Key ID，第6列是Secret Access Key，第7列是Endpoint，第8列是Region，第9列是Bucket Name
                access_key = data[4]
                secret_key = data[5]
                endpoint = data[6]
                region = data[7]
                bucket_name = data[8]  # 从第9列提取桶名称
                
                if not all([access_key, secret_key, endpoint, region]):
                    raise ValueError("CSV文件中缺少必要的TOS配置信息")
                
                return access_key, secret_key, endpoint, region, bucket_name
                
        except StopIteration:
            raise ValueError("CSV文件格式错误，缺少数据行")
        except Exception as e:
            raise ValueError(f"读取CSV配置文件失败: {str(e)}")
    
    def __init__(self, 
                 ak: Optional[str] = None, 
                 sk: Optional[str] = None, 
                 endpoint: Optional[str] = None, 
                 region: Optional[str] = None,
                 bucket_name: Optional[str] = None,
                 config_csv_path: Optional[str] = None):
        """
        初始化TOS客户端
        
        Args:
            ak: 访问密钥ID，从火山引擎控制台获取，默认从环境变量TOS_ACCESS_KEY获取
            sk: 访问密钥Secret，从火山引擎控制台获取，默认从环境变量TOS_SECRET_KEY获取
            endpoint: TOS服务端点，格式为：bucket-name.region.tos-cn-region.volces.com
            region: TOS区域，如cn-beijing、cn-guangzhou等
            bucket_name: 默认存储桶名称，用于简化操作调用，默认从环境变量TOS_BUCKET获取
            config_csv_path: 配置CSV文件路径，可从CSV文件读取配置
            
        Raises:
            ValueError: 缺少必要的配置参数（ak、sk、endpoint、region）
            tos.exceptions.TosClientError: 客户端初始化失败，通常是网络或认证问题
            Exception: 其他未预期的初始化错误
            
        配置优先级：
            1. 直接传入的参数
            2. CSV配置文件（如果提供）
            3. 环境变量（TOS_ACCESS_KEY, TOS_SECRET_KEY, TOS_ENDPOINT, TOS_REGION, TOS_BUCKET）
        """
        # 1. 首先尝试从CSV文件加载配置（如果提供了路径）
        csv_ak, csv_sk, csv_endpoint, csv_region, csv_bucket = None, None, None, None, None
        if config_csv_path:
            try:
                csv_ak, csv_sk, csv_endpoint, csv_region, csv_bucket = self.load_config_from_csv(config_csv_path)
                logger.info(f"从CSV文件加载TOS配置: {config_csv_path}")
            except Exception as e:
                logger.warning(f"从CSV加载配置失败: {str(e)}，将尝试使用其他配置方式")
        
        # 2. 优先使用传入的参数，其次使用CSV配置，最后使用环境变量
        self.ak = ak or csv_ak or os.getenv('TOS_ACCESS_KEY')
        self.sk = sk or csv_sk or os.getenv('TOS_SECRET_KEY')
        self.endpoint = endpoint or csv_endpoint or os.getenv('TOS_ENDPOINT')
        self.region = region or csv_region or os.getenv('TOS_REGION')
        self.bucket_name = bucket_name or csv_bucket or os.getenv('TOS_BUCKET')
        
        # 验证必要参数
        if not all([self.ak, self.sk, self.endpoint, self.region]):
            raise ValueError("缺少必要的TOS配置参数，请提供ak、sk、endpoint和region")
        
        # 创建TOS客户端
        try:
            self.client = tos.TosClientV2(
                ak=self.ak, 
                sk=self.sk, 
                endpoint=self.endpoint, 
                region=self.region
            )
            logger.info("TOS客户端初始化成功")
        except tos.exceptions.TosClientError as e:
            logger.error(f"TOS客户端初始化错误: {e.message}, cause: {e.cause}")
            raise
        except Exception as e:
            logger.error(f"TOS客户端初始化失败: {str(e)}")
            raise
    
    def put_object_from_file(self, 
                           file_path: str, 
                           object_key: str, 
                           bucket_name: Optional[str] = None,
                           headers: Optional[Dict[str, str]] = None,
                           acl: Optional[str] = None,
                           storage_class: Optional[str] = None,
                           meta: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        从本地文件上传对象到TOS
        
        Args:
            file_path: 本地文件路径
            object_key: TOS中存储的对象键
            bucket_name: 存储桶名称，默认使用初始化时的桶名
            headers: 自定义请求头
            acl: 访问控制权限，可选值：'private'、'public-read'、'public-read-write'
            storage_class: 存储类型，如'standard'、'ia'、'archive'
            meta: 自定义元数据，用于对象自定义管理
            
        Returns:
            Dict[str, Any]: 包含上传结果的字典，包含以下字段：
                - success: 布尔值，表示上传是否成功
                - request_id: 请求ID，用于定位问题
                - object_key: 上传的对象键
                - bucket: 使用的存储桶名称
                - file_path: 本地文件路径
                - size: 文件大小（字节）
                - hash_crc64_ecma: 对象的64位CRC值，用于验证上传对象的完整性
                - etag: 对象的ETag值
                - object_url: 对象的访问URL
                - status_code: HTTP状态码
            
        Raises:
            FileNotFoundError: 文件不存在
            ValueError: 参数错误或参数格式不正确
            tos.exceptions.TosClientError: 客户端错误，如非法请求参数或网络异常
            tos.exceptions.TosServerError: 服务端错误，如权限不足或桶不存在
        """
        # 参数验证
        if not object_key:
            raise ValueError("必须指定object_key")
        
        if not file_path:
            raise ValueError("必须指定file_path")
            
        # 检查文件是否存在
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")
        
        # 使用指定的桶名或默认桶名
        bucket = bucket_name or self.bucket_name
        if not bucket:
            raise ValueError("未指定存储桶名称")
        
        # 准备请求参数
        request_params = {
            'bucket': bucket,
            'key': object_key,
            'file_path': file_path
        }
        
        # 添加可选参数
        if headers:
            request_params['headers'] = headers
        
        # 处理ACL参数
        if acl:
            acl_map = {
                'private': tos.ACLType.ACL_Private,
                'public-read': tos.ACLType.ACL_PublicRead,
                'public-read-write': tos.ACLType.ACL_PublicReadWrite
            }
            if acl in acl_map:
                request_params['acl'] = acl_map[acl]
            else:
                raise ValueError(f"不支持的ACL类型: {acl}")
        
        # 处理存储类型
        if storage_class:
            storage_map = {
                'standard': 'STANDARD',
                'ia': 'IA',
                'archive': 'ARCHIVE'
            }
            if storage_class in storage_map:
                request_params['storage_class'] = storage_map[storage_class]
            else:
                raise ValueError(f"不支持的存储类型: {storage_class}")
        
        # 处理自定义元数据
        if meta:
            request_params['meta'] = meta
        
        try:
            # 获取文件大小
            file_size = os.path.getsize(file_path)
            
            # 上传文件
            resp = self.client.put_object_from_file(**request_params)
            
            # 记录上传日志
            logger.info(
                f"文件上传成功 - 存储桶: {bucket} | "
                f"对象键: {object_key} | "
                f"文件: {file_path} | "
                f"大小: {file_size} bytes | "
                f"请求ID: {resp.request_id} | "
                f"CRC64: {getattr(resp, 'hash_crc64_ecma', 'N/A')}"
            )
            
            # 返回结构化结果
            return {
                'success': True,
                'request_id': resp.request_id,
                'object_key': object_key,
                'bucket': bucket,
                'file_path': file_path,
                'size': file_size,
                'hash_crc64_ecma': getattr(resp, 'hash_crc64_ecma', None),
                'etag': getattr(resp, 'etag', None),
                'object_url': f"https://{bucket}.{self.endpoint}/{object_key}",
                'status_code': getattr(resp, 'status_code', 200)
            }
            
        except FileNotFoundError:
            # 文件不存在的异常在参数验证阶段已经处理
            raise
        except ValueError:
            # 参数错误异常在参数验证阶段已经处理
            raise
        except Exception as e:
            # 使用统一的异常处理方法
            self._handle_tos_exception("上传文件", bucket, e, f"文件路径: {file_path}, 对象键: {object_key}")
    
    def put_object(self, 
                   object_key: str, 
                   content: Union[bytes, str, IO], 
                   bucket_name: Optional[str] = None,
                   acl: Optional[str] = None,
                   storage_class: Optional[str] = None,
                   meta: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        普通上传 - 支持上传字符串、字节流、网络流到TOS
        
        根据火山引擎文档实现：https://www.volcengine.com/docs/6349/92800?lang=zh
        
        Args:
            object_key: TOS中存储的对象键，命名规范参见对象命名规范
            content: 要上传的内容，可以是：
                - str: 字符串内容（字符流）
                - bytes: 字节内容（字节流）
                - IO: 文件对象、StringIO、BytesIO等（网络流）
            bucket_name: 存储桶名称，默认使用初始化时的桶名
            acl: 访问控制权限，可选值：'private'、'public-read'、'public-read-write'
            storage_class: 存储类型，如'standard'、'ia'、'archive'
            meta: 自定义元数据，用于对象自定义管理
            
        Returns:
            Dict[str, Any]: 包含上传结果的字典，包含以下字段：
                - success: 布尔值，表示上传是否成功
                - status_code: HTTP状态码
                - request_id: 请求ID，用于定位问题
                - hash_crc64_ecma: 对象的64位CRC值，用于验证上传对象的完整性
                - etag: 对象的ETag值
                - object_key: 上传的对象键
                - bucket: 使用的存储桶名称
                - object_url: 对象的访问URL
            
        Raises:
            ValueError: 参数错误，如缺少必要参数或参数格式不正确
            tos.exceptions.TosClientError: 客户端错误，通常是非法请求参数或网络异常
            tos.exceptions.TosServerError: 服务端错误，可从返回信息中获取详细错误信息
        
        注意事项：
        1. 上传对象前，必须具有tos:PutObject权限
        2. 对象名必须满足对象命名规范
        3. 建议避免使用字典序递增的对象命名方式
        4. 如果桶中已存在同名对象，新对象会覆盖已有对象
        5. 如果桶开启了版本控制，则会保留原有对象并生成新版本
        """
        # 参数验证
        if not object_key or not isinstance(object_key, str):
            raise ValueError("必须指定有效的object_key字符串")
        
        if content is None:
            raise ValueError("上传内容不能为空")
        
        # 使用指定的桶名或默认桶名
        bucket = bucket_name or self.bucket_name
        if not bucket:
            raise ValueError("未指定存储桶名称")
        
        # 准备请求参数
        request_params = {
            'bucket': bucket,
            'key': object_key,
            'content': content
        }
        
        # 处理ACL参数
        if acl:
            acl_map = {
                'private': tos.ACLType.ACL_Private,
                'public-read': tos.ACLType.ACL_PublicRead,
                'public-read-write': tos.ACLType.ACL_PublicReadWrite
            }
            if acl in acl_map:
                request_params['acl'] = acl_map[acl]
            else:
                raise ValueError(f"不支持的ACL类型: {acl}")
        
        # 处理存储类型
        if storage_class:
            # 根据实际的StorageClassType进行映射
            # 这里使用示例映射，实际使用时请根据TOS SDK的定义调整
            storage_map = {
                'standard': 'STANDARD',
                'ia': 'IA',
                'archive': 'ARCHIVE'
            }
            if storage_class in storage_map:
                request_params['storage_class'] = storage_map[storage_class]
            else:
                raise ValueError(f"不支持的存储类型: {storage_class}")
        
        # 处理自定义元数据
        if meta:
            request_params['meta'] = meta
        
        try:
            # 执行上传操作
            resp = self.client.put_object(**request_params)
            
            # 获取内容大小用于日志记录
            content_size = len(content) if isinstance(content, (bytes, str)) else 'unknown'
            
            # 优化日志格式
            logger.info(
                f"对象上传成功 - 存储桶: {bucket} | "
                f"对象键: {object_key} | "
                f"大小: {content_size} bytes | "
                f"请求ID: {resp.request_id}"
            )
            
            # 返回结构化结果
            return {
                'success': True,
                'status_code': getattr(resp, 'status_code', 200),
                'request_id': resp.request_id,
                'hash_crc64_ecma': getattr(resp, 'hash_crc64_ecma', None),
                'etag': getattr(resp, 'etag', None),
                'object_key': object_key,
                'bucket': bucket,
                'object_url': f"https://{bucket}.{self.endpoint}/{object_key}"
            }
            
        except Exception as e:
            # 使用统一的异常处理方法
            error_info = f"对象键: {object_key}"
            self._handle_tos_exception("上传对象", bucket, e, error_info)
    
    def create_bucket(self, bucket_name: str, acl: Optional[str] = 'private') -> Dict[str, Any]:
        """
        创建新的存储桶
        
        Args:
            bucket_name: 存储桶名称
            acl: 访问控制权限，默认为'private'
            
        Returns:
            包含创建结果的字典
            
        Raises:
            ValueError: 参数错误或存储桶名称格式不正确
            tos.exceptions.TosClientError: 客户端错误，如参数非法或网络异常
            tos.exceptions.TosServerError: 服务端错误，如存储桶已存在或权限不足
        """
        # 参数验证
        if not bucket_name:
            raise ValueError("必须指定bucket_name")
            
        # 验证存储桶名称格式
        if len(bucket_name) < 3 or len(bucket_name) > 63:
            raise ValueError("存储桶名称长度必须在3-63个字符之间")
            
        if not all(c.isalnum() or c in ['.', '-'] for c in bucket_name):
            raise ValueError("存储桶名称只能包含小写字母、数字、下划线和连字符")
            
        if bucket_name.startswith('-') or bucket_name.endswith('-'):
            raise ValueError("存储桶名称不能以连字符开头或结尾")
            
        if '..' in bucket_name:
            raise ValueError("存储桶名称不能包含连续的点")
        
        # 将ACL字符串转换为对应的枚举值
        acl_map = {
            'private': tos.ACLType.ACL_Private,
            'public-read': tos.ACLType.ACL_PublicRead,
            'public-read-write': tos.ACLType.ACL_PublicReadWrite
        }
        
        if acl not in acl_map:
            raise ValueError(f"不支持的ACL类型: {acl}")
        
        try:
            # 创建存储桶
            resp = self.client.create_bucket(
                bucket=bucket_name,
                acl=acl_map[acl]
            )
            
            # 优化日志格式
            logger.info(
                f"存储桶创建成功 - 存储桶: {bucket_name} | "
                f"请求ID: {resp.request_id} | "
                f"ACL: {acl}"
            )
            
            return {
                'success': True,
                'request_id': resp.request_id,
                'bucket_name': bucket_name,
                'acl': acl,
                'status_code': getattr(resp, 'status_code', 200)
            }
            
        except Exception as e:
            # 使用统一的异常处理方法
            self._handle_tos_exception("创建存储桶", bucket_name, e, f"ACL: {acl}")
    
    def get_object(self, 
                   object_key: str, 
                   bucket_name: Optional[str] = None,
                   byte_range: Optional[Tuple[int, int]] = None) -> Dict[str, Any]:
        """
        从TOS获取对象内容
        
        Args:
            object_key: str, TOS中的对象键
            bucket_name: Optional[str], 存储桶名称，默认使用初始化时的桶名
            byte_range: Optional[Tuple[int, int]], 字节范围，格式为(start, end)，用于部分下载
            
        Returns:
            Dict[str, Any]: 包含对象内容和元数据的字典，包含以下字段：
                - success: 布尔值，表示获取是否成功
                - request_id: 请求ID，用于定位问题
                - content: bytes, 对象的二进制内容
                - headers: Dict[str, str], 对象的响应头
                - object_key: 获取的对象键
                - bucket: 使用的存储桶名称
                
        Raises:
            ValueError: 参数错误
            tos.exceptions.TosClientError: 客户端错误，如非法请求参数或网络异常
            tos.exceptions.TosServerError: 服务端错误，如对象不存在或权限不足
        """
        # 参数验证
        if not object_key or not isinstance(object_key, str):
            raise ValueError("必须指定有效的object_key字符串")
        
        # 使用指定的桶名或默认桶名
        bucket = bucket_name or self.bucket_name
        if not bucket:
            raise ValueError("未指定存储桶名称")
        
        # 参数验证 - byte_range
        if byte_range:
            if not isinstance(byte_range, tuple) or len(byte_range) != 2:
                raise ValueError("byte_range必须是长度为2的元组")
            start, end = byte_range
            if not isinstance(start, int) or not isinstance(end, int) or start < 0 or end < start:
                raise ValueError("byte_range必须包含两个非负整数，且start <= end")
        
        try:
            # 构建请求参数
            params = {}
            if byte_range:
                start, end = byte_range
                params['Range'] = f'bytes={start}-{end}'
            
            # 获取对象
            resp = self.client.get_object(bucket, object_key, **params)
            
            # 读取内容
            content = resp.read()
            
            # 优化日志格式
            logger.info(
                f"对象获取成功 - 存储桶: {bucket} | "
                f"对象键: {object_key} | "
                f"大小: {len(content)} bytes"
            )
            
            return {
                'success': True,
                'request_id': resp.request_id,
                'content': content,
                'headers': resp.headers,
                'object_key': object_key,
                'bucket': bucket
            }
            
        except Exception as e:
            # 使用统一的异常处理方法
            error_info = f"对象键: {object_key}"
            self._handle_tos_exception("获取对象", bucket, e, error_info)
    
    def get_object_to_file(self, 
                           object_key: str, 
                           file_path: str, 
                           bucket_name: Optional[str] = None,
                           byte_range: Optional[Tuple[int, int]] = None) -> Dict[str, Any]:
        """
        将对象下载到文件
        
        Args:
            object_key: str, TOS中的对象键
            file_path: str, 本地文件保存路径
            bucket_name: Optional[str], 存储桶名称，默认使用初始化时的桶名
            byte_range: Optional[Tuple[int, int]], 字节范围，格式为(start, end)，用于部分下载
            
        Returns:
            Dict[str, Any]: 包含下载结果的字典，包含以下字段：
                - success: 布尔值，表示下载是否成功
                - request_id: 请求ID，用于定位问题
                - object_key: 获取的对象键
                - bucket: 使用的存储桶名称
                - file_path: 本地文件保存路径
                - file_size: int, 下载的文件大小（字节）
                
        Raises:
            ValueError: 参数错误
            FileNotFoundError: 文件保存目录不存在
            PermissionError: 没有写入权限
            Exception: TOS相关错误
        """
        # 参数验证
        if not object_key or not isinstance(object_key, str):
            raise ValueError("必须指定有效的object_key字符串")
        
        if not file_path or not isinstance(file_path, str):
            raise ValueError("必须指定有效的file_path字符串")
        
        # 使用指定的桶名或默认桶名
        bucket = bucket_name or self.bucket_name
        if not bucket:
            raise ValueError("未指定存储桶名称")
        
        # 参数验证 - byte_range
        if byte_range:
            if not isinstance(byte_range, tuple) or len(byte_range) != 2:
                raise ValueError("byte_range必须是长度为2的元组")
            start, end = byte_range
            if not isinstance(start, int) or not isinstance(end, int) or start < 0 or end < start:
                raise ValueError("byte_range必须包含两个非负整数，且start <= end")
        
        try:
            # 检查目录是否存在
            directory = os.path.dirname(file_path)
            if directory and not os.path.exists(directory):
                raise FileNotFoundError(f"保存目录不存在: {directory}")
            
            # 构建请求参数
            params = {}
            if byte_range:
                start, end = byte_range
                params['Range'] = f'bytes={start}-{end}'
            
            # 获取对象
            resp = self.client.get_object(bucket, object_key, **params)
            
            # 写入文件
            with open(file_path, 'wb') as f:
                f.write(resp.read())
            
            file_size = os.path.getsize(file_path)
            
            # 优化日志格式
            logger.info(
                f"对象下载成功 - 存储桶: {bucket} | "
                f"对象键: {object_key} | "
                f"保存至: {file_path} | "
                f"大小: {file_size} bytes"
            )
            
            return {
                'success': True,
                'request_id': resp.request_id,
                'file_path': file_path,
                'file_size': file_size,
                'object_key': object_key,
                'bucket': bucket
            }
            
        except (FileNotFoundError, PermissionError, ValueError) as e:
            # 本地文件和参数错误直接抛出
            logger.error(f"{type(e).__name__}: {str(e)}")
            raise
        except Exception as e:
            # 使用统一的异常处理方法
            error_info = f"对象键: {object_key}, 文件路径: {file_path}"
            self._handle_tos_exception("下载对象到文件", bucket, e, error_info)
    
    def delete_object(self, object_key: str, bucket_name: Optional[str] = None) -> Dict[str, Any]:
        """
        删除单个对象
        
        Args:
            object_key: str, TOS中的对象键
            bucket_name: Optional[str], 存储桶名称，默认使用初始化时的桶名
            
        Returns:
            Dict[str, Any]: 包含删除结果的字典，包含以下字段：
                - success: 布尔值，表示删除是否成功
                - request_id: 请求ID，用于定位问题
                - object_key: 删除的对象键
                - bucket: 使用的存储桶名称
                
        Raises:
            ValueError: 参数错误或参数格式不正确
            Exception: TOS相关错误
        """
        # 参数验证
        if not object_key or not isinstance(object_key, str):
            raise ValueError("必须指定有效的object_key字符串")
        
        # 使用指定的桶名或默认桶名
        bucket = bucket_name or self.bucket_name
        if not bucket:
            raise ValueError("未指定存储桶名称")
        
        try:
            # 删除对象
            resp = self.client.delete_object(bucket, object_key)
            
            # 优化日志格式
            logger.info(
                f"对象删除成功 - 存储桶: {bucket} | "
                f"对象键: {object_key}"
            )
            
            return {
                'success': True,
                'request_id': resp.request_id,
                'object_key': object_key,
                'bucket': bucket
            }
            
        except Exception as e:
            # 使用统一的异常处理方法
            error_info = f"对象键: {object_key}"
            self._handle_tos_exception("删除对象", bucket, e, error_info)
    
    def head_object(self, object_key: str, bucket_name: Optional[str] = None) -> Dict[str, Any]:
        """
        获取TOS对象的元信息
        
        Args:
            object_key: str, TOS中的对象键
            bucket_name: Optional[str], 存储桶名称，默认使用初始化时的桶名
            
        Returns:
            Dict[str, Any]: 包含对象元信息的字典，包含以下字段：
                - success: 布尔值，表示操作是否成功
                - request_id: 请求ID，用于定位问题
                - object_key: 获取元信息的对象键
                - bucket: 使用的存储桶名称
                - content_length: int, 对象大小（字节）
                - content_type: str, 对象的MIME类型
                - last_modified: str, 对象的最后修改时间
                - etag: str, 对象的ETag值
                - headers: Dict[str, str], 完整的响应头信息
                - storage_class: str, 对象的存储类型
                - owner: Dict[str, str], 对象所有者信息
                - status_code: int, HTTP状态码
            
        Raises:
            ValueError: 参数错误或参数格式不正确
            Exception: TOS相关错误
        """
        # 参数验证
        if not object_key:
            raise ValueError("必须指定object_key")
        
        # 使用指定的桶名或默认桶名
        bucket = bucket_name or self.bucket_name
        if not bucket:
            raise ValueError("未指定存储桶名称")
        
        try:
            # 获取对象元信息
            resp = self.client.head_object(bucket, object_key)
            
            # 优化日志格式
            logger.info(
                f"获取对象元信息成功 - 存储桶: {bucket} | "
                f"对象键: {object_key}"
            )
            
            return {
                'success': True,
                'request_id': resp.request_id,
                'headers': resp.headers,
                'content_length': int(resp.headers.get('content-length', 0)),
                'content_type': resp.headers.get('content-type', ''),
                'last_modified': resp.headers.get('last-modified', ''),
                'etag': resp.headers.get('etag', ''),
                'object_key': object_key,
                'bucket': bucket
            }
            
        except Exception as e:
            # 使用统一的异常处理方法
            error_info = f"对象键: {object_key}"
            self._handle_tos_exception("获取对象元信息", bucket, e, error_info)
    
    def list_objects(self, 
                     prefix: Optional[str] = None,
                     marker: Optional[str] = None,
                     max_keys: int = 1000,
                     delimiter: Optional[str] = None,
                     bucket_name: Optional[str] = None) -> Dict[str, Any]:
        """
        列举TOS存储桶中的对象
        
        Args:
            prefix: Optional[str], 列出以指定前缀开头的对象
            marker: Optional[str], 分页标记，列出指定标记之后的对象
            max_keys: int, 最大返回对象数量，默认1000，最大支持1000
            delimiter: Optional[str], 分隔符，用于分组
            bucket_name: Optional[str], 存储桶名称，默认使用初始化时的桶名
            
        Returns:
            Dict[str, Any]: 包含列举结果和分页信息的字典，包含以下字段：
                - success: 布尔值，表示列举是否成功
                - request_id: 请求ID，用于定位问题
                - bucket: 使用的存储桶名称
                - objects: List[Dict], 对象列表，每个对象包含key、size、etag、last_modified等信息
                - prefixes: List[str], 分组后的前缀列表
                - is_truncated: 布尔值，表示结果是否被截断
                - next_marker: 下一页的标记
                - max_keys: 返回的最大对象数量
                - status_code: HTTP状态码
            
        Raises:
            ValueError: 参数错误或参数格式不正确
            Exception: 参数错误或参数格式不正确
            Exception: TOS相关错误
        """
        # 参数验证
        if max_keys <= 0 or max_keys > 1000:
            raise ValueError("max_keys必须在1-1000之间")
        
        # 使用指定的桶名或默认桶名
        bucket = bucket_name or self.bucket_name
        if not bucket:
            raise ValueError("未指定存储桶名称")
        
        try:
            # 构建请求参数
            params = {}
            if prefix is not None:
                params['prefix'] = prefix
            if marker is not None:
                params['marker'] = marker
            if delimiter is not None:
                params['delimiter'] = delimiter
            
            # 列举对象
            resp = self.client.list_objects(bucket, max_keys=max_keys, **params)
            
            # 构建返回结果
            objects = []
            for obj in resp.contents:
                objects.append({
                    'key': obj.key,
                    'size': obj.size,
                    'etag': obj.etag,
                    'last_modified': obj.last_modified
                })
            
            # 获取公共前缀（如果有）
            common_prefixes = []
            if hasattr(resp, 'common_prefixes'):
                common_prefixes = [cp.prefix for cp in resp.common_prefixes]
            
            # 优化日志格式
            prefix_info = f"前缀: {prefix} | " if prefix else ""
            logger.info(
                f"列举对象成功 - 存储桶: {bucket} | "
                f"{prefix_info}数量: {len(objects)} | "
                f"是否截断: {resp.is_truncated}"
            )
            
            return {
                'success': True,
                'request_id': resp.request_id,
                'objects': objects,
                'common_prefixes': common_prefixes,
                'is_truncated': resp.is_truncated,
                'next_marker': resp.next_marker if hasattr(resp, 'next_marker') else None,
                'bucket': bucket
            }
            
        except Exception as e:
            # 使用统一的异常处理方法
            error_info = f"前缀: {prefix}, 最大键数: {max_keys}"
            self._handle_tos_exception("列举对象", bucket, e, error_info)
    
    def delete_objects(self, 
                      object_keys: List[str], 
                      bucket_name: Optional[str] = None) -> Dict[str, Any]:
        """
        批量删除对象
        
        Args:
            object_keys: List[str], 对象键列表
            bucket_name: Optional[str], 存储桶名称，默认使用初始化时的桶名
            
        Returns:
            包含批量删除结果的字典，包含以下字段：
                - success: 布尔值，表示删除是否成功
                - request_id: 请求ID，用于定位问题
                - bucket: 使用的存储桶名称
                - deleted: List[str], 成功删除的对象键列表
                - errors: List[Dict], 删除失败的对象信息列表，每个对象包含key、code、message等信息
                - status_code: HTTP状态码
                
        Raises:
            ValueError: 参数错误或参数格式不正确
            Exception: TOS相关错误
        """
        # 参数验证
        if not object_keys or not isinstance(object_keys, list):
            raise ValueError("必须提供有效的对象键列表")
        
        if len(object_keys) == 0:
            raise ValueError("对象键列表不能为空")
        
        # 验证每个object_key
        for key in object_keys:
            if not key or not isinstance(key, str):
                raise ValueError("对象键必须是非空字符串")
        
        # 使用指定的桶名或默认桶名
        bucket = bucket_name or self.bucket_name
        if not bucket:
            raise ValueError("未指定存储桶名称")
        
        try:
            # 批量删除对象
            resp = self.client.delete_objects(bucket, object_keys)
            
            # 获取删除结果
            deleted_keys = [obj.key for obj in resp.deleted]
            errors = []
            if hasattr(resp, 'errors'):
                errors = [{'key': err.key, 'code': err.code, 'message': err.message} for err in resp.errors]
            
            # 优化日志格式
            logger.info(
                f"批量删除对象成功 - 存储桶: {bucket} | "
                f"总数量: {len(object_keys)} | "
                f"成功: {len(deleted_keys)} | "
                f"失败: {len(errors)}"
            )
            
            return {
                'success': True,
                'request_id': resp.request_id,
                'deleted': deleted_keys,
                'errors': errors,
                'bucket': bucket
            }
            
        except Exception as e:
            # 使用统一的异常处理方法
            error_info = f"对象数量: {len(object_keys)}"
            self._handle_tos_exception("批量删除对象", bucket, e, error_info)
    
    def copy_object(self, 
                   source_object_key: str,
                   dest_object_key: str,
                   source_bucket_name: Optional[str] = None,
                   dest_bucket_name: Optional[str] = None) -> Dict[str, Any]:
        """
        复制对象
        
        Args:
            source_object_key: str, 源对象键
            dest_object_key: str, 目标对象键
            source_bucket_name: Optional[str], 源存储桶名称，默认使用初始化时的桶名
            dest_bucket_name: Optional[str], 目标存储桶名称，默认使用初始化时的桶名
            
        Returns:
            包含复制结果的字典，包含以下字段：
                - success: 布尔值，表示复制是否成功
                - request_id: 请求ID，用于定位问题
                - source_bucket: 源存储桶名称
                - dest_bucket: 目标存储桶名称
                - source_key: 源对象键
                - dest_key: 目标对象键
                - status_code: HTTP状态码
                
        Raises:
            ValueError: 参数错误或参数格式不正确
            Exception: TOS相关错误
        """
        # 参数验证
        if not source_object_key or not isinstance(source_object_key, str):
            raise ValueError("源对象键必须是非空字符串")
        
        if not dest_object_key or not isinstance(dest_object_key, str):
            raise ValueError("目标对象键必须是非空字符串")
        
        # 使用指定的桶名或默认桶名
        source_bucket = source_bucket_name or self.bucket_name
        dest_bucket = dest_bucket_name or self.bucket_name
        
        if not source_bucket:
            raise ValueError("未指定源存储桶名称")
        
        if not dest_bucket:
            raise ValueError("未指定目标存储桶名称")
        
        try:
            # 构建源对象信息
            source = {"bucket": source_bucket, "key": source_object_key}
            
            # 复制对象
            resp = self.client.copy_object(dest_bucket, dest_object_key, source)
            
            # 优化日志格式
            logger.info(f"对象复制成功: 源[{source_bucket}/{source_object_key}] -> 目标[{dest_bucket}/{dest_object_key}]")
            
            return {
                'success': True,
                'request_id': resp.request_id,
                'source_bucket': source_bucket,
                'dest_bucket': dest_bucket,
                'source_key': source_object_key,
                'dest_key': dest_object_key
            }
            
        except Exception as e:
            # 使用统一的异常处理方法
            error_info = f"源对象: {source_bucket}/{source_object_key}, 目标对象: {dest_bucket}/{dest_object_key}"
            self._handle_tos_exception("复制对象", dest_bucket, e, error_info)


# 使用示例
"""
# 方式1: 直接传入参数
# uploader = TOSUploader(
#     ak="your_access_key_id",
#     sk="your_access_key_secret",
#     endpoint="tos-cn-guangzhou.volces.com",
#     region="cn-guangzhou",
#     bucket_name="your-bucket-name"
# )

# 方式2: 从CSV文件加载配置
# uploader = TOSUploader(
#     config_csv_path="../用户信息.csv",
#     bucket_name="your-bucket-name"
# )

# 方式3: 从环境变量获取配置
# Windows设置环境变量示例:
# set TOS_ACCESS_KEY=your_access_key
# set TOS_SECRET_KEY=your_secret_key
# set TOS_ENDPOINT=tos-cn-guangzhou.volces.com
# set TOS_REGION=cn-guangzhou
# set TOS_BUCKET=your-bucket-name

# Linux/Mac设置环境变量示例:
# export TOS_ACCESS_KEY=your_access_key
# export TOS_SECRET_KEY=your_secret_key
# export TOS_ENDPOINT=tos-cn-beijing.volces.com
# export TOS_REGION=cn-beijing
# export TOS_BUCKET=your-bucket-name

# 然后初始化
# tos_uploader = TOSUploader()

# 上传本地图片
result = uploader.upload_image(
    file_path="path/to/your/image.jpg",
    object_key="images/product123.jpg",  # 可选，不指定则使用文件名
    content_type="image/jpeg"  # 可选，默认为image/jpeg
)
print(f"上传成功，访问URL: {result['object_url']}")

# 上传图片字节数据
import base64
with open("image.jpg", "rb") as f:
    image_bytes = f.read()
result = uploader.upload_image_bytes(
    image_bytes=image_bytes,
    object_key="images/dynamic.jpg"
)

# 创建存储桶示例
try:
    uploader.create_bucket("new-product-bucket", acl="private")
except Exception as e:
    print(f"创建存储桶失败: {e}")

# 在FastAPI应用中的集成示例
"""
# 在app/api/endpoints/upload.py中:
# from fastapi import APIRouter, UploadFile, File, HTTPException
# from app.utils.tos_utils import TOSUploader
# import os

# router = APIRouter()

# # 初始化TOS上传器
# tos_uploader = TOSUploader()

# @router.post("/upload/image/")
# async def upload_image(file: UploadFile = File(...)):
#     try:
#         # 保存临时文件
#         temp_path = f"temp_{file.filename}"
#         with open(temp_path, "wb") as buffer:
#             content = await file.read()
#             buffer.write(content)
#         
#         # 生成唯一的object_key
#         import uuid
#         unique_id = str(uuid.uuid4())[:8]
#         object_key = f"uploads/{unique_id}_{file.filename}"
#         
#         # 上传到TOS
#         result = tos_uploader.upload_image(
#             file_path=temp_path,
#             object_key=object_key,
#             content_type=file.content_type or "image/jpeg"
#         )
#         
#         # 清理临时文件
#         os.remove(temp_path)
#         
#         return {
#             "success": True,
#             "message": "图片上传成功",
#             "image_url": result["object_url"],
#             "object_key": result["object_key"]
#         }
#     except Exception as e:
#         # 清理临时文件
#         if os.path.exists(temp_path):
#             os.remove(temp_path)
#         raise HTTPException(status_code=500, detail=f"图片上传失败: {str(e)}")
"""
# 配置文件集成示例
"""
# 在app/config.py中添加TOS配置:
# class TOSConfig:
#     ACCESS_KEY = os.getenv("TOS_ACCESS_KEY", "your_default_key")
#     SECRET_KEY = os.getenv("TOS_SECRET_KEY", "your_default_secret")
#     ENDPOINT = os.getenv("TOS_ENDPOINT", "tos-cn-guangzhou.volces.com")  # 使用实际的endpoint
#     REGION = os.getenv("TOS_REGION", "cn-guangzhou")  # 使用实际的region
#     BUCKET = os.getenv("TOS_BUCKET", "your-default-bucket")

# # 在app/__init__.py中初始化:
# from app.config import TOSConfig
# 配置文件集成示例结束




















