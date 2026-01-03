import os
import json

# 图片目录
image_dir = r"D:\trae_projects\image-edit\backend\data\pose-split-images"

# 后端服务器地址
base_url = "http://localhost:8001/api/v1/pose-split/files"

# 姿势中文描述（26个）
pose_descriptions = [
    "自信站立双手叉腰",
    "自信向前迈步",
    "优雅坐姿",
    "休闲靠墙站立",
    "双臂交叉自信站立",
    "动态行走姿态",
    "盘腿坐地",
    "单手插兜放松站立",
    "回眸转身",
    "双臂微抬活力姿态",
    "身体前倾互动姿态",
    "单腿前迈自信站姿",
    "双手交握专业姿态",
    "重心偏移放松站立",
    "双臂展开欢迎姿态",
    "坐凳翘腿",
    "微蹲动态姿态",
    "一手叉腰一手手势",
    "双脚分开强壮姿态",
    "歪头俏皮姿态",
    "侧身站立",
    "优雅转身",
    "自然行走",
    "双手抱胸",
    "单手托腮",
    "自信挺立"
]

# 获取所有图片文件
image_files = [f for f in os.listdir(image_dir) if f.endswith(('.png', '.jpg', '.jpeg'))]

# 按文件名排序
image_files.sort()

# 生成姿势数组
pose_array = []

for i, filename in enumerate(image_files):
    pose_data = {
        "id": i + 1,
        "description": pose_descriptions[i] if i < len(pose_descriptions) else f"姿势{i + 1}",
        "url": f"{base_url}/{filename}"
    }
    pose_array.append(pose_data)

# 保存为JSON文件
output_file = r"D:\trae_projects\image-edit\backend\data\pose_split_poses.json"
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(pose_array, f, indent=2, ensure_ascii=False)

print(f"姿势数组已生成，共 {len(pose_array)} 个姿势")
print(f"保存到: {output_file}")
print("\n姿势数组内容:")
print(json.dumps(pose_array, indent=2, ensure_ascii=False))
