import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# 确保可以导入模块
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.utils.ark_image_generator import ArkImageGenerator

class TestArkImageGenerator(unittest.TestCase):
    
    def setUp(self):
        # 设置测试环境变量
        self.test_api_key = "test_api_key_123"
        self.original_api_key = os.environ.get("ARK_API_KEY")
        os.environ["ARK_API_KEY"] = self.test_api_key
    
    def tearDown(self):
        # 恢复原始环境变量
        if self.original_api_key:
            os.environ["ARK_API_KEY"] = self.original_api_key
        else:
            os.environ.pop("ARK_API_KEY", None)
    
    @patch('app.utils.ark_image_generator.Ark')
    def test_initialization(self, mock_ark_class):
        """测试初始化是否正确"""
        # 创建实例
        generator = ArkImageGenerator()
        
        # 验证Ark类是否被正确调用
        mock_ark_class.assert_called_once_with(
            base_url="https://ark.cn-beijing.volces.com/api/v3/images/generations",
            api_key=self.test_api_key
        )
        
        # 测试使用自定义API密钥
        custom_api_key = "custom_key_456"
        generator = ArkImageGenerator(api_key=custom_api_key)
        mock_ark_class.assert_called_with(
            base_url="https://ark.cn-beijing.volces.com/api/v3/images/generations",
            api_key=custom_api_key
        )
    
    @patch('app.utils.ark_image_generator.Ark')
    def test_generate_images(self, mock_ark_class):
        """测试生成图片方法"""
        # 创建模拟响应
        mock_image1 = MagicMock()
        mock_image1.url = "https://example.com/image1.png"
        mock_image1.size = "2K"
        
        mock_image2 = MagicMock()
        mock_image2.url = "https://example.com/image2.png"
        mock_image2.size = "2K"
        
        mock_image3 = MagicMock()
        mock_image3.url = "https://example.com/image3.png"
        mock_image3.size = "2K"
        
        mock_response = MagicMock()
        mock_response.data = [mock_image1, mock_image2, mock_image3]
        mock_response.request_id = "test-request-id-123"
        mock_response.created = 1234567890
        
        # 设置mock链
        mock_ark_instance = MagicMock()
        mock_ark_class.return_value = mock_ark_instance
        mock_ark_instance.images.generate.return_value = mock_response
        
        # 创建生成器实例
        generator = ArkImageGenerator()
        
        # 测试参数
        test_prompt = "生成测试图片"
        test_images = ["https://example.com/ref1.png", "https://example.com/ref2.png"]
        
        # 调用方法
        result = generator.generate_images(
            prompt=test_prompt,
            images=test_images,
            max_images=3
        )
        
        # 验证调用
        mock_ark_instance.images.generate.assert_called_once()
        call_args = mock_ark_instance.images.generate.call_args
        
        # 验证关键参数
        self.assertEqual(call_args[1]["prompt"], test_prompt)
        self.assertEqual(call_args[1]["image"], test_images)
        self.assertEqual(call_args[1]["model"], "doubao-seedream-4-5-251128")
        self.assertEqual(call_args[1]["size"], "2K")
        self.assertEqual(call_args[1]["watermark"], False)
        self.assertEqual(call_args[1]["response_format"], "b64_json")
        # 验证sequential_image_generation_options中的max_images
        self.assertEqual(call_args[1]["sequential_image_generation_options"].max_images, 3)
        
        # 验证返回结果
        self.assertIsInstance(result, dict)
        self.assertIn("data", result)
        self.assertIn("request_id", result)
        self.assertIn("created", result)
        self.assertEqual(result["request_id"], "test-request-id-123")
        self.assertEqual(result["created"], 1234567890)
        self.assertEqual(len(result["data"]), 3)
        self.assertEqual(result["data"][0]["url"], "https://example.com/image1.png")
        self.assertEqual(result["data"][0]["size"], "2K")
        self.assertEqual(result["data"][1]["url"], "https://example.com/image2.png")
        self.assertEqual(result["data"][2]["url"], "https://example.com/image3.png")
    
    @patch('app.utils.ark_image_generator.Ark')
    def test_generate_images_with_default_params(self, mock_ark_class):
        """测试使用默认参数生成图片"""
        # 创建模拟响应
        mock_image = MagicMock()
        mock_image.url = "https://example.com/image.png"
        mock_image.size = "2K"
        mock_image.b64_json = "base64-encoded-image-data"
        mock_image.width = 2048
        mock_image.height = 1536
        mock_image.filename = "generated-image.png"
        mock_image.mime_type = "image/png"
        
        mock_response = MagicMock()
        mock_response.data = [mock_image]
        mock_response.request_id = "test-request-id-default"
        mock_response.created = 1234567890
        
        # 设置mock链
        mock_ark_instance = MagicMock()
        mock_ark_class.return_value = mock_ark_instance
        mock_ark_instance.images.generate.return_value = mock_response
        
        # 创建生成器实例
        generator = ArkImageGenerator()
        
        # 使用默认参数调用，与curl命令匹配
        result = generator.generate_images(
            prompt="充满活力的特写编辑肖像，模特眼神犀利，头戴雕塑感帽子，色彩拼接丰富，眼部焦点锐利，景深较浅，具有Vogue杂志封面的美学风格，采用中画幅拍摄，工作室灯光效果强烈。"
        )
        
        # 验证调用
        mock_ark_instance.images.generate.assert_called_once()
        call_args = mock_ark_instance.images.generate.call_args
        
        # 验证默认参数，与curl命令匹配
        self.assertEqual(call_args[1]["model"], "doubao-seedream-4-5-251128")
        self.assertEqual(call_args[1]["prompt"], "充满活力的特写编辑肖像，模特眼神犀利，头戴雕塑感帽子，色彩拼接丰富，眼部焦点锐利，景深较浅，具有Vogue杂志封面的美学风格，采用中画幅拍摄，工作室灯光效果强烈。")
        self.assertEqual(call_args[1]["size"], "2K")
        self.assertEqual(call_args[1]["sequential_image_generation"], "auto")
        self.assertEqual(call_args[1]["response_format"], "b64_json")
        self.assertEqual(call_args[1]["watermark"], False)
        self.assertEqual(call_args[1]["image"], [])
        
        # 验证返回结果
        self.assertIsInstance(result, dict)
        self.assertIn("data", result)
        self.assertIn("request_id", result)
        self.assertIn("created", result)
        self.assertEqual(result["request_id"], "test-request-id-default")
        self.assertEqual(result["created"], 1234567890)
        self.assertEqual(len(result["data"]), 1)
        self.assertEqual(result["data"][0]["url"], "https://example.com/image.png")
        self.assertEqual(result["data"][0]["size"], "2K")
        self.assertEqual(result["data"][0]["b64_json"], "base64-encoded-image-data")
        self.assertEqual(result["data"][0]["width"], 2048)
        self.assertEqual(result["data"][0]["height"], 1536)
        self.assertEqual(result["data"][0]["filename"], "generated-image.png")
        self.assertEqual(result["data"][0]["mime_type"], "image/png")
    
    @patch('app.utils.ark_image_generator.Ark')
    def test_generate_images_with_empty_images_list(self, mock_ark_class):
        """测试传入空图片列表"""
        # 创建模拟响应
        mock_image = MagicMock()
        mock_image.url = "https://example.com/image.png"
        mock_image.size = "2K"
        
        mock_response = MagicMock()
        mock_response.data = [mock_image]
        mock_response.request_id = "test-request-id-empty"
        mock_response.created = 1234567890
        
        # 设置mock链
        mock_ark_instance = MagicMock()
        mock_ark_class.return_value = mock_ark_instance
        mock_ark_instance.images.generate.return_value = mock_response
        
        # 创建生成器实例
        generator = ArkImageGenerator()
        
        # 调用方法，传入空图片列表
        result = generator.generate_images(
            prompt="测试空图片列表",
            images=[]
        )
        
        # 验证调用
        mock_ark_instance.images.generate.assert_called_once()
        call_args = mock_ark_instance.images.generate.call_args
        
        # 验证图片列表为空
        self.assertEqual(call_args[1]["image"], [])
        self.assertEqual(call_args[1]["model"], "doubao-seedream-4-5-251128")
        
        # 验证返回结果
        self.assertIsInstance(result, dict)
        self.assertIn("data", result)
        self.assertIn("request_id", result)
        self.assertIn("created", result)
        self.assertEqual(result["request_id"], "test-request-id-empty")
        self.assertEqual(result["created"], 1234567890)
        self.assertEqual(len(result["data"]), 1)

if __name__ == '__main__':
    unittest.main()