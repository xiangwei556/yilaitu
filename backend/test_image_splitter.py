from app.utils.image_splitter import ImageSplitter
from PIL import Image, ImageDraw
import os
import io
import tempfile

# 创建测试图片
def create_test_image(width=600, height=600):
    """创建一个简单的测试图片"""
    img = Image.new('RGB', (width, height), color='red')
    # 在图片上绘制一些简单的形状以便区分
    for i in range(0, width, 100):
        for j in range(0, height, 100):
            ImageDraw.Draw(img).rectangle([i, j, i+50, j+50], fill='blue')
    return img

# 保存测试图片到临时文件
def save_test_image():
    """保存测试图片到临时文件"""
    img = create_test_image()
    temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
    img.save(temp_file.name, format='PNG')
    temp_file.close()
    return temp_file.name

# 测试ImageSplitter类
def test_image_splitter():
    print("开始测试ImageSplitter类...")
    
    # 创建测试图片
    test_image_path = save_test_image()
    print(f"创建测试图片: {test_image_path}")
    
    # 创建ImageSplitter实例
    splitter = ImageSplitter()
    
    try:
        # 测试1: 基本分割功能 - 分割为2张（默认水平分割）
        print("\n测试1: 分割为2张（水平分割）")
        result = splitter.split_image(test_image_path, 2)
        assert len(result) == 2, f"预期分割为2张，实际得到{len(result)}张"
        print(f"✓ 成功分割为2张，每张尺寸: {result[0].size}, {result[1].size}")
        
        # 测试2: 分割为2张（垂直分割）
        print("\n测试2: 分割为2张（垂直分割）")
        result = splitter.split_image(test_image_path, 2, split_mode='vertical')
        assert len(result) == 2, f"预期分割为2张，实际得到{len(result)}张"
        print(f"✓ 成功分割为2张，每张尺寸: {result[0].size}, {result[1].size}")
        
        # 测试3: 分割为4张（2x2网格）
        print("\n测试3: 分割为4张（2x2网格）")
        result = splitter.split_image(test_image_path, 4)
        assert len(result) == 4, f"预期分割为4张，实际得到{len(result)}张"
        print(f"✓ 成功分割为4张，每张尺寸: {result[0].size}")
        
        # 测试4: 分割为6张（2x3网格）
        print("\n测试4: 分割为6张（2x3网格）")
        result = splitter.split_image(test_image_path, 6, split_mode='2x3')
        assert len(result) == 6, f"预期分割为6张，实际得到{len(result)}张"
        print(f"✓ 成功分割为6张，每张尺寸: {result[0].size}")
        
        # 测试5: 分割为6张（3x2网格）
        print("\n测试5: 分割为6张（3x2网格）")
        result = splitter.split_image(test_image_path, 6, split_mode='3x2')
        assert len(result) == 6, f"预期分割为6张，实际得到{len(result)}张"
        print(f"✓ 成功分割为6张，每张尺寸: {result[0].size}")
        
        # 测试6: 分割为9张（3x3网格）
        print("\n测试6: 分割为9张（3x3网格）")
        result = splitter.split_image(test_image_path, 9)
        assert len(result) == 9, f"预期分割为9张，实际得到{len(result)}张"
        print(f"✓ 成功分割为9张，每张尺寸: {result[0].size}")
        
        # 测试7: 不同输入类型 - PIL Image对象
        print("\n测试7: 使用PIL Image对象作为输入")
        with Image.open(test_image_path) as img:
            result = splitter.split_image(img, 4)
            assert len(result) == 4, f"预期分割为4张，实际得到{len(result)}张"
            print(f"✓ 成功使用PIL Image对象作为输入，分割为4张")
        
        # 测试8: 不同输入类型 - 字节流
        print("\n测试8: 使用字节流作为输入")
        with open(test_image_path, 'rb') as f:
            img_bytes = f.read()
        result = splitter.split_image(img_bytes, 4)
        assert len(result) == 4, f"预期分割为4张，实际得到{len(result)}张"
        print(f"✓ 成功使用字节流作为输入，分割为4张")
        
        # 测试9: 输出为字节流
        print("\n测试9: 返回字节流")
        result = splitter.split_image(test_image_path, 2, return_bytes=True)
        assert len(result) == 2, f"预期分割为2张，实际得到{len(result)}张"
        assert all(isinstance(item, bytes) for item in result), "预期返回字节流列表"
        print(f"✓ 成功返回字节流，每张大小: {len(result[0])}, {len(result[1])} 字节")
        
        # 测试10: 保存到文件
        print("\n测试10: 保存分割后的图片到文件")
        output_dir = tempfile.mkdtemp()
        result = splitter.split_image(test_image_path, 4, output_dir=output_dir)
        assert len(result) == 4, f"预期分割为4张，实际得到{len(result)}张"
        assert all(os.path.exists(path) for path in result), "预期所有文件都已保存"
        print(f"✓ 成功保存4张图片到目录: {output_dir}")
        print(f"  保存的文件: {[os.path.basename(p) for p in result]}")
        
        # 测试11: 错误处理 - 无效分割数量
        print("\n测试11: 错误处理 - 无效分割数量")
        try:
            splitter.split_image(test_image_path, 3)
            assert False, "预期抛出ValueError但没有"
        except ValueError as e:
            print(f"✓ 成功捕获无效分割数量错误: {e}")
        
        # 测试12: 错误处理 - 无效分割模式
        print("\n测试12: 错误处理 - 无效分割模式")
        try:
            splitter.split_image(test_image_path, 2, split_mode='invalid_mode')
            assert False, "预期抛出ValueError但没有"
        except ValueError as e:
            print(f"✓ 成功捕获无效分割模式错误: {e}")
        
        # 测试13: 错误处理 - 无效输入类型
        print("\n测试13: 错误处理 - 无效输入类型")
        try:
            splitter.split_image(123, 2)  # 传入整数作为输入
            assert False, "预期抛出TypeError但没有"
        except TypeError as e:
            print(f"✓ 成功捕获无效输入类型错误: {e}")
        
        # 测试14: 本地文件分割测试 - 分割指定文件并保存到指定目录
        print("\n测试14: 本地文件分割测试")
        local_input_file = r"D:\trae_projects\testTEMP\960746.png"
        local_output_dir = r"D:\trae_projects\testTEMP"
        
        # 检查输入文件是否存在
        if os.path.exists(local_input_file):
            result = splitter.split_image(local_input_file, 4, output_dir=local_output_dir)
            assert len(result) == 4, f"预期分割为4张，实际得到{len(result)}张"
            assert all(os.path.exists(path) for path in result), "预期所有文件都已保存"
            print(f"✓ 成功分割本地文件: {local_input_file}")
            print(f"✓ 成功保存4张图片到目录: {local_output_dir}")
            print(f"  保存的文件: {[os.path.basename(p) for p in result]}")
        else:
            print(f"⚠ 本地测试文件不存在: {local_input_file}，跳过该测试")
        
        print("\n🎉 所有测试通过！")
        
    finally:
        # 清理测试文件
        if os.path.exists(test_image_path):
            os.remove(test_image_path)
            print(f"\n清理测试图片: {test_image_path}")
        
# 运行测试
if __name__ == "__main__":
    test_image_splitter()
