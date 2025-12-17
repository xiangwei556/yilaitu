import unittest
from unittest.mock import patch, MagicMock, PropertyMock
import os
import sys
from typing import Dict, Any, Optional, Tuple

# 添加app目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.utils.tos_utils import TOSClient

class TestPutObject(unittest.TestCase):
    
    def setUp(self):
        """设置测试环境，每个测试方法运行前执行"""
        # 初始化TOSClient，使用模拟的配置
        self.tos_client = TOSClient(
            ak="test_ak",
            sk="test_sk",
            endpoint="tos.example.com",
            region="cn-test",
            bucket_name="test-bucket"
        )
    
    @patch('app.utils.tos_utils.tos')
    def test_put_object_string_content(self, mock_tos):
        """测试字符串内容上传"""
        # 模拟ACL类型
        mock_tos.ACLType = MagicMock()
        mock_tos.ACLType.ACL_Private = "private"
        mock_tos.ACLType.ACL_Public_Read = "public-read"
        mock_tos.ACLType.ACL_Public_Read_Write = "public-read-write"
        
        # 模拟TOS客户端响应
        mock_response = MagicMock()
        mock_response.request_id = "test_request_id"
        mock_response.etag = "test_etag"
        mock_response.hash_crc64_ecma = "test_crc64"
        mock_response.status_code = 200
        
        # 设置模拟客户端的put_object方法返回值
        self.tos_client.client = MagicMock()
        self.tos_client.client.put_object.return_value = mock_response
        
        # 测试字符串内容上传
        content = "测试内容"
        result = self.tos_client.put_object("test_key.txt", content)
        
        # 验证结果
        self.assertTrue(result['success'])
        self.assertEqual(result['request_id'], "test_request_id")
        self.assertEqual(result['object_key'], "test_key.txt")
        self.assertEqual(result['bucket'], "test-bucket")
        self.assertEqual(result['hash_crc64_ecma'], "test_crc64")
        self.assertEqual(result['etag'], "test_etag")
        self.assertEqual(result['status_code'], 200)
        self.assertEqual(result['object_url'], "https://test-bucket.tos.example.com/test_key.txt")
        
        # 验证调用参数
        self.tos_client.client.put_object.assert_called_with(
            bucket="test-bucket",
            key="test_key.txt",
            content=content
        )
    
    @patch('app.utils.tos_utils.tos')
    def test_put_object_binary_content(self, mock_tos):
        """测试字节内容上传"""
        # 模拟ACL类型
        mock_tos.ACLType = MagicMock()
        
        # 模拟TOS客户端响应
        mock_response = MagicMock()
        mock_response.request_id = "test_request_id"
        mock_response.etag = "binary_etag"
        mock_response.hash_crc64_ecma = "binary_crc64"
        mock_response.status_code = 200
        
        # 设置模拟客户端
        self.tos_client.client = MagicMock()
        self.tos_client.client.put_object.return_value = mock_response
        
        # 测试字节内容上传
        binary_content = b"test binary content"
        result = self.tos_client.put_object("test_key.bin", binary_content)
        
        # 验证结果
        self.assertTrue(result['success'])
        self.assertEqual(result['object_key'], "test_key.bin")
        self.assertEqual(result['hash_crc64_ecma'], "binary_crc64")
        
        # 验证调用参数
        self.tos_client.client.put_object.assert_called_with(
            bucket="test-bucket",
            key="test_key.bin",
            content=binary_content
        )
    
    @patch('app.utils.tos_utils.tos')
    def test_put_object_with_optional_params(self, mock_tos):
        """测试上传时使用可选参数"""
        # 模拟ACL类型
        mock_tos.ACLType = MagicMock()
        mock_tos.ACLType.ACL_Private = "private"
        mock_tos.ACLType.ACL_Public_Read = "public-read"
        mock_tos.ACLType.ACL_Public_Read_Write = "public-read-write"
        
        # 模拟TOS客户端响应
        mock_response = MagicMock()
        mock_response.request_id = "test_request_id"
        mock_response.status_code = 200
        
        # 设置模拟客户端
        self.tos_client.client = MagicMock()
        self.tos_client.client.put_object.return_value = mock_response
        
        # 测试带所有可选参数的上传
        content = "test content"
        meta = {"author": "test"}
        
        result = self.tos_client.put_object(
            "test_key.txt",
            content,
            bucket_name="custom-bucket",
            acl="public-read",
            storage_class="standard",
            meta=meta
        )
        
        # 验证结果
        self.assertTrue(result['success'])
        self.assertEqual(result['bucket'], "custom-bucket")
        
        # 验证调用参数（不检查具体的ACL和storage_class枚举值，因为它们在代码中被转换）
        call_kwargs = self.tos_client.client.put_object.call_args[1]
        self.assertEqual(call_kwargs['bucket'], "custom-bucket")
        self.assertEqual(call_kwargs['key'], "test_key.txt")
        self.assertEqual(call_kwargs['content'], "test content")
        self.assertEqual(call_kwargs['meta'], {"author": "test"})
        # 确认ACL和storage_class被传递
        self.assertIn('acl', call_kwargs)
        self.assertIn('storage_class', call_kwargs)
    
    @patch('app.utils.tos_utils.tos')
    def test_put_object_with_different_acl_types(self, mock_tos):
        """测试不同的ACL类型"""
        # 模拟TOS客户端响应
        mock_response = MagicMock()
        mock_response.status_code = 200
        
        # 设置模拟客户端
        self.tos_client.client = MagicMock()
        self.tos_client.client.put_object.return_value = mock_response
        
        # 模拟ACL类型
        mock_tos.ACLType = MagicMock()
        mock_tos.ACLType.ACL_Private = "private"
        mock_tos.ACLType.ACL_Public_Read = "public-read"
        mock_tos.ACLType.ACL_Public_Read_Write = "public-read-write"
        
        # 测试private ACL
        self.tos_client.put_object("test.txt", "content", acl="private")
        call_kwargs = self.tos_client.client.put_object.call_args[1]
        self.assertIn('acl', call_kwargs)
        
        # 重置mock
        self.tos_client.client.put_object.reset_mock()
        
        # 测试public-read ACL
        self.tos_client.put_object("test.txt", "content", acl="public-read")
        call_kwargs = self.tos_client.client.put_object.call_args[1]
        self.assertIn('acl', call_kwargs)
        
        # 重置mock
        self.tos_client.client.put_object.reset_mock()
        
        # 测试public-read-write ACL
        self.tos_client.put_object("test.txt", "content", acl="public-read-write")
        call_kwargs = self.tos_client.client.put_object.call_args[1]
        self.assertIn('acl', call_kwargs)
    
    @patch('app.utils.tos_utils.tos')
    def test_put_object_with_different_storage_classes(self, mock_tos):
        """测试不同的存储类型"""
        # 模拟TOS客户端响应
        mock_response = MagicMock()
        mock_response.status_code = 200
        
        # 设置模拟客户端
        self.tos_client.client = MagicMock()
        self.tos_client.client.put_object.return_value = mock_response
        
        # 测试standard存储类型
        self.tos_client.put_object("test.txt", "content", storage_class="standard")
        call_kwargs = self.tos_client.client.put_object.call_args[1]
        self.assertEqual(call_kwargs['storage_class'], "STANDARD")
        
        # 重置mock
        self.tos_client.client.put_object.reset_mock()
        
        # 测试ia存储类型
        self.tos_client.put_object("test.txt", "content", storage_class="ia")
        call_kwargs = self.tos_client.client.put_object.call_args[1]
        self.assertEqual(call_kwargs['storage_class'], "IA")
        
        # 重置mock
        self.tos_client.client.put_object.reset_mock()
        
        # 测试archive存储类型
        self.tos_client.put_object("test.txt", "content", storage_class="archive")
        call_kwargs = self.tos_client.client.put_object.call_args[1]
        self.assertEqual(call_kwargs['storage_class'], "ARCHIVE")
    
    @patch('app.utils.tos_utils.tos')
    def test_put_object_invalid_parameters(self, mock_tos):
        """测试参数验证失败的情况"""
        # 模拟ACL类型
        mock_tos.ACLType = MagicMock()
        mock_tos.ACLType.ACL_Private = "private"
        mock_tos.ACLType.ACL_Public_Read = "public-read"
        mock_tos.ACLType.ACL_Public_Read_Write = "public-read-write"
        
        # 测试空的object_key
        with self.assertRaises(ValueError) as context:
            self.tos_client.put_object("", "content")
        self.assertIn("必须指定有效的object_key字符串", str(context.exception))
        
        # 测试None的object_key
        with self.assertRaises(ValueError) as context:
            self.tos_client.put_object(None, "content")
        self.assertIn("必须指定有效的object_key字符串", str(context.exception))
        
        # 测试空的content
        with self.assertRaises(ValueError) as context:
            self.tos_client.put_object("test.txt", None)
        self.assertIn("上传内容不能为空", str(context.exception))
        
        # 测试无存储桶名称的情况
        # 创建一个没有设置默认bucket的TOSClient实例
        tos_client_no_bucket = TOSClient(
            ak="test_ak",
            sk="test_sk",
            endpoint="tos.example.com",
            region="cn-test"
        )
        
        with self.assertRaises(ValueError) as context:
            tos_client_no_bucket.put_object("test.txt", "content")
        self.assertIn("未指定存储桶名称", str(context.exception))
        
        # 测试不支持的ACL类型
        with self.assertRaises(ValueError) as context:
            self.tos_client.put_object("test.txt", "content", acl="invalid-acl")
        self.assertIn("不支持的ACL类型", str(context.exception))
        
        # 测试不支持的存储类型
        with self.assertRaises(ValueError) as context:
            self.tos_client.put_object("test.txt", "content", storage_class="invalid-storage")
        self.assertIn("不支持的存储类型", str(context.exception))
    
    @patch('app.utils.tos_utils.tos')
    def test_put_object_tos_exception(self, mock_tos):
        """测试TOS服务异常情况"""
        # 设置模拟客户端抛出异常
        self.tos_client.client = MagicMock()
        self.tos_client.client.put_object.side_effect = Exception("TOS服务器错误")
        
        # 测试异常处理
        with self.assertRaises(Exception):
            self.tos_client.put_object("test.txt", "content")
    
    @patch('app.utils.tos_utils.tos')
    def test_put_object_with_custom_bucket(self, mock_tos):
        """测试使用自定义存储桶名称"""
        # 模拟ACL类型
        mock_tos.ACLType = MagicMock()
        
        # 模拟TOS客户端响应
        mock_response = MagicMock()
        mock_response.request_id = "test_request_id"
        mock_response.status_code = 200
        
        # 设置模拟客户端
        self.tos_client.client = MagicMock()
        self.tos_client.client.put_object.return_value = mock_response
        
        # 测试使用自定义存储桶
        custom_bucket = "custom-bucket-name"
        result = self.tos_client.put_object(
            "test_key.txt", 
            "content", 
            bucket_name=custom_bucket
        )
        
        # 验证使用了正确的存储桶
        self.assertEqual(result['bucket'], custom_bucket)
        
        # 验证调用参数
        self.tos_client.client.put_object.assert_called_with(
            bucket=custom_bucket,
            key="test_key.txt",
            content="content"
        )
    
    @patch('app.utils.tos_utils.tos')
    def test_put_object_response_fields(self, mock_tos):
        """测试响应字段的完整性"""
        # 模拟ACL类型
        mock_tos.ACLType = MagicMock()
        
        # 模拟TOS客户端响应，只设置部分字段
        mock_response = MagicMock(spec=['request_id'])  # 只允许访问request_id属性
        mock_response.request_id = "test_request_id"
        
        # 设置模拟客户端
        self.tos_client.client = MagicMock()
        self.tos_client.client.put_object.return_value = mock_response
        
        # 测试上传
        result = self.tos_client.put_object("test_key.txt", "content")
        
        # 验证结果字段
        self.assertTrue(result['success'])
        self.assertEqual(result['request_id'], "test_request_id")
        # 验证缺失字段 - MagicMock会返回MagicMock对象而不是None
        self.assertTrue('hash_crc64_ecma' in result)
        self.assertTrue('etag' in result)
        self.assertEqual(result['status_code'], 200)  # 默认值

if __name__ == '__main__':
    unittest.main()