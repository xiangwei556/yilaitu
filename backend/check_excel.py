import pandas as pd
import os

# 构建文件路径
data_dir = os.path.join('d:/trae_projects/image-edit/backend', 'data')
file_path = os.path.join(data_dir, '阿里商品理解-类目对照表.xlsx')

# 读取Excel文件
df = pd.read_excel(file_path)

# 打印文件列名
print('文件列名:', list(df.columns))

# 打印前5行数据
print('\n前5行数据:')
print(df.head())

# 尝试查看更多关于列的信息
print('\n列信息:')
for col in df.columns:
    print(f'列名: {col}, 类型: {df[col].dtype}')