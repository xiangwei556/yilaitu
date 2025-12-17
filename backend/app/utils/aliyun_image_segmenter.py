# -*- coding: utf-8 -*-
"""
阿里云图像分割工具类

使用阿里云视觉智能开放平台的图像分割API进行商品分割（抠图）

依赖：
- alibabacloud_imageseg20191230

配置：
- 需要设置环境变量 ALIBABA_CLOUD_ACCESS_KEY_ID 和 ALIBABA_CLOUD_ACCESS_KEY_SECRET
- 或者在初始化时直接传入
"""

import os
import io
from urllib.request import urlopen
from alibabacloud_imageseg20191230.client import Client
from alibabacloud_imageseg20191230.models import SegmentCommodityAdvanceRequest
from alibabacloud_tea_openapi.models import Config
from alibabacloud_tea_util.models import RuntimeOptions

class AliyunImageSegmenter:
    """
    阿里云图像分割工具类
    """
    
    def __init__(self, access_key_id=None, access_key_secret=None, endpoint='imageseg.cn-shanghai.aliyuncs.com', region_id='cn-shanghai'):
        """
        初始化阿里云图像分割工具
        
        Args:
            access_key_id: AccessKey ID，如果为None则从环境变量读取
            access_key_secret: AccessKey Secret，如果为None则从环境变量读取
            endpoint: API访问域名
            region_id: 访问区域ID
        
        Raises:
            ValueError: 缺少AccessKey ID或AccessKey Secret
        """
        # 从环境变量或参数中获取AccessKey
        self.access_key_id = access_key_id or os.environ.get('ALIBABA_CLOUD_ACCESS_KEY_ID')
        self.access_key_secret = access_key_secret or os.environ.get('ALIBABA_CLOUD_ACCESS_KEY_SECRET')
        
        if not self.access_key_id or not self.access_key_secret:
            raise ValueError("缺少AccessKey ID或AccessKey Secret，请通过环境变量或参数设置")
        
        # 初始化配置
        self.config = Config(
            access_key_id=self.access_key_id,
            access_key_secret=self.access_key_secret,
            endpoint=endpoint,
            region_id=region_id
        )
        
        # 初始化客户端
        self.client = Client(self.config)
        self.runtime = RuntimeOptions()
    
    def _load_image_from_url(self, url):
        """
        从URL加载图片
        
        Args:
            url: 图片URL
            
        Returns:
            io.BytesIO: 图片字节流
            
        Raises:
            Exception: 网络请求失败
        """
        return io.BytesIO(urlopen(url).read())
    
    def _load_image_from_file(self, file_path):
        """
        从本地文件加载图片
        
        Args:
            file_path: 本地图片文件路径
            
        Returns:
            io.BytesIO: 图片字节流
            
        Raises:
            FileNotFoundError: 文件不存在
            IOError: 文件读取失败
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"图片文件不存在: {file_path}")
        
        with open(file_path, 'rb') as f:
            return io.BytesIO(f.read())
    
    def segment_commodity(self, image_input):
        """
        商品分割
        
        Args:
            image_input: 图片输入，可以是本地文件路径或URL
            
        Returns:
            dict: 商品分割结果
            
        Raises:
            ValueError: 无效的输入类型
            Exception: API调用失败
        """
        # 加载图片
        if isinstance(image_input, str):
            # 判断是URL还是本地文件
            if image_input.startswith(('http://', 'https://')):
                # 从URL加载
                img = self._load_image_from_url(image_input)
            else:
                # 从本地文件加载
                img = self._load_image_from_file(image_input)
        else:
            raise ValueError(f"不支持的输入类型: {type(image_input).__name__}")
        
        # 创建请求
        segment_commodity_request = SegmentCommodityAdvanceRequest()
        segment_commodity_request.image_urlobject = img
        
        # 调用API
        response = self.client.segment_commodity_advance(segment_commodity_request, self.runtime)
        
        # 返回分割后的图片URL
        import json
        
        # 调试信息
        print(f"[DEBUG] 响应体结构: {dir(response.body)}")
        
        # 尝试不同的响应结构访问方式
        try:
            # 方式1: 直接访问response.body.data.ImageURL
            if hasattr(response.body, 'data'):
                print(f"[DEBUG] 响应体data属性结构: {dir(response.body.data)}")
                
                # 检查data是否有ImageURL属性
                if hasattr(response.body.data, 'ImageURL'):
                    image_url = response.body.data.ImageURL
                    print(f"[DEBUG] 获取到图片URL: {image_url}")
                    return image_url
            
            # 方式2: 尝试将响应转换为字典
            if hasattr(response.body, 'to_map'):
                response_map = response.body.to_map()
                print(f"[DEBUG] 响应体字典结构: {json.dumps(response_map, indent=2, ensure_ascii=False)}")
                
                # 检查字典中的数据结构
                if 'Data' in response_map:
                    if 'ImageURL' in response_map['Data']:
                        image_url = response_map['Data']['ImageURL']
                        print(f"[DEBUG] 从字典获取到图片URL: {image_url}")
                        return image_url
            
            # 方式3: 检查是否有image_url或类似属性
            for attr in dir(response.body):
                if not attr.startswith('_'):
                    value = getattr(response.body, attr)
                    if isinstance(value, str) and (value.startswith('http://') or value.startswith('https://')):
                        print(f"[DEBUG] 发现URL属性 {attr}: {value}")
                        return value
            
            # 如果以上方式都失败，抛出详细的错误信息
            raise ValueError(f"API响应结构不符合预期。响应体属性: {dir(response.body)}")
            
        except Exception as e:
            print(f"[ERROR] 处理API响应时发生异常: {type(e).__name__} - {str(e)}")
            import traceback
            traceback.print_exc()
            
            # 返回原始响应体的字典表示作为调试信息
            try:
                if hasattr(response.body, 'to_map'):
                    return response.body.to_map()
                else:
                    return response.body.__dict__
            except:
                return str(response.body)
    
    def segment_commodity_from_bytes(self, image_bytes):
        """
        从字节流进行商品分割
        
        Args:
            image_bytes: 图片字节流
            
        Returns:
            dict: 商品分割结果
            
        Raises:
            ValueError: 无效的输入类型
            Exception: API调用失败
        """
        if not isinstance(image_bytes, bytes):
            raise ValueError(f"不支持的输入类型: {type(image_bytes).__name__}")
        
        # 创建请求
        segment_commodity_request = SegmentCommodityAdvanceRequest()
        segment_commodity_request.image_urlobject = io.BytesIO(image_bytes)
        
        # 调用API
        response = self.client.segment_commodity_advance(segment_commodity_request, self.runtime)
        
        # 返回分割后的图片URL
        import json
        
        # 调试信息
        print(f"[DEBUG] 响应体结构: {dir(response.body)}")
        
        # 尝试不同的响应结构访问方式
        try:
            # 方式1: 直接访问response.body.data.ImageURL
            if hasattr(response.body, 'data'):
                #print(f"[DEBUG] 响应体data属性结构===: {dir(response.body.data)}")
                
                # 检查data是否有ImageURL属性
                if hasattr(response.body.data, 'ImageURL'):
                    image_url = response.body.data.ImageURL
                    print(f"[DEBUG] 获取到图片URL==: {image_url}")
                    return image_url
            
            # 方式2: 尝试将响应转换为字典
            if hasattr(response.body, 'to_map'):
                response_map = response.body.to_map()
                print(f"[DEBUG] 响应体字典结构: {json.dumps(response_map, indent=2, ensure_ascii=False)}")
                
                # 检查字典中的数据结构
                if 'Data' in response_map:
                    if 'ImageURL' in response_map['Data']:
                        image_url = response_map['Data']['ImageURL']
                        print(f"[DEBUG] 从字典获取到图片URL: {image_url}")
                        return image_url
            
            # 方式3: 检查是否有image_url或类似属性
            for attr in dir(response.body):
                if not attr.startswith('_'):
                    value = getattr(response.body, attr)
                    if isinstance(value, str) and (value.startswith('http://') or value.startswith('https://')):
                        print(f"[DEBUG] 发现URL属性 {attr}: {value}")
                        return value
            
            # 如果以上方式都失败，抛出详细的错误信息
            raise ValueError(f"API响应结构不符合预期。响应体属性: {dir(response.body)}")
            
        except Exception as e:
            print(f"[ERROR] 处理API响应时发生异常: {type(e).__name__} - {str(e)}")
            import traceback
            traceback.print_exc()
            
            # 返回原始响应体的字典表示作为调试信息
            try:
                if hasattr(response.body, 'to_map'):
                    return response.body.to_map()
                else:
                    return response.body.__dict__
            except:
                return str(response.body)