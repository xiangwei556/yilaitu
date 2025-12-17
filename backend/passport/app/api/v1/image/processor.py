from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from PIL import Image
import io
import os
import uuid
import base64
import requests
from app.utils.aliyun_goods_classifier import AliyunGoodsClassifier
from app.utils.aliyun_image_segmenter import AliyunImageSegmenter
from app.utils.excel_utils import ExcelUtils
from app.utils.image_splitter import ImageSplitter
from app.utils.image_compressor import ImageCompressor

# 尝试导入TOSClient和ArkImageGenerator
try:
    from app.utils.tos_utils import TOSClient
except ImportError:
    TOSClient = None

try:
    from app.utils.ark_image_generator import ArkImageGenerator
except ImportError:
    ArkImageGenerator = None

router = APIRouter()

# 初始化工具类实例
excel_utils = ExcelUtils()
image_splitter = ImageSplitter()

# 初始化阿里云服务
aliyun_access_key_id = os.environ.get("ALIYUN_ACCESS_KEY_ID", "")
aliyun_access_key_secret = os.environ.get("ALIYUN_ACCESS_KEY_SECRET", "")

try:
    image_segmenter = AliyunImageSegmenter(
        access_key_id=aliyun_access_key_id,
        access_key_secret=aliyun_access_key_secret
    )
except Exception:
    image_segmenter = None

try:
    classifier = AliyunGoodsClassifier(
        access_key_id=aliyun_access_key_id,
        access_key_secret=aliyun_access_key_secret
    )
except Exception:
    classifier = None

# 初始化Ark
try:
    ark_image_generator = ArkImageGenerator(api_key="a9f93f53-05ea-40ca-a605-3e0601e6aaff")
except Exception:
    ark_image_generator = None

# 初始化TOS
tos_uploader = None
try:
    if TOSClient:
        # 尝试查找CSV配置
        # 注意：这里的路径可能需要调整，假设相对于当前文件或项目根目录
        # 这里暂时使用环境变量或默认初始化
        tos_uploader = TOSClient() 
except Exception:
    tos_uploader = None

@router.post("/process-image")
async def process_image(
    file: UploadFile = File(...),
    mode_type: str = Form("通用版"),
    gender: str = Form("女"),
    ethnicity: str = Form("亚洲人"),
    selectedStyle: str = Form("日常生活风"),
    aspectRatio: str = Form("1:1"),
    selectedScene: str = Form("日常生活场景"),
    num: str = Form("4")
):
    try:
        # 读取上传的图片
        image_data = await file.read()
        print(f"[INFO] 开始处理图片: {file.filename}")
        
        # 压缩图片
        try:
            original_size = len(image_data)
            compressor = ImageCompressor()
            file_ext = os.path.splitext(file.filename)[1].lower()[1:]
            compressed_data, compressed_size = compressor.compress_from_bytes(image_data, file_ext)
            
            if hasattr(compressed_data, 'read'):
                compressed_data.seek(0)
                image_data = compressed_data.read()
            else:
                image_data = compressed_data
                
            print(f"✓ 图片压缩成功，原始大小: {original_size / 1024:.2f} KB，压缩后大小: {compressed_size / 1024:.2f} KB")
        except Exception as e:
            print(f"[WARNING] 图片压缩失败: {type(e).__name__} - {e}，将使用原始图片继续处理")

        # 生成提示词参数
        towards = "正面" if mode_type == "通用版" else ""
        
        # 获取图片所属类目
        category_id = None
        category_name = None
        
        if classifier:
            try:
                result = classifier.classify_commodity_from_bytes(image_data)
                if 'data' in result and hasattr(result['data'], 'categories'):
                    categories = result['data'].categories
                    if categories:
                        first_category = categories[0]
                        category_id = getattr(first_category, 'category_id', None)
                        category_name = getattr(first_category, 'category_name', None)
            except Exception as e:
                print(f"[ERROR] 分类失败: {e}")

        # 根据类目ID查询一级类目名称
        categoryName = None
        if category_id:
            categoryName = excel_utils.getClothingCategory(category_id)

        # 抠图
        image_url = None
        if image_segmenter:
            try:
                image_url = image_segmenter.segment_commodity_from_bytes(image_data)
                print(f"[INFO] 商品分割成功，返回图片URL: {image_url}")
            except Exception as e:
                print(f"[WARNING] 商品分割失败: {str(e)}")

        # 生成提示词
        try:
            num_int = int(num)
            prompt = excel_utils.generateImagePrompt(num_int, selectedScene, ethnicity, gender, categoryName, selectedStyle, towards)
        except Exception as e:
            print(f"[ERROR] 生成提示词失败: {e}")
            prompt = f"{gender}，{ethnicity}，{selectedStyle}，{aspectRatio}，{num}"

        # 计算生成图片分辨率
        imageSize = excel_utils.getAspectRatioPixel(aspectRatio, num_int)

        # 调用Ark图片生成API
        generated_images = None
        if ark_image_generator and image_url:
            try:
                generated_images = ark_image_generator.generate_images(
                    prompt=prompt,
                    images=[image_url],
                    size=imageSize,
                    response_format="url"
                )
            except Exception as gen_error:
                print(f"[ERROR] Ark图片生成失败: {gen_error}")

        # 切分图片
        split_images = []
        if generated_images and 'data' in generated_images and generated_images['data']:
            image_bytes = None
            if 'url' in generated_images['data'][0]:
                response = requests.get(generated_images['data'][0]['url'])
                image_bytes = response.content
            elif 'b64_json' in generated_images['data'][0]:
                image_bytes = base64.b64decode(generated_images['data'][0]['b64_json'])
            
            if image_bytes:
                try:
                    split_count = int(num)
                    split_images = image_splitter.split_image(image_bytes, split_count, return_bytes=True)
                except Exception as e:
                    print(f"[ERROR] 切分失败: {e}")

        # 上传结果到TOS
        image_urls = []
        if split_images and tos_uploader:
            for idx, img_bytes in enumerate(split_images):
                unique_id = str(uuid.uuid4())[:8]
                file_extension = os.path.splitext(file.filename)[1] or '.png'
                object_key = f"{unique_id}_{idx}{file_extension}"
                try:
                    upload_result = tos_uploader.put_object(
                        object_key=object_key,
                        content=img_bytes
                    )
                    image_urls.append(upload_result['object_url'])
                except Exception as e:
                    print(f"[ERROR] 上传失败: {e}")
        
        # 如果TOS上传失败或者没有TOS，返回空列表或者错误信息
        # 这里为了保持接口兼容，即使失败也返回结构体
        
        return {
            "success": True,
            "message": "Image processed successfully",
            "data": {
                "image_urls": image_urls
            }
        }

    except Exception as e:
        print(f"[ERROR] 图片处理失败: {str(e)}")
        return {
            "success": False,
            "message": str(e),
            "data": None
        }
