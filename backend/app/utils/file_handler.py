import os
import uuid
from typing import Optional, Tuple
from datetime import datetime

# 允许的图片扩展名
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

# 最大文件大小 (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# 上传文件保存的根目录
BASE_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")

# 创建必要的目录结构
def ensure_directories():
    """确保所有必要的目录存在"""
    directories = [
        BASE_UPLOAD_DIR,
        os.path.join(BASE_UPLOAD_DIR, "products"),  # 上传的商品图片
        os.path.join(BASE_UPLOAD_DIR, "processed"),  # 处理后的图片
        os.path.join(BASE_UPLOAD_DIR, "backgrounds"),  # 背景图片
    ]
    
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)

# 生成唯一文件名
def generate_unique_filename(original_filename: str) -> str:
    """生成唯一的文件名，保留原始文件扩展名"""
    _, ext = os.path.splitext(original_filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    return f"{timestamp}_{unique_id}{ext}"

# 验证文件是否为允许的图片类型
def allowed_file(filename: str) -> bool:
    """检查文件是否有允许的扩展名"""
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_EXTENSIONS

# 验证文件大小
def validate_file_size(file_size: int) -> bool:
    """检查文件大小是否在允许范围内"""
    return file_size <= MAX_FILE_SIZE

# 获取上传文件的保存路径
def get_upload_path(category: str, filename: str) -> str:
    """获取文件的完整保存路径
    
    Args:
        category: 文件类别 (products, processed, backgrounds)
        filename: 文件名
    
    Returns:
        文件的完整路径
    """
    ensure_directories()
    category_dir = os.path.join(BASE_UPLOAD_DIR, category)
    return os.path.join(category_dir, filename)

# 获取文件URL路径
def get_file_url(category: str, filename: str) -> str:
    """获取文件的URL路径
    
    Args:
        category: 文件类别
        filename: 文件名
    
    Returns:
        文件的相对URL路径
    """
    return f"/api/files/{category}/{filename}"

# 删除文件（安全方式）
def safe_delete_file(file_path: str) -> bool:
    """安全地删除文件，如果文件存在的话"""
    try:
        if os.path.exists(file_path) and os.path.isfile(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception as e:
        print(f"删除文件失败: {e}")
        return False
