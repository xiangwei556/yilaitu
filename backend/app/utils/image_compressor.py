# -*- coding: utf-8 -*-
"""
图片压缩工具类

用于压缩图片，确保图片满足以下要求：
1. 支持格式：PNG、JPEG、JPG、BMP
2. 压缩后大小：不超过3MB
3. 分辨率：500×500像素到2000×2000像素之间
"""

import os
import io
from PIL import Image
from typing import Tuple, Union

class ImageCompressor:
    """
    图片压缩工具类
    """
    
    def __init__(self):
        """
        初始化图片压缩工具
        """
        # 支持的图片格式
        self.supported_formats = {
            'PNG': 'PNG',
            'JPEG': 'JPEG',
            'JPG': 'JPEG',  # JPG和JPEG是同一种格式
            'BMP': 'BMP'
        }
        
        # 压缩参数
        self.max_file_size = 3 * 1024 * 1024  # 3MB
        self.min_resolution = (500, 500)  # 最小分辨率
        self.max_resolution = (2000, 2000)  # 最大分辨率
        
        # JPEG/JPG默认质量
        self.default_quality = 85
    
    def _get_image_format(self, file_path: str) -> str:
        """
        获取图片格式
        
        Args:
            file_path: 图片文件路径
            
        Returns:
            str: 图片格式（大写）
            
        Raises:
            ValueError: 不支持的图片格式
        """
        file_ext = os.path.splitext(file_path)[1].upper()[1:]  # 去除点号并转为大写
        if file_ext not in self.supported_formats:
            raise ValueError(f"不支持的图片格式：{file_ext}。支持的格式：{', '.join(self.supported_formats.keys())}")
        return self.supported_formats[file_ext]
    
    def _resize_image(self, image: Image.Image) -> Image.Image:
        """
        调整图片分辨率到指定范围内
        
        Args:
            image: PIL Image对象
            
        Returns:
            Image.Image: 调整后的Image对象
        """
        width, height = image.size
        
        # 检查是否需要调整大小
        if (width < self.min_resolution[0] or height < self.min_resolution[1]):
            # 放大到最小分辨率
            ratio = max(self.min_resolution[0] / width, self.min_resolution[1] / height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            image = image.resize((new_width, new_height), Image.LANCZOS)
        elif (width > self.max_resolution[0] or height > self.max_resolution[1]):
            # 缩小到最大分辨率
            ratio = min(self.max_resolution[0] / width, self.max_resolution[1] / height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            image = image.resize((new_width, new_height), Image.LANCZOS)
        
        return image
    
    def _compress_image(self, image: Image.Image, format: str, quality: int = None) -> Tuple[io.BytesIO, int]:
        """
        压缩图片到指定大小
        
        Args:
            image: PIL Image对象
            format: 图片格式
            quality: 压缩质量（1-100，仅JPEG/JPG有效）
            
        Returns:
            Tuple[BytesIO, int]: 压缩后的图片字节流和大小（字节）
        """
        if quality is None:
            quality = self.default_quality
        
        # 创建字节流
        img_byte_arr = io.BytesIO()
        
        # 对于PNG和BMP，使用无损压缩
        if format in ['PNG', 'BMP']:
            image.save(img_byte_arr, format=format, optimize=True)
        else:  # JPEG/JPG
            # 逐步调整质量直到大小合适
            current_quality = quality
            while True:
                img_byte_arr.seek(0)
                img_byte_arr.truncate()
                image.save(img_byte_arr, format=format, quality=current_quality, optimize=True)
                file_size = img_byte_arr.tell()
                
                # 检查大小是否符合要求
                if file_size <= self.max_file_size or current_quality <= 10:
                    break
                    
                # 降低质量继续压缩
                current_quality -= 5
        
        # 获取文件大小并重置指针
        img_byte_arr.seek(0, io.SEEK_END)  # 移动到文件末尾
        file_size = img_byte_arr.tell()     # 获取大小
        img_byte_arr.seek(0)               # 重置指针到开头
        
        return img_byte_arr, file_size
    
    def compress_from_file(self, file_path: str, output_path: str = None, quality: int = None) -> Tuple[str, int]:
        """
        从文件压缩图片
        
        Args:
            file_path: 输入图片文件路径
            output_path: 输出图片文件路径（可选，默认在原文件路径后添加'_compressed'）
            quality: 压缩质量（1-100，仅JPEG/JPG有效）
            
        Returns:
            Tuple[str, int]: 压缩后的图片文件路径和大小（字节）
            
        Raises:
            ValueError: 不支持的图片格式
            FileNotFoundError: 输入文件不存在
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"输入文件不存在：{file_path}")
        
        # 获取图片大小
        file_size = os.path.getsize(file_path)
        
        # 打开图片检查分辨率
        with Image.open(file_path) as image:
            width, height = image.size
            
            # 检查是否需要压缩：如果大小小于3MB且分辨率在合理范围内（不大于2000x2000），则直接返回原文件
            if (file_size <= self.max_file_size and 
                width <= self.max_resolution[0] and height <= self.max_resolution[1] and
                width >= self.min_resolution[0] and height >= self.min_resolution[1]):
                
                # 直接返回原文件或复制到输出路径
                if output_path is None or output_path == file_path:
                    return file_path, file_size
                else:
                    # 复制原文件到输出路径
                    import shutil
                    shutil.copy2(file_path, output_path)
                    return output_path, file_size
        
        # 获取图片格式
        format = self._get_image_format(file_path)
        
        # 打开图片进行压缩
        with Image.open(file_path) as image:
            # 调整大小
            resized_image = self._resize_image(image)
            
            # 压缩图片
            img_byte_arr, file_size = self._compress_image(resized_image, format, quality)
            
            # 生成输出路径
            if output_path is None:
                base_name = os.path.splitext(file_path)[0]
                ext = os.path.splitext(file_path)[1]
                output_path = f"{base_name}_compressed{ext}"
            
            # 保存压缩后的图片
            with open(output_path, 'wb') as f:
                f.write(img_byte_arr.read())
            
            return output_path, file_size
    
    def compress_from_bytes(self, image_bytes: bytes, format: str, output_path: str = None, quality: int = None) -> Tuple[Union[io.BytesIO, str], int]:

        """
        从字节流压缩图片
        
        Args:
            image_bytes: 图片字节流
            format: 图片格式（PNG/JPEG/JPG/BMP）
            output_path: 输出图片文件路径（可选，不提供则返回字节流）
            quality: 压缩质量（1-100，仅JPEG/JPG有效）
            
        Returns:
            Tuple[Union[BytesIO, str], int]: 压缩后的图片字节流或文件路径，以及大小（字节）
            
        Raises:
            ValueError: 不支持的图片格式
        """
        # 验证格式
        format_upper = format.upper()
        if format_upper not in self.supported_formats:
            raise ValueError(f"不支持的图片格式：{format}。支持的格式：{', '.join(self.supported_formats.keys())}")
        
        # 获取图片大小
        file_size = len(image_bytes)
        
        # 打开图片检查分辨率
        img_byte_arr = io.BytesIO(image_bytes)
        with Image.open(img_byte_arr) as image:
            width, height = image.size
            
            # 检查是否需要压缩：如果大小小于3MB且分辨率在合理范围内（不大于2000x2000），则直接返回原字节流
            if (file_size <= self.max_file_size and 
                width <= self.max_resolution[0] and height <= self.max_resolution[1] and
                width >= self.min_resolution[0] and height >= self.min_resolution[1]):
                
                if output_path:
                    # 保存原字节流到文件
                    with open(output_path, 'wb') as f:
                        f.write(image_bytes)
                    return output_path, file_size
                else:
                    # 返回原字节流的副本
                    return io.BytesIO(image_bytes), file_size
        
        # 需要压缩，重新打开图片
        img_byte_arr = io.BytesIO(image_bytes)
        with Image.open(img_byte_arr) as image:
            # 调整大小
            resized_image = self._resize_image(image)
            
            # 压缩图片
            compressed_byte_arr, file_size = self._compress_image(resized_image, self.supported_formats[format_upper], quality)
            
            if output_path:
                # 保存到文件
                with open(output_path, 'wb') as f:
                    f.write(compressed_byte_arr.read())
                return output_path, file_size
            else:
                # 返回字节流
                compressed_byte_arr.seek(0)
                return compressed_byte_arr, file_size