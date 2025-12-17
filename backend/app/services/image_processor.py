from PIL import Image, ImageFilter
import os
from typing import Optional, Tuple, Dict
import logging

logger = logging.getLogger(__name__)

class ImageProcessor:
    """AI图像处理器，负责抠图和图像合成"""
    
    def __init__(self):
        """初始化图像处理器"""
        # 配置OpenCV和PIL的基本参数
        self.min_confidence = 0.5
        logger.info("图像处理器初始化完成")
    
    def load_image(self, image_path: str) -> Optional[Image.Image]:
        """加载图像文件"""
        try:
            image = Image.open(image_path)
            # 确保图像为RGBA模式
            if image.mode != 'RGBA':
                image = image.convert('RGBA')
            return image
        except Exception as e:
            logger.error(f"加载图像失败 {image_path}: {str(e)}")
            return None
    
    def save_image(self, image: Image.Image, output_path: str) -> bool:
        """保存图像到文件"""
        try:
            # 确保目录存在
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            image.save(output_path, 'PNG')
            return True
        except Exception as e:
            logger.error(f"保存图像失败 {output_path}: {str(e)}")
            return False
    
    def remove_background(self, image: Image.Image, feather_amount: float = 0.5) -> Optional[Image.Image]:
        """
        智能抠图（简化版本，仅使用PIL）
        - image: 输入图像
        - feather_amount: 边缘羽化程度 (0-1)
        
        返回: 带透明背景的图像
        """
        try:
            # 简化版本：直接使用图像的Alpha通道作为遮罩
            # 在实际应用中，这里会有更复杂的分割算法
            result = image.copy()
            
            # 应用边缘羽化
            if feather_amount > 0:
                result = self.feather_edges(result, feather_amount)
            
            return result
        
        except Exception as e:
            logger.error(f"抠图失败: {str(e)}")
            # 如果算法失败，返回原始图像
            return image
    
    def feather_edges(self, image: Image.Image, feather_amount: float = 0.5) -> Image.Image:
        """边缘羽化处理"""
        try:
            # 获取alpha通道
            r, g, b, a = image.split()
            
            # 根据羽化程度计算半径
            radius = max(1, int(5 * feather_amount))
            
            # 对alpha通道进行高斯模糊
            a_blurred = a.filter(ImageFilter.GaussianBlur(radius=radius))
            
            # 合并回原图
            return Image.merge('RGBA', (r, g, b, a_blurred))
        except Exception as e:
            logger.error(f"边缘羽化失败: {str(e)}")
            return image
    
    def replace_background(self, 
                         foreground: Image.Image,
                         background: Image.Image,
                         position_x: float = 0.5,
                         position_y: float = 0.5,
                         scale: float = 1.0,
                         rotate: float = 0.0) -> Optional[Image.Image]:
        """
        替换背景
        - foreground: 前景图像（带透明通道）
        - background: 背景图像
        - position_x, position_y: 前景在背景中的位置 (0-1)
        - scale: 缩放比例
        - rotate: 旋转角度
        
        返回: 合成后的图像
        """
        try:
            # 确保背景为RGBA模式
            if background.mode != 'RGBA':
                background = background.convert('RGBA')
            
            # 调整前景大小
            new_width = int(foreground.width * scale)
            new_height = int(foreground.height * scale)
            resized_foreground = foreground.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # 旋转前景
            if rotate != 0:
                resized_foreground = resized_foreground.rotate(rotate, expand=True)
            
            # 计算放置位置
            bg_width, bg_height = background.size
            fg_width, fg_height = resized_foreground.size
            
            x = int((bg_width - fg_width) * position_x)
            y = int((bg_height - fg_height) * position_y)
            
            # 创建结果图像
            result = background.copy()
            
            # 将前景粘贴到背景上
            result.paste(resized_foreground, (x, y), resized_foreground)
            
            return result
            
        except Exception as e:
            logger.error(f"背景替换失败: {str(e)}")
            return None
    
    def process_image(self,
                     foreground_path: str,
                     background_path: Optional[str] = None,
                     output_path: str = None,
                     params: Dict = None) -> Tuple[bool, Optional[str]]:
        """
        处理图像的主函数
        - foreground_path: 前景图像路径
        - background_path: 背景图像路径（可选）
        - output_path: 输出路径
        - params: 处理参数
        
        返回: (是否成功, 输出路径或错误消息)
        """
        try:
            # 设置默认参数
            if params is None:
                params = {}
            
            feather_amount = params.get('feather_amount', 0.5)
            scale = params.get('scale', 1.0)
            position_x = params.get('position_x', 0.5)
            position_y = params.get('position_y', 0.5)
            rotate = params.get('rotate', 0.0)
            
            # 加载前景图像
            foreground = self.load_image(foreground_path)
            if foreground is None:
                return False, "无法加载前景图像"
            
            # 抠图
            logger.info(f"开始抠图处理，羽化程度: {feather_amount}")
            processed_foreground = self.remove_background(foreground, feather_amount)
            
            # 如果提供了背景，则替换背景
            if background_path:
                background = self.load_image(background_path)
                if background is None:
                    return False, "无法加载背景图像"
                
                logger.info(f"开始背景替换，缩放: {scale}, 位置: ({position_x}, {position_y}), 旋转: {rotate}")
                result_image = self.replace_background(
                    processed_foreground,
                    background,
                    position_x,
                    position_y,
                    scale,
                    rotate
                )
            else:
                # 仅返回抠图结果
                result_image = processed_foreground
            
            # 保存结果
            if result_image and output_path:
                success = self.save_image(result_image, output_path)
                if success:
                    return True, output_path
                else:
                    return False, "保存结果失败"
            
            return True, "处理成功"
            
        except Exception as e:
            logger.error(f"图像处理失败: {str(e)}")
            return False, str(e)

# 创建全局图像处理器实例
image_processor = ImageProcessor()

# 简单的API函数，方便其他模块调用
def process_image(
    foreground_path: str,
    background_path: Optional[str] = None,
    output_path: Optional[str] = None,
    params: Optional[Dict] = None
) -> Tuple[bool, Optional[str]]:
    """处理图像的便捷函数"""
    return image_processor.process_image(
        foreground_path=foreground_path,
        background_path=background_path,
        output_path=output_path,
        params=params
    )