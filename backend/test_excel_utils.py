import unittest
from unittest.mock import patch, MagicMock
import pandas as pd
from app.utils.excel_utils import ExcelUtils

class TestExcelUtils(unittest.TestCase):
    """
    测试ExcelUtils工具类的测试类
    """
    
    def setUp(self):
        """
        测试前的准备工作
        """
        # 创建ExcelUtils实例
        self.excel_utils = ExcelUtils()
    
    @patch('pandas.read_excel')
    def test_randomStoryboard(self, mock_read_excel):
        """
        测试randomStoryboard方法
        """
        print("测试randomStoryboard方法...")
        
        # 模拟姿势库.xlsx数据
        pose_data = {
            '性别': ['男', '女', '男', '女', '男', '女'],
            '风格': ['休闲', '休闲', '正式', '正式', '运动', '运动'],
            '服装类型': ['上衣', '上衣', '裤子', '裤子', '鞋子', '鞋子'],
            '朝向': ['正面', '正面', '侧面', '侧面', '背面', '背面'],
            '姿势简短描述（肢体动作 + 表情 / 眼神）': ['站立正面', '站立正面', '站立侧面', '站立侧面', '站立背面', '站立背面']
        }
        pose_df = pd.DataFrame(pose_data)
        mock_read_excel.return_value = pose_df
        
        # 测试1: 正常匹配情况
        result = self.excel_utils.randomStoryboard('男', '休闲', '上衣', '正面')
        self.assertIn(result, ['站立正面'], f"预期返回'站立正面'，实际返回{result}")
        print("randomStoryboardh函数返回结果"+result)
        print("✓ 测试1通过：正常匹配情况")
        
        # 测试2: 没有匹配数据的情况
        # 修改mock返回空数据
        empty_df = pd.DataFrame(columns=pose_data.keys())
        mock_read_excel.return_value = empty_df
        result = self.excel_utils.randomStoryboard('男', '不存在的风格', '上衣', '正面')
        self.assertEqual(result, "", f"预期返回空字符串，实际返回{result}")
        print("randomStoryboardh函数返回结果"+result)

        print("✓ 测试2通过：没有匹配数据的情况")
    
    @patch('pandas.read_excel')
    def test_getClothingCategory(self, mock_read_excel):
        """
        测试getClothingCategory方法
        """
        print("\n测试getClothingCategory方法...")
        
        # 模拟阿里商品理解-类目对照表.xlsx数据
        category_data = {
            '类目ID': [1001, 1002, 1003, 1004, 1005],
            '一级分类': ['上衣', '裤子', '鞋子', '外套', '配饰'],
            '二级分类': ['T恤', '牛仔裤', '运动鞋', '羽绒服', '帽子']
        }
        category_df = pd.DataFrame(category_data)
        mock_read_excel.return_value = category_df
        
        # 测试1: 正常匹配情况
        result = self.excel_utils.getClothingCategory(1001)
        self.assertEqual(result, '上衣', f"预期返回'上衣'，实际返回{result}")
        print("getClothingCategory函数返回结果"+result)

        print("✓ 测试1通过：正常匹配情况")
        
        # 测试2: 没有匹配数据的情况
        # 修改mock返回空数据
        empty_df = pd.DataFrame(columns=category_data.keys())
        mock_read_excel.return_value = empty_df
        result = self.excel_utils.getClothingCategory(9999)
        self.assertEqual(result, "", f"预期返回空字符串，实际返回{result}")
        print("✓ 测试2通过：没有匹配数据的情况")
        
        # 测试3: 不同类目ID
        # 恢复mock数据
        mock_read_excel.return_value = category_df
        result = self.excel_utils.getClothingCategory(1003)
        self.assertEqual(result, '鞋子', f"预期返回'鞋子'，实际返回{result}")
        print("✓ 测试3通过：不同类目ID")
    
    @patch('pandas.read_excel')
    def test_getAspectRatioPixel(self, mock_read_excel):
        """
        测试getAspectRatioPixel方法
        """
        print("\n测试getAspectRatioPixel方法...")
        
        # 模拟图片像素大小.xlsx数据
        pixel_data = {
            '图片比例': ['1:1', '3:4', '4:3', '16:9', '9:16'],
            '图片数量': [1, 1, 1, 1, 1],
            '图片像素': ['1000x1000', '1000x1333', '1333x1000', '1920x1080', '1080x1920']
        }
        pixel_df = pd.DataFrame(pixel_data)
        mock_read_excel.return_value = pixel_df
        
        # 测试1: 正常匹配情况
        result = self.excel_utils.getAspectRatioPixel('1:1', 1)
        self.assertEqual(result, '1000x1000', f"预期返回'1000x1000'，实际返回{result}")
        print("getAspectRatioPixel函数返回结果"+result)
        print("✓ 测试1通过：正常匹配情况")
        
        # 测试2: 没有匹配数据的情况
        # 修改mock返回空数据
        empty_df = pd.DataFrame(columns=pixel_data.keys())
        mock_read_excel.return_value = empty_df
        result = self.excel_utils.getAspectRatioPixel('不存在的比例', 1)
        self.assertEqual(result, "", f"预期返回空字符串，实际返回{result}")
        print("getAspectRatioPixel函数返回结果"+result)
        print("✓ 测试2通过：没有匹配数据的情况")
        
        # 测试3: 不同比例
        # 恢复mock数据
        mock_read_excel.return_value = pixel_df
        result = self.excel_utils.getAspectRatioPixel('3:4', 1)
        self.assertEqual(result, '1000x1333', f"预期返回'1000x1333'，实际返回{result}")
        print("getAspectRatioPixel函数返回结果"+result)
        print("✓ 测试3通过：不同比例")


    @patch('app.utils.excel_utils.ExcelUtils.randomStoryboard')
    def test_generateImagePrompt(self, mock_randomStoryboard):
        """
        测试generateImagePrompt方法
        """
        print("\n测试generateImagePrompt方法...")
        
        # 设置mock返回值
        mock_randomStoryboard.return_value = "站立正面"
        
        # 测试1: num=1的情况
        result = self.excel_utils.generateImagePrompt('1:1', 1, '街头', '亚洲人', '男', '上衣', '日常生活风', '正面')
        expected = "1*1网格分镜拼接，1个连贯分镜，统一场景为街头，明亮灯光；模特为亚洲人男；穿参考图中的上衣，自然素颜淡妆。IPHONE手机拍照风格，生活化场景细节丰富。;"
        self.assertEqual(result, expected, f"预期返回{expected}，实际返回{result}")
        print("✓ 测试1通过：num=1的情况")
        
        # 测试2: num=2的情况
        result = self.excel_utils.generateImagePrompt('1:1', 2, '咖啡馆', '欧洲人', '女', '裙子', '时尚杂志风', '正面')
        expected = "1*2网格分镜拼接，2个连贯分镜，统一场景为咖啡馆，明亮灯光；模特为欧洲人女；穿参考图中的裙子，自然素颜淡妆。高清胶片拍照风格，生活化场景细节丰富。分镜1:站立正面，分镜2:站立正面;"
        self.assertEqual(result, expected, f"预期返回{expected}，实际返回{result}")
        print("✓ 测试2通过：num=2的情况")
        
        # 测试3: num=4的情况
        result = self.excel_utils.generateImagePrompt('1:1', 4, '公园', '非洲人', '男', '裤子', '运动活力风', '正面')
        expected = "2*2网格分镜拼接，4个连贯分镜，统一场景为公园，明亮灯光；模特为非洲人男；穿参考图中的裤子，自然素颜淡妆。专业相机拍照风格，生活化场景细节丰富。分镜1:站立正面，分镜2:站立正面，分镜3:站立正面，分镜4:站立正面;"
        self.assertEqual(result, expected, f"预期返回{expected}，实际返回{result}")
        print("✓ 测试3通过：num=4的情况")
        
        # 测试4: num=6的情况
        result = self.excel_utils.generateImagePrompt('1:1', 6, '海滩', '亚洲人', '女', '泳衣', '时尚杂志风', '正面')
        expected = "2*3网格分镜拼接，6个连贯分镜，统一场景为海滩，明亮灯光；模特为亚洲人女；穿参考图中的泳衣，自然素颜淡妆。高清胶片拍照风格，生活化场景细节丰富。分镜1:站立正面，分镜2:站立正面，分镜3:站立正面，分镜4:站立正面，分镜5:站立正面，分镜6:站立正面;"
        self.assertEqual(result, expected, f"预期返回{expected}，实际返回{result}")
        print("✓ 测试4通过：num=6的情况")
        
        # 测试5: num=9的情况
        result = self.excel_utils.generateImagePrompt('1:1', 9, '健身房', '欧洲人', '男', '运动服', '运动活力风', '正面')
        expected = "3×3网格分镜拼接，9个连贯分镜，统一场景为健身房，明亮灯光；模特为欧洲人男；穿参考图中的运动服，自然素颜淡妆。专业相机拍照风格，生活化场景细节丰富。分镜1:站立正面，分镜2:站立正面，分镜3:站立正面，分镜4:站立正面，分镜5:站立正面，分镜6:站立正面，分镜7:站立正面，分镜8:站立正面，分镜9:站立正面;"
        self.assertEqual(result, expected, f"预期返回{expected}，实际返回{result}")
        print("✓ 测试5通过：num=9的情况")
        
        # 测试6: 测试不同的拍照风格
        result = self.excel_utils.generateImagePrompt('1:1', 1, '家庭', '亚洲人', '女', '连衣裙', '时尚杂志风', '正面')
        expected = "1*1网格分镜拼接，1个连贯分镜，统一场景为家庭，明亮灯光；模特为亚洲人女；穿参考图中的连衣裙，自然素颜淡妆。高清胶片拍照风格，生活化场景细节丰富。;"
        self.assertEqual(result, expected, f"预期返回{expected}，实际返回{result}")
        print("✓ 测试6通过：不同的拍照风格")


if __name__ == '__main__':
    # 运行测试
    unittest.main(verbosity=2)
