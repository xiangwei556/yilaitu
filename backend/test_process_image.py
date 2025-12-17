import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import UploadFile
import io
import os
import sys

# 确保可以导入main模块
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import app, process_image, tos_uploader

class TestProcessImage(unittest.TestCase):
    
    def setUp(self):
        # 创建一个测试用的图片数据
        from PIL import Image
        self.test_image = Image.new('RGB', (100, 100), color='white')
        self.image_bytes = io.BytesIO()
        self.test_image.save(self.image_bytes, format='PNG')
        self.image_bytes.seek(0)
    
    async def create_mock_upload_file(self):
        # 创建一个模拟的UploadFile对象
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "test_image.png"
        mock_file.read = AsyncMock(return_value=self.image_bytes.getvalue())
        return mock_file
    
    @patch('main.tos_uploader', None)
    @patch('main.image_processor')
    def test_process_image_without_tos_uploader(self, mock_processor):
        # 测试当tos_uploader为None时的行为
        # 设置模拟处理器的返回值
        mock_image = MagicMock()
        mock_processor.load_image.return_value = mock_image
        mock_processor.remove_background.return_value = mock_image
        mock_processor.replace_background.return_value = mock_image
        mock_processor.save_image.return_value = self.image_bytes.getvalue()
        
        # 创建模拟上传文件
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "test_image.png"
        mock_file.read = AsyncMock(return_value=self.image_bytes.getvalue())
        
        # 执行测试
        import asyncio
        result = asyncio.run(process_image(
            file=mock_file,
            width=800,
            height=600,
            background_type='white'
        ))
        
        # 验证结果
        self.assertTrue(result['success'])
        self.assertIn('/uploads/processed/', result['data']['image_url'])
        self.assertIn('processed/', result['data']['object_key'])
    
    @patch('main.tos_uploader')
    @patch('main.image_processor')
    def test_process_image_with_tos_uploader(self, mock_processor, mock_tos_uploader):
        # 测试当tos_uploader存在时的行为
        # 设置模拟处理器的返回值
        mock_image = MagicMock()
        mock_processor.load_image.return_value = mock_image
        mock_processor.remove_background.return_value = mock_image
        mock_processor.replace_background.return_value = mock_image
        mock_processor.save_image.return_value = self.image_bytes.getvalue()
        
        # 设置模拟TOS上传器的返回值
        mock_upload_result = {'object_url': 'https://tos.example.com/image.png'}
        mock_tos_uploader.put_object.return_value = mock_upload_result
        
        # 创建模拟上传文件
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "test_image.png"
        mock_file.read = AsyncMock(return_value=self.image_bytes.getvalue())
        
        # 执行测试
        import asyncio
        result = asyncio.run(process_image(
            file=mock_file,
            width=800,
            height=600,
            background_type='white'
        ))
        
        # 验证结果
        self.assertTrue(result['success'])
        self.assertEqual(result['data']['image_url'], 'https://tos.example.com/image.png')
        mock_tos_uploader.put_object.assert_called_once()
    
    @patch('main.tos_uploader')
    @patch('main.image_processor')
    def test_process_image_with_tos_uploader_failure(self, mock_processor, mock_tos_uploader):
        # 测试当TOS上传失败时的回退行为
        # 设置模拟处理器的返回值
        mock_image = MagicMock()
        mock_processor.load_image.return_value = mock_image
        mock_processor.remove_background.return_value = mock_image
        mock_processor.replace_background.return_value = mock_image
        mock_processor.save_image.return_value = self.image_bytes.getvalue()
        
        # 设置模拟TOS上传器抛出异常
        mock_tos_uploader.put_object.side_effect = Exception("Upload failed")
        
        # 创建模拟上传文件
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "test_image.png"
        mock_file.read = AsyncMock(return_value=self.image_bytes.getvalue())
        
        # 执行测试
        import asyncio
        result = asyncio.run(process_image(
            file=mock_file,
            width=800,
            height=600,
            background_type='white'
        ))
        
        # 验证结果 - 应该回退到本地存储
        self.assertTrue(result['success'])
        self.assertIn('/uploads/processed/', result['data']['image_url'])
    
    def test_current_tos_uploader_status(self):
        # 检查当前tos_uploader的状态
        print(f"当前tos_uploader状态: {tos_uploader}")
        print(f"tos_uploader类型: {type(tos_uploader)}")
        self.assertTrue(tos_uploader is None or hasattr(tos_uploader, 'put_object'))

if __name__ == '__main__':
    unittest.main()
