# 火山引擎对象存储(TOS)上传功能使用指南

本文档详细介绍了如何在Image Edit项目中使用火山引擎对象存储(TOS)上传功能。

## 功能概述

我们实现了一个完整的TOS上传工具类，支持：
- 从CSV文件加载配置信息
- 从本地文件上传图片到TOS
- 从字节数据上传图片到TOS
- 创建TOS存储桶
- 多种配置方式（环境变量、直接参数、配置文件）

## 目录结构

```
backend/
├── app/
│   ├── __init__.py       # 应用初始化，包含TOS上传器初始化
│   ├── config.py         # 应用配置文件
│   └── utils/
│       └── tos_utils.py  # TOS上传工具类
├── test_tos_upload.py    # 测试脚本
└── 用户信息.csv         # 包含TOS凭证的CSV文件
```

## 安装依赖

使用TOS上传功能前，需要安装必要的依赖包：

```bash
pip install volcengine
```

如果需要使用测试脚本，还需要安装：

```bash
pip install Pillow
```

## 配置方法

### 1. CSV文件配置（推荐用于开发环境）

确保`用户信息.csv`文件包含以下信息：
- Access Key ID
- Secret Access Key
- Endpoint (如: tos-cn-guangzhou.volces.com)
- Region (如: cn-guangzhou)

系统会自动从该文件读取配置信息。

### 2. 环境变量配置（推荐用于生产环境）

可以通过设置以下环境变量来配置TOS：

```bash
# Windows环境变量设置
set TOS_ACCESS_KEY=your_access_key
set TOS_SECRET_KEY=your_secret_key
set TOS_ENDPOINT=tos-cn-guangzhou.volces.com
set TOS_REGION=cn-guangzhou
set TOS_BUCKET=your-bucket-name

# Linux/Mac环境变量设置
export TOS_ACCESS_KEY=your_access_key
export TOS_SECRET_KEY=your_secret_key
export TOS_ENDPOINT=tos-cn-guangzhou.volces.com
export TOS_REGION=cn-guangzhou
export TOS_BUCKET=your-bucket-name
```

### 3. 配置文件配置

可以直接修改`app/config.py`文件中的默认配置：

```python
# 在app/config.py中
class TOSConfig:
    ACCESS_KEY = "your_access_key"
    SECRET_KEY = "your_secret_key"
    ENDPOINT = "tos-cn-guangzhou.volces.com"
    REGION = "cn-guangzhou"
    BUCKET = "your-bucket-name"
```

## 使用方式

### 1. 使用全局TOS上传器实例（推荐）

```python
# 在应用的任何位置
from app import get_tos_uploader

# 获取TOS上传器实例（会自动初始化）
tos_uploader = get_tos_uploader()

# 上传图片文件
result = tos_uploader.upload_image(
    file_path="/path/to/image.jpg",
    object_key="images/my_image.jpg"
)
print(f"上传成功，访问URL: {result['object_url']}")

# 上传字节数据
with open("/path/to/image.jpg", "rb") as f:
    image_bytes = f.read()
result = tos_uploader.upload_image_bytes(
    image_bytes=image_bytes,
    object_key="images/my_image_bytes.jpg"
)
print(f"字节数据上传成功，访问URL: {result['object_url']}")
```

### 2. 直接初始化TOSUploader

```python
from app.utils.tos_utils import TOSUploader

# 从CSV文件初始化
uploader = TOSUploader(config_csv_path="用户信息.csv")

# 或者直接传入参数初始化
uploader = TOSUploader(
    ak="your_access_key",
    sk="your_secret_key",
    endpoint="tos-cn-guangzhou.volces.com",
    region="cn-guangzhou",
    bucket_name="your-bucket-name"
)

# 使用uploader执行上传操作...
```

### 3. 在FastAPI中使用

```python
from fastapi import FastAPI, UploadFile, File, HTTPException
from app import get_tos_uploader

app = FastAPI()

@app.post("/upload/image/")
async def upload_image(file: UploadFile = File(...)):
    # 验证文件类型
    if not file.filename.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
        raise HTTPException(status_code=400, detail="仅支持图片文件")
    
    # 获取TOS上传器
    tos_uploader = get_tos_uploader()
    if not tos_uploader:
        raise HTTPException(status_code=500, detail="TOS上传器初始化失败")
    
    # 生成object key
    object_key = f"uploads/{file.filename}"
    
    # 读取文件内容
    contents = await file.read()
    
    # 上传到TOS
    result = tos_uploader.upload_image_bytes(
        image_bytes=contents,
        object_key=object_key,
        content_type=file.content_type or "image/jpeg"
    )
    
    return {
        "filename": file.filename,
        "object_url": result["object_url"],
        "object_key": result["object_key"],
        "status": "success"
    }
```

## 验证功能

可以使用我们提供的测试脚本来验证TOS功能是否正常工作：

```bash
python test_tos_upload.py
```

该脚本会：
1. 测试从CSV文件加载配置
2. 尝试初始化TOS客户端
3. 创建一个测试图片并上传
4. 测试上传字节数据
5. 清理临时文件

## 注意事项

1. **安全考虑**：不要在代码中硬编码Access Key和Secret Key，优先使用环境变量或配置文件。

2. **存储桶权限**：确保配置的存储桶已创建并且您的账号有足够的权限进行上传操作。

3. **错误处理**：在生产环境中使用时，建议添加适当的错误处理和重试机制。

4. **文件大小限制**：默认情况下，系统限制上传文件大小为10MB，可以在`app/config.py`中修改`MAX_FILE_SIZE`参数。

5. **支持的图片格式**：默认支持jpg、jpeg、png、gif、webp格式，可以在`app/config.py`中修改`ALLOWED_IMAGE_FORMATS`列表。

6. **日志记录**：系统会记录TOS操作的日志，可以根据需要调整日志级别。

## 故障排除

如果遇到TOS上传失败的情况，请检查：

1. 网络连接是否正常
2. Access Key和Secret Key是否正确
3. Endpoint和Region是否匹配
4. 存储桶是否存在且有正确的权限
5. 文件大小是否超过限制
6. TOS SDK是否正确安装

如需更多帮助，请参考[火山引擎TOS官方文档](https://www.volcengine.com/docs/6349/70136)。
