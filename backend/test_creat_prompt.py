import requests
import json

class TestCreatPrompt:
    """
    测试creat-prompt接口的测试类
    """
    
    def __init__(self, base_url="http://127.0.0.1:8001"):
        """
        初始化测试类
        
        Args:
            base_url: 测试API的基础URL
        """
        self.base_url = base_url
        self.endpoint = f"{base_url}/creat-prompt"
    
    def test_creat_prompt_with_default_params(self):
        """
        测试使用默认参数调用creat-prompt接口
        """
        print("\n测试1: 使用默认参数调用creat-prompt接口")
        try:
            # 发送POST请求，不指定参数，使用默认值
            response = requests.post(self.endpoint, data={})
            response.raise_for_status()
            
            # 解析响应
            result = response.json()
            print(f"✓ 请求成功，状态码: {response.status_code}")
            print(f"✓ 响应内容: {json.dumps(result, ensure_ascii=False, indent=2)}")
            
            # 验证响应
            assert result["status"] == "success", f"预期status为success，实际为{result['status']}"
            print("✓ 响应状态验证通过")
            
        except requests.exceptions.RequestException as e:
            print(f"✗ 请求失败: {e}")
        except AssertionError as e:
            print(f"✗ 断言失败: {e}")
    
    def test_creat_prompt_with_custom_params(self):
        """
        测试使用自定义参数调用creat-prompt接口
        """
        print("\n测试2: 使用自定义参数调用creat-prompt接口")
        try:
            # 定义测试参数
            test_params = {
                "mode_type": "通用版",
                "selected_model": "m2",
                "selected_scene": "7",
                "aspect_ratio": "3:4",
                "num": "1"
            }
            
            print(f"发送参数: {json.dumps(test_params, ensure_ascii=False)}")
            
            # 发送POST请求
            response = requests.post(self.endpoint, data=test_params)
            response.raise_for_status()
            
            # 解析响应
            result = response.json()
            print(f"✓ 请求成功，状态码: {response.status_code}")
            print(f"✓ 响应内容: {json.dumps(result, ensure_ascii=False, indent=2)}")
            
            # 验证响应
            assert result["status"] == "success", f"预期status为success，实际为{result['status']}"
            
            # 验证接收的参数
            received_params = result["received_params"]
            for key, expected_value in test_params.items():
                assert received_params[key] == expected_value, \
                    f"参数{key}验证失败，预期{expected_value}，实际{received_params[key]}"
            print("✓ 所有参数验证通过")
            
        except requests.exceptions.RequestException as e:
            print(f"✗ 请求失败: {e}")
        except AssertionError as e:
            print(f"✗ 断言失败: {e}")
    
    def test_creat_prompt_with_invalid_params(self):
        """
        测试使用无效参数调用creat-prompt接口
        """
        print("\n测试3: 使用无效参数调用creat-prompt接口")
        try:
            # 发送无效参数（类型不匹配）
            invalid_params = {
                "num": 1  # 应该是字符串，但发送整数
            }
            
            response = requests.post(self.endpoint, data=invalid_params)
            print(f"✓ 请求完成，状态码: {response.status_code}")
            print(f"✓ 响应内容: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
            
        except requests.exceptions.RequestException as e:
            print(f"✗ 请求失败: {e}")
    
    def run_all_tests(self):
        """
        运行所有测试用例
        """
        print("开始测试creat-prompt接口...")
        print(f"测试API: {self.endpoint}")
        
        # 运行所有测试用例
        self.test_creat_prompt_with_default_params()
        self.test_creat_prompt_with_custom_params()
        self.test_creat_prompt_with_invalid_params()
        
        print("\n🎉 所有测试用例执行完成！")

if __name__ == "__main__":
    # 创建测试实例
    test_creator = TestCreatPrompt()
    
    # 运行所有测试
    test_creator.run_all_tests()
