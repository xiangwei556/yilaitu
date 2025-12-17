from PIL import Image
import os
import io

class ImageSplitter:
    """
    图片分割工具类，支持将图片平均分割成2、4、6、9张
    """
    
    def __init__(self, default_output_format='PNG'):
        """
        初始化图片分割工具
        
        Args:
            default_output_format: 默认输出图片格式，如'PNG'、'JPEG'等
        """
        self.default_output_format = default_output_format
    
    def _load_image(self, image_input):
        """
        加载图片，支持多种输入类型
        
        Args:
            image_input: 输入图片（文件路径、字节流或PIL Image对象）
            
        Returns:
            PIL Image对象
        
        Raises:
            TypeError: 输入类型不支持
            IOError: 图片读取失败
        """
        if isinstance(image_input, Image.Image):
            return image_input
        elif isinstance(image_input, str):
            if not os.path.exists(image_input):
                raise IOError(f"图片文件不存在: {image_input}")
            return Image.open(image_input)
        elif isinstance(image_input, bytes):
            return Image.open(io.BytesIO(image_input))
        else:
            raise TypeError(f"不支持的输入类型: {type(image_input).__name__}")
    
    def _save_images(self, images, output_dir=None, output_format=None):
        """
        保存图片到指定目录
        
        Args:
            images: PIL Image对象列表
            output_dir: 输出目录路径
            output_format: 输出图片格式
            
        Returns:
            保存的文件路径列表
        """
        if not output_dir:
            return images
        
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        saved_paths = []
        for i, img in enumerate(images):
            file_path = os.path.join(output_dir, f"split_{i+1}.{output_format.lower()}")
            img.save(file_path, format=output_format)
            saved_paths.append(file_path)
        
        return saved_paths
    
    def _to_bytes(self, images, output_format=None):
        """
        将PIL Image对象转换为字节流
        
        Args:
            images: PIL Image对象列表
            output_format: 输出图片格式
            
        Returns:
            字节流列表
        """
        bytes_list = []
        for img in images:
            buffer = io.BytesIO()
            img.save(buffer, format=output_format)
            buffer.seek(0)
            bytes_list.append(buffer.getvalue())
        return bytes_list
    
    def split_image(self, image_input, split_count, split_mode=None, output_dir=None, output_format=None, return_bytes=False):
        """
        分割图片
        
        Args:
            image_input: 输入图片（文件路径、字节流或PIL Image对象）
            split_count: 分割数量（2、4、6、9）
            split_mode: 分割模式（可选，根据split_count自动选择默认模式）
            output_dir: 输出目录（可选，指定则保存到文件）
            output_format: 输出图片格式（可选，默认使用输入图片格式）
            return_bytes: 是否返回字节流（可选，默认返回PIL Image对象）
            
        Returns:
            分割后的子图片列表（PIL Image对象、文件路径或字节流，取决于参数设置）
        
        Raises:
            ValueError: 参数无效
            IOError: 图片读取或保存失败
            TypeError: 输入类型不支持
        """
        # 验证分割数量
        supported_counts = [2, 4, 6, 9]
        if split_count not in supported_counts:
            raise ValueError(f"不支持的分割数量: {split_count}，仅支持{supported_counts}")
        
        # 加载图片
        original_image = self._load_image(image_input)
        img_width, img_height = original_image.size
        
        # 确定输出格式
        if not output_format:
            output_format = original_image.format or self.default_output_format
        
        # 定义分割模式映射
        mode_mappings = {
            2: ['horizontal', 'vertical'],
            4: ['2x2'],
            6: ['2x3', '3x2'],
            9: ['3x3']
        }
        
        # 验证并确定分割模式
        if not split_mode:
            split_mode = mode_mappings[split_count][0]  # 默认使用第一种模式
        elif split_mode not in mode_mappings[split_count]:
            raise ValueError(f"分割数量{split_count}不支持模式{split_mode}，仅支持{mode_mappings[split_count]}")
        
        # 计算分割尺寸
        if split_count == 2:
            if split_mode == 'horizontal':
                # 水平分割：上下各1张
                split_height = img_height // 2
                boxes = [
                    (0, 0, img_width, split_height),
                    (0, split_height, img_width, img_height)
                ]
            else:  # vertical
                # 垂直分割：左右各1张
                split_width = img_width // 2
                boxes = [
                    (0, 0, split_width, img_height),
                    (split_width, 0, img_width, img_height)
                ]
        elif split_count == 4:
            # 2x2网格分割
            split_width = img_width // 2
            split_height = img_height // 2
            boxes = [
                (0, 0, split_width, split_height),
                (split_width, 0, img_width, split_height),
                (0, split_height, split_width, img_height),
                (split_width, split_height, img_width, img_height)
            ]
        elif split_count == 6:
            if split_mode == '2x3':
                # 2行3列
                split_width = img_width // 3
                split_height = img_height // 2
                boxes = [
                    (0, 0, split_width, split_height),
                    (split_width, 0, split_width * 2, split_height),
                    (split_width * 2, 0, img_width, split_height),
                    (0, split_height, split_width, img_height),
                    (split_width, split_height, split_width * 2, img_height),
                    (split_width * 2, split_height, img_width, img_height)
                ]
            else:  # 3x2
                # 3行2列
                split_width = img_width // 2
                split_height = img_height // 3
                boxes = [
                    (0, 0, split_width, split_height),
                    (split_width, 0, img_width, split_height),
                    (0, split_height, split_width, split_height * 2),
                    (split_width, split_height, img_width, split_height * 2),
                    (0, split_height * 2, split_width, img_height),
                    (split_width, split_height * 2, img_width, img_height)
                ]
        else:  # 9
            # 3x3网格分割
            split_width = img_width // 3
            split_height = img_height // 3
            boxes = [
                (0, 0, split_width, split_height),
                (split_width, 0, split_width * 2, split_height),
                (split_width * 2, 0, img_width, split_height),
                (0, split_height, split_width, split_height * 2),
                (split_width, split_height, split_width * 2, split_height * 2),
                (split_width * 2, split_height, img_width, split_height * 2),
                (0, split_height * 2, split_width, img_height),
                (split_width, split_height * 2, split_width * 2, img_height),
                (split_width * 2, split_height * 2, img_width, img_height)
            ]
        
        # 执行分割
        split_images = []
        for box in boxes:
            split_img = original_image.crop(box)
            split_images.append(split_img)
        
        # 根据参数返回结果
        if output_dir:
            return self._save_images(split_images, output_dir, output_format)
        elif return_bytes:
            return self._to_bytes(split_images, output_format)
        else:
            return split_images
