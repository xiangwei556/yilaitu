import os
import sys
import json
import asyncio
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.utils.ark_image_generator import ArkImageGenerator

# 20个不同姿势的提示词
pose_prompts = [
    "A young woman standing confidently with hands on hips, full body shot, professional photography",
    "A young woman walking forward with a relaxed stride, full body shot, natural lighting",
    "A young woman sitting gracefully on a chair, full body shot, elegant pose",
    "A young woman leaning against a wall casually, full body shot, modern style",
    "A young woman with arms crossed, standing confidently, full body shot",
    "A young woman in a dynamic walking pose, full body shot, fashion photography",
    "A young woman sitting on the floor with legs crossed, full body shot, casual style",
    "A young woman with one hand in pocket, standing relaxed, full body shot",
    "A young woman in a slight turn pose, looking over shoulder, full body shot",
    "A young woman with arms raised slightly, energetic pose, full body shot",
    "A young woman leaning forward slightly, engaging pose, full body shot",
    "A young woman standing with one leg forward, confident stance, full body shot",
    "A young woman with hands clasped in front, professional pose, full body shot",
    "A young woman in a relaxed standing pose, weight on one leg, full body shot",
    "A young woman with arms extended to the side, welcoming pose, full body shot",
    "A young woman sitting on a stool, one leg crossed, full body shot",
    "A young woman in a slight crouch, dynamic action pose, full body shot",
    "A young woman with one hand on hip, other hand gesturing, full body shot",
    "A young woman standing with feet shoulder-width apart, strong pose, full body shot",
    "A young woman in a playful pose, head tilted, full body shot"
]

async def generate_pose_images():
    """
    生成20个不同姿势的年轻女性全身照
    """
    generator = ArkImageGenerator()
    
    generated_urls = []
    
    for i, prompt in enumerate(pose_prompts, 1):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 正在生成第 {i}/20 张图片...")
        
        try:
            result = generator.generate_images(
                model="doubao-seedream-4-5-251128",
                prompt=prompt,
                size="1536x2560",  # 竖向全身照比例，满足3686400像素要求
                max_images=1,
                response_format="url"
            )
            
            if result["data"] and len(result["data"]) > 0:
                image_url = result["data"][0]["url"]
                generated_urls.append(image_url)
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 第 {i} 张图片生成成功: {image_url}")
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 第 {i} 张图片生成失败: 无数据返回")
                generated_urls.append("")
            
            # 避免请求过快
            await asyncio.sleep(1)
            
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 第 {i} 张图片生成失败: {str(e)}")
            generated_urls.append("")
    
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] 图片生成完成！")
    print(f"成功生成: {sum(1 for url in generated_urls if url)}/{len(generated_urls)}")
    
    # 保存结果到JSON文件
    output_file = "pose_images.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(generated_urls, f, indent=2, ensure_ascii=False)
    
    print(f"\n图片URL已保存到: {output_file}")
    
    # 打印所有URL
    print("\n生成的图片URL:")
    for i, url in enumerate(generated_urls, 1):
        print(f"{i}. {url if url else '生成失败'}")
    
    return generated_urls

if __name__ == "__main__":
    asyncio.run(generate_pose_images())
