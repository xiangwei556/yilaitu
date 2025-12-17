# -*- coding: utf-8 -*-
"""
测试图片压缩工具类
"""

import os
import io
from PIL import Image
from app.utils.image_compressor import ImageCompressor

def create_test_image(width=1000, height=1000, format='JPEG'):
    """
    创建测试图片
    
    Args:
        width: 图片宽度
        height: 图片高度
        format: 图片格式
        
    Returns:
        str: 测试图片文件路径
    """
    # 创建纯色图片
    image = Image.new('RGB', (width, height), color='red')
    
    # 保存图片
    test_dir = 'test_images'
    if not os.path.exists(test_dir):
        os.makedirs(test_dir)
    
    file_path = os.path.join(test_dir, f'test_{width}x{height}.{format.lower()}')
    image.save(file_path, format=format)
    
    return file_path

def test_image_compressor():
    """
    测试图片压缩工具类
    """
    print("开始测试图片压缩工具类...")
    
    # 初始化压缩器
    compressor = ImageCompressor()
    
    # 测试1: 测试从文件压缩
    print("\n1. 测试从文件压缩:")
    try:
        # 创建测试图片
        test_image_path = create_test_image(2000, 2000, 'JPEG')
        original_size = os.path.getsize(test_image_path)
        
        print(f"原始图片: {test_image_path}, 大小: {original_size / 1024:.2f} KB")
        
        # 压缩图片
        compressed_path, compressed_size = compressor.compress_from_file(test_image_path)
        
        print(f"压缩图片: {compressed_path}, 大小: {compressed_size / 1024:.2f} KB")
        print(f"压缩率: {((original_size - compressed_size) / original_size * 100):.2f}%")
        
        # 检查压缩后的图片属性
        with Image.open(compressed_path) as img:
            width, height = img.size
            print(f"压缩后分辨率: {width}x{height}")
            
        # 验证大小不超过3MB
        assert compressed_size <= 3 * 1024 * 1024, "压缩后图片大小超过3MB"
        print("✓ 压缩后图片大小符合要求（≤3MB）")
        
    except Exception as e:
        print(f"✗ 测试从文件压缩失败: {e}")
    
    # 测试2: 测试从字节流压缩
    print("\n2. 测试从字节流压缩:")
    try:
        # 创建测试图片并转换为字节流
        test_image_path = create_test_image(1500, 1500, 'PNG')
        
        with open(test_image_path, 'rb') as f:
            image_bytes = f.read()
        
        print(f"原始字节流大小: {len(image_bytes) / 1024:.2f} KB")
        
        # 压缩图片
        compressed_bytes, compressed_size = compressor.compress_from_bytes(image_bytes, 'PNG')
        
        print(f"压缩字节流大小: {compressed_size / 1024:.2f} KB")
        print(f"压缩率: {((len(image_bytes) - compressed_size) / len(image_bytes) * 100):.2f}%")
        
        # 验证大小不超过3MB
        assert compressed_size <= 3 * 1024 * 1024, "压缩后图片大小超过3MB"
        print("✓ 压缩后图片大小符合要求（≤3MB）")
        
    except Exception as e:
        print(f"✗ 测试从字节流压缩失败: {e}")
    
    # 测试3: 测试调整分辨率
    print("\n3. 测试调整分辨率:")
    try:
        # 创建过大的测试图片
        test_image_path = create_test_image(4000, 4000, 'JPEG')
        
        print(f"原始分辨率: 4000x4000")
        
        # 压缩图片（会自动调整大小）
        compressed_path, compressed_size = compressor.compress_from_file(test_image_path)
        
        # 检查压缩后的分辨率
        with Image.open(compressed_path) as img:
            width, height = img.size
            print(f"压缩后分辨率: {width}x{height}")
            
            # 验证分辨率在500x500到2000x2000之间
            assert 500 <= width <= 2000, "压缩后宽度超出范围"
            assert 500 <= height <= 2000, "压缩后高度超出范围"
            print("✓ 压缩后分辨率符合要求（500x500 - 2000x2000）")
            
    except Exception as e:
        print(f"✗ 测试调整分辨率失败: {e}")
    
    # 测试4: 测试过小的图片
    print("\n4. 测试过小的图片:")
    try:
        # 创建过小的测试图片
        test_image_path = create_test_image(300, 300, 'JPEG')
        
        print(f"原始分辨率: 300x300")
        
        # 压缩图片（会自动调整大小）
        compressed_path, compressed_size = compressor.compress_from_file(test_image_path)
        
        # 检查压缩后的分辨率
        with Image.open(compressed_path) as img:
            width, height = img.size
            print(f"压缩后分辨率: {width}x{height}")
            
            # 验证分辨率在500x500到2000x2000之间
            assert 500 <= width <= 2000, "压缩后宽度超出范围"
            assert 500 <= height <= 2000, "压缩后高度超出范围"
            print("✓ 压缩后分辨率符合要求（500x500 - 2000x2000）")
            
    except Exception as e:
        print(f"✗ 测试过小的图片失败: {e}")
    
    # 测试5: 测试不同格式
    print("\n5. 测试不同图片格式:")
    formats = ['JPEG', 'PNG', 'BMP']
    
    for fmt in formats:
        try:
            # 创建测试图片
            test_image_path = create_test_image(1000, 1000, fmt)
            
            # 压缩图片
            compressed_path, compressed_size = compressor.compress_from_file(test_image_path)
            
            print(f"✓ 格式 {fmt}: 压缩成功，大小: {compressed_size / 1024:.2f} KB")
            
        except Exception as e:
            print(f"✗ 格式 {fmt}: 压缩失败: {e}")
    
    print("\n所有测试完成！")

if __name__ == "__main__":
    test_image_compressor()