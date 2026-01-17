# -*- coding: utf-8 -*-
"""
阿里云OSS上传工具类

使用阿里云OSS Python SDK V2进行文件上传
参考文档：https://help.aliyun.com/zh/oss/developer-reference/simple-upload-using-oss-sdk-for-python-v2

配置：
- 需要设置环境变量 ALIBABA_CLOUD_ACCESS_KEY_ID 和 ALIBABA_CLOUD_ACCESS_KEY_SECRET
- 默认Bucket: yilaitu-user-image
"""

import os
import alibabacloud_oss_v2 as oss
from alibabacloud_oss_v2.models import PutObjectRequest
from typing import Optional, Union, BinaryIO

class AliyunOSSUploader:
    """
    阿里云OSS文件上传工具类
    """
    
    def __init__(self, 
                 access_key_id: str = None, 
                 access_key_secret: str = None, 
                 bucket_name: str = 'yilaitu-user-image', 
                 region: str = 'cn-shanghai',
                 endpoint: str = None):
        """
        初始化OSS上传工具
        
        Args:
            access_key_id: AccessKey ID，默认从环境变量读取
            access_key_secret: AccessKey Secret，默认从环境变量读取
            bucket_name: 存储空间名称
            region: 区域，默认 cn-shanghai
            endpoint: 自定义Endpoint
        """
        self.access_key_id = access_key_id or os.environ.get('ALIBABA_CLOUD_ACCESS_KEY_ID')
        self.access_key_secret = access_key_secret or os.environ.get('ALIBABA_CLOUD_ACCESS_KEY_SECRET')
        self.bucket_name = bucket_name
        self.region = region
        self.endpoint = endpoint

        if not self.access_key_id or not self.access_key_secret:
             raise ValueError("缺少 ALIBABA_CLOUD_ACCESS_KEY_ID 或 ALIBABA_CLOUD_ACCESS_KEY_SECRET 配置")

        # 使用静态凭证提供者
        credentials_provider = oss.credentials.StaticCredentialsProvider(
            access_key_id=self.access_key_id,
            access_key_secret=self.access_key_secret
        )

        # 加载默认配置
        cfg = oss.config.load_default()
        cfg.credentials_provider = credentials_provider
        cfg.region = self.region
        if self.endpoint:
            cfg.endpoint = self.endpoint

        # 创建客户端
        self.client = oss.Client(cfg)

    def upload_file(self, file_path: str, object_name: str = None) -> str:
        """
        上传本地文件
        
        Args:
            file_path: 本地文件路径
            object_name: OSS中的对象名称，如果为None则使用文件名
            
        Returns:
            str: 文件的访问URL
        """
        if object_name is None:
            object_name = os.path.basename(file_path)
            
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")

        # 使用 put_object_from_file 方法上传文件
        result = self.client.put_object_from_file(
            oss.PutObjectRequest(
                bucket=self.bucket_name,
                key=object_name
            ),
            file_path
        )
        
        return self._get_file_url(object_name)

    def upload_bytes(self, data: bytes, object_name: str) -> str:
        """
        上传字节数据
        
        Args:
            data: 字节数据
            object_name: OSS中的对象名称
            
        Returns:
            str: 文件的访问URL
        """
        # 使用 put_object 方法上传字节流
        result = self.client.put_object(
            oss.PutObjectRequest(
                bucket=self.bucket_name,
                key=object_name,
                body=data
            )
        )
        
        return self._get_file_url(object_name)

    def _get_file_url(self, object_name: str) -> str:
        """
        构造文件访问URL
        """
        # 默认使用HTTPS
        # 格式: https://{bucket}.oss-{region}.aliyuncs.com/{object_name}
        return f"https://{self.bucket_name}.oss-{self.region}.aliyuncs.com/{object_name}"
