from PIL import Image
import os

# 确保目录存在
os.makedirs('uploads/products', exist_ok=True)

# 创建一个简单的测试图片
img = Image.new('RGB', (300, 300), color='white')
pixels = img.load()

# 绘制一个简单的形状
for i in range(100, 200):
    for j in range(100, 200):
        pixels[i, j] = (255, 0, 0)  # 红色方块

# 保存图片
img.save('uploads/products/test.jpg')
print("测试图片已创建: uploads/products/test.jpg")
