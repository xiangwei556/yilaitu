import os
from volcenginesdkarkruntime import Ark
from volcenginesdkarkruntime.types.images.images import SequentialImageGenerationOptions

class ArkImageGenerator:
    """
    火山引擎Ark图片生成工具类
    """
    
    def __init__(self, base_url="https://ark.cn-beijing.volces.com/api/v3", api_key=None):
        """
        初始化Ark客户端
        
        Args:
            base_url: Ark API的基础URL
            api_key: Ark API密钥，如果为None则从环境变量ARK_API_KEY读取
        """
        self.base_url = base_url
        self.api_key = api_key or os.environ.get("ARK_API_KEY")
        
        # 初始化Ark客户端
        self.client = Ark(
            base_url=self.base_url,
            api_key=self.api_key,
        )
    
    def generate_images(self, 
                       model="doubao-seedream-4-5-251128", 
                       prompt="",
                       images=None,
                       size="2K",
                       sequential_image_generation="disabled",
                       max_images=1,
                       response_format="b64_json",
                       watermark=False):
        """
        生成图片
        
        Args:
            model: 使用的模型名称
            prompt: 图片生成提示词
            images: 参考图片列表，支持URL格式或Base64编码格式（data:image/<图片格式>;base64,<Base64编码>）
                   doubao-seedream-4-0-250828模型支持单图或多图输入
            size: 生成图片的尺寸
            sequential_image_generation: 序列图生成模式 sequential_image_generation="auto",
            max_images: 最大生成图片数量
            response_format: 响应格式
            watermark: 是否添加水印
            
        Returns:
            生成的图片数据列表，每个元素包含url和size
        """
        # 设置序列图生成选项
        seq_options = SequentialImageGenerationOptions(max_images=max_images)
        
        # 调用API生成图片
        response = self.client.images.generate(
            model=model,
            prompt=prompt,
            image=images or [],
            size=size,
            sequential_image_generation=sequential_image_generation,
            sequential_image_generation_options=seq_options,
            response_format=response_format,
            watermark=watermark
        )
        
        # 提取图片数据
        result = {
            "data": [],
            "request_id": getattr(response, "request_id", None),
            "created": getattr(response, "created", None)
        }
        
        for image in response.data:
            image_info = {
                "url": getattr(image, "url", None),
                "size": getattr(image, "size", None),
                "b64_json": getattr(image, "b64_json", None),
                "width": getattr(image, "width", None),
                "height": getattr(image, "height", None),
                "filename": getattr(image, "filename", None),
                "mime_type": getattr(image, "mime_type", None)
            }
            result["data"].append(image_info)
        
        return result