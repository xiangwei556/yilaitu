import pandas as pd
import os
import random

class ExcelUtils:
    """
    Excel工具类，处理Excel文件数据
    """
    
    def __init__(self):
        """
        初始化Excel工具类
        """
        # 数据文件路径
        self.data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'data')
    
    def randomStoryboard(self, sex, styleType, clothingType, towards):
        """
        随机获取姿势描述
        
        Args:
            sex: 性别
            styleType: 风格
            clothingType: 服装类型
            towards: 朝向
            
        Returns:
            str: 随机选择的姿势简短描述
        """
        # 构建文件路径
        file_path = os.path.join(self.data_dir, '姿势库.xlsx')
        
        # 读取Excel文件
        df = pd.read_excel(file_path)
        
        # 根据条件筛选数据
        filtered_df = df[(df['性别'] == sex) & 
                       (df['风格'] == styleType) & 
                       (df['服装类型'] == clothingType) & 
                       (df['朝向'] == towards)]
        
        # 提取姿势简短描述列，组装成数组
        pose_descriptions = filtered_df['姿势简短描述（肢体动作 + 表情 / 眼神）'].tolist()
        
        # 如果没有匹配的数据，返回空字符串
        if not pose_descriptions:
            return ""
        
        # 生成随机索引
        random_index = random.randint(0, len(pose_descriptions) - 1)
        
        # 返回随机选择的姿势描述
        selectedScene = pose_descriptions[random_index]
        return selectedScene
    
    def getClothingCategory(self, categoryId):
        """
        根据类目ID获取服装一级分类
        
        Args:
            categoryId: 类目ID
            
        Returns:
            str: 一级分类名称
        """
        # 参数有效性检查
        if categoryId is None or categoryId == 'N/A' or categoryId == '' or categoryId == 0:
            return ""
        
        try:
            # 将categoryId转换为整数类型，因为Excel中的'类目 ID'列是int64类型
            category_id_int = int(categoryId)
            
            # 构建文件路径
            file_path = os.path.join(self.data_dir, '阿里商品理解-类目对照表.xlsx')
            
            # 读取Excel文件
            df = pd.read_excel(file_path)
            
            # 根据条件筛选数据 - 注意列名包含空格
            filtered_df = df[df['类目 ID'] == category_id_int]
            
            # 如果没有匹配的数据，返回空字符串
            if filtered_df.empty:
                return ""
            
            # 返回一级分类
            categoryName = filtered_df.iloc[0]['一级分类']
            return categoryName
        except ValueError:
            print(f"[ERROR] 获取服装分类失败: 无效的类目ID格式 - {categoryId}")
            return ""
        except Exception as e:
            print(f"[ERROR] 获取服装分类失败: {type(e).__name__} - {e}")
            return ""
    
    def getAspectRatioPixel(self, aspectRatio, num):
        """
        根据图片比例和数量获取图片像素大小
        
        Args:
            aspectRatio: 图片比例
            num: 图片数量
            
        Returns:
            str: 图片像素大小
        """
        # 构建文件路径
        file_path = os.path.join(self.data_dir, '图片像素大小.xlsx')
        
        # 读取Excel文件
        df = pd.read_excel(file_path)
        
        # 根据条件筛选数据
        filtered_df = df[(df['图片比例'] == aspectRatio) & 
                       (df['图片数量'] == num)]
        
        # 如果没有匹配的数据，返回空字符串
        if filtered_df.empty:
            return ""
        
        # 返回图片像素
        imageSize = filtered_df.iloc[0]['图片像素']
        print("getAspectRatioPixel函数返回结果="+imageSize)
        return imageSize
    
    def generateImagePrompt(self, num, selectedScene, race, sex, categoryName, styleType, towards):
        """
        根据输入参数生成图像提示词
        
        Args:
            num: 图片数量
            selectedScene: 场景名称
            race: 人种
            sex: 性别
            categoryName: 服装类目
            styleType: 拍照风格
            towards: 朝向
            
        Returns:
            str: 生成的图像提示词
        """
        # 定义提示词模板
        image_prompt_template = "{{行数*列数}}网格分镜拼接，{{图片数量}}个连贯分镜，统一场景为{{场景名称}}，明亮灯光；模特为{{人种}}{{性别}}；穿参考图中的{{服装类目}}，自然素颜淡妆。{{拍照风格描述}}拍照风格，生活化场景细节丰富。{{分镜描述}};"
        
        # 1) 替换 {{行数*列数}}
        if num == 1:
            grid_layout = "1*1"
        elif num == 2:
            grid_layout = "1*2"
        elif num == 4:
            grid_layout = "2*2"
        elif num == 6:
            grid_layout = "2*3"
        elif num == 9:
            grid_layout = "3×3"
        else:
            # 默认值，根据需求可以调整
            grid_layout = f"1*{num}"
        
        # 2) 替换 {{图片数量}}
        image_count = str(num)
        
        # 3) 替换 {{场景名称}}
        scene_name = selectedScene
        
        # 4) 替换 {{性别}}
        gender = sex
        
        # 5) 替换 {{人种}}
        ethnicity = race
        
        # 6) 替换 {{服装类目}}
        clothing_category = categoryName
        
        # 7) 替换 {{拍照风格描述}}
        if styleType == "日常生活风":
            photo_style_desc = "IPHONE手机"
        elif styleType == "时尚杂志风":
            photo_style_desc = "高清胶片"
        elif styleType == "运动活力风":
            photo_style_desc = "专业相机"
        else:
            # 默认值
            photo_style_desc = ""
        
        # 8) 替换 {{分镜描述}}
        if num == 1:
            scene_desc = ""
        else:
            # 生成分镜描述
            scene_desc_parts = []
            used_poses = set()  # 用于存储已使用的姿势描述，实现去重
            max_attempts = 10  # 最大尝试次数，避免无限循环

            for i in range(1, num + 1):
                pose_desc = None
                attempts = 0
                
                # 尝试获取不重复的姿势描述
                while pose_desc is None or pose_desc in used_poses:
                    # 根据服装类目确定服装类型
                    # 如果服装类目包含'裙'、'连衣裙'等关键字，则使用'裙装'作为服装类型
                    # 否则使用默认的'上装'或其他合适的类型
                    if '裙' in clothing_category or '连衣裙' in clothing_category:
                        current_clothing_type = '裙装'
                    elif '裤' in clothing_category or '裤装' in clothing_category:
                        current_clothing_type = '下装'
                    else:
                        current_clothing_type = '上装'
                    
                    pose_desc = self.randomStoryboard(sex, styleType, current_clothing_type, towards)
                    attempts += 1
                    
                    # 如果尝试次数过多，就不再去重，避免无限循环
                    if attempts > max_attempts:
                        break
                
                # 将获取的姿势描述添加到结果中
                scene_desc_parts.append(f"分镜{i}:{pose_desc}")
                used_poses.add(pose_desc)

            scene_desc = "，".join(scene_desc_parts)
        
        # 替换所有变量
        prompt = image_prompt_template.replace("{{行数*列数}}", grid_layout)
        prompt = prompt.replace("{{图片数量}}", image_count)
        prompt = prompt.replace("{{场景名称}}", scene_name)
        prompt = prompt.replace("{{性别}}", gender)
        prompt = prompt.replace("{{人种}}", ethnicity)
        prompt = prompt.replace("{{服装类目}}", clothing_category)
        prompt = prompt.replace("{{拍照风格描述}}", photo_style_desc)
        prompt = prompt.replace("{{分镜描述}}", scene_desc)
        
        return prompt