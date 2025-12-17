from app.utils.excel_utils import ExcelUtils

# 创建ExcelUtils实例
excel_utils = ExcelUtils()

print("=== 测试实际Excel文件读取 ===")

# 测试1: getAspectRatioPixel方法
print("\n1. 测试getAspectRatioPixel方法:")
result = excel_utils.getAspectRatioPixel('1:1', 1)
print(f"图片比例'1:1'，数量1 -> 像素大小: {result}")

result = excel_utils.getAspectRatioPixel('3:4', 1)
print(f"图片比例'3:4'，数量1 -> 像素大小: {result}")

# 测试2: randomStoryboard方法
print("\n2. 测试randomStoryboard方法:")
result = excel_utils.randomStoryboard('男', '休闲', '上衣', '正面')
print(f"性别'男', 风格'休闲', 服装类型'上衣', 朝向'正面' -> 姿势描述: {result}")

# 测试3: getClothingCategory方法
print("\n3. 测试getClothingCategory方法:")
# 注意：这里需要使用实际Excel文件中存在的类目ID
# 先查看实际文件中的类目ID
import pandas as pd
df = pd.read_excel('data/阿里商品理解-类目对照表.xlsx')
print("实际类目ID示例:", df['类目ID'].head().tolist())

# 使用实际存在的类目ID测试
if not df.empty:
    category_id = df.iloc[0]['类目ID']
    result = excel_utils.getClothingCategory(category_id)
    print(f"类目ID {category_id} -> 一级分类: {result}")