import requests
import json
import time
from typing import Optional


class ModelImageGenerationTestCase:
    
    BASE_URL = "http://localhost:8001"
    
    def __init__(self):
        self.access_token: Optional[str] = None
        self.test_user_id: Optional[int] = None
        self.created_record_id: Optional[int] = None
    
    def login(self, phone: str = "13401022282", code: str = "5567"):
        """
        登录获取访问令牌
        
        Args:
            phone: 手机号
            code: 验证码
            
        Returns:
            bool: 登录成功返回True
        """
        login_url = f"{self.BASE_URL}/api/v1/auth/login/phone"
        login_data = {
            "phone": phone,
            "code": code
        }
        
        print(f"\n发送登录请求到 {login_url}")
        response = requests.post(login_url, json=login_data)
        print(f"登录响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            login_result = response.json()
            self.access_token = login_result.get("data", {}).get("access_token")
            self.test_user_id = login_result.get("data", {}).get("user", {}).get("id")
            print(f"获取到访问令牌: {self.access_token[:20] if self.access_token else 'None'}...")
            print(f"用户ID: {self.test_user_id}")
            return True
        else:
            print(f"登录失败，响应内容: {response.text}")
            return False
    
    def get_headers(self) -> dict:
        """
        获取请求头（包含认证令牌）
        
        Returns:
            dict: 请求头字典
        """
        if not self.access_token:
            raise ValueError("未登录，请先调用login方法")
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def get_points_account(self) -> Optional[dict]:
        """
        获取当前用户的积分账户信息
        
        Returns:
            dict: 积分账户信息，失败返回None
        """
        url = f"{self.BASE_URL}/api/v1/points/my-account"
        print(f"发送请求到 {url}")
        
        response = requests.get(url, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("积分账户信息:", json.dumps(result, ensure_ascii=False, indent=2))
            return result
        else:
            print(f"获取积分账户失败，响应内容: {response.text}")
            return None
    
    def test_model_image_generation_normal(self):
        """
        测试POST /api/model-image/model-image-generation接口 - 正常情况
        """
        print("\n=== 测试模特图生成 - 正常情况 ===")
        
        # 获取生成前的积分账户余额
        print("\n--- 获取生成前的积分账户余额 ---")
        account_before = self.get_points_account()
        if not account_before:
            print("无法获取积分账户信息，测试终止")
            return False
        
        balance_before_permanent = float(account_before.get("balance_permanent", 0))
        balance_before_limited = float(account_before.get("balance_limited", 0))
        total_balance_before = balance_before_permanent + balance_before_limited
        print(f"生成前总积分: {total_balance_before} (永久: {balance_before_permanent}, 限时: {balance_before_limited})")
        
        url = f"{self.BASE_URL}/api/model-image/model-image-generation"
        request_data = {
            "version": "v1.0",
            "outfit_type": "casual",
            "model_type": "female",
            "selected_model": 1,
            "style_category": "portrait",
            "selected_style": 1,
            "custom_scene_text": "测试场景描述",
            "ratio": "1:1",
            "quantity": 2,
            "clothing_prompt": "测试服装提示词",
            "model_prompt": "测试模特提示词",
            "scene_prompt": "测试场景提示词",
            "negative_prompt": "测试负面提示词",
            "seed": 12345,
            "guidance_scale": 7.5,
            "num_inference_steps": 50,
            "strength": 0.8,
            "uploaded_image": None
        }
        
        print(f"\n发送请求到 {url}")
        print(f"请求参数: {json.dumps(request_data, ensure_ascii=False, indent=2)}")
        
        response = requests.post(url, json=request_data, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("响应内容:", json.dumps(result, ensure_ascii=False, indent=2))
            
            if result.get("success"):
                self.created_record_id = result.get("data", {}).get("record_id")
                status = result.get("data", {}).get("status")
                cost_integral = result.get("data", {}).get("cost_integral")
                
                print(f"创建的记录ID: {self.created_record_id}")
                print(f"初始状态: {status}")
                print(f"消耗积分: {cost_integral}")
                
                # 验证初始状态为pending
                if status != "pending":
                    print(f"✗ 初始状态验证失败: 预期 'pending'，实际 '{status}'")
                    return False
                
                # 验证积分消耗（quantity × base_integral = 2 × 5 = 10）
                expected_cost = 10.0
                if cost_integral != expected_cost:
                    print(f"✗ 积分消耗验证失败: 预期 {expected_cost}，实际 {cost_integral}")
                    return False
                
                # 获取生成后的积分账户余额
                print("\n--- 获取生成后的积分账户余额 ---")
                account_after = self.get_points_account()
                if not account_after:
                    print("无法获取积分账户信息，无法验证积分扣除")
                    return True
                
                balance_after_permanent = float(account_after.get("balance_permanent", 0))
                balance_after_limited = float(account_after.get("balance_limited", 0))
                total_balance_after = balance_after_permanent + balance_after_limited
                print(f"生成后总积分: {total_balance_after} (永久: {balance_after_permanent}, 限时: {balance_after_limited})")
                
                # 验证积分是否正确扣除
                expected_balance = total_balance_before - expected_cost
                if total_balance_after == expected_balance:
                    print(f"✓ 积分扣除验证成功: {total_balance_before} -> {total_balance_after} (扣除{expected_cost}积分)")
                else:
                    print(f"✗ 积分扣除验证失败: 预期 {expected_balance}，实际 {total_balance_after}")
                    return False
                
                return True
            else:
                print(f"生成失败: {result.get('message')}")
                return False
        else:
            print(f"生成失败，响应内容: {response.text}")
            return False
    
    def test_model_image_generation_insufficient_points(self):
        """
        测试POST /api/model-image/model-image-generation接口 - 积分不足
        """
        print("\n=== 测试模特图生成 - 积分不足 ===")
        
        url = f"{self.BASE_URL}/api/model-image/model-image-generation"
        request_data = {
            "version": "v1.0",
            "outfit_type": "casual",
            "model_type": "female",
            "selected_model": 1,
            "style_category": "portrait",
            "selected_style": 1,
            "custom_scene_text": "测试场景描述",
            "ratio": "1:1",
            "quantity": 100000,  # 尝试生成大量图片，导致积分不足
            "clothing_prompt": "测试服装提示词",
            "model_prompt": "测试模特提示词",
            "scene_prompt": "测试场景提示词",
            "negative_prompt": "测试负面提示词",
            "seed": 12345,
            "guidance_scale": 7.5,
            "num_inference_steps": 50,
            "strength": 0.8
        }
        
        print(f"发送请求到 {url}")
        print(f"请求参数: {json.dumps(request_data, ensure_ascii=False, indent=2)}")
        
        response = requests.post(url, json=request_data, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 400:
            print(f"预期失败（积分不足），响应内容: {response.text}")
            return True
        else:
            print(f"测试失败，预期状态码400，实际状态码{response.status_code}")
            print(f"响应内容: {response.text}")
            return False
    
    def test_model_image_generation_invalid_params(self):
        """
        测试POST /api/model-image/model-image-generation接口 - 参数错误
        """
        print("\n=== 测试模特图生成 - 参数错误 ===")
        
        url = f"{self.BASE_URL}/api/model-image/model-image-generation"
        request_data = {
            "version": "v1.0",
            "outfit_type": "casual",
            "model_type": "female",
            "selected_model": 1,
            "style_category": "portrait",
            "selected_style": 1,
            "custom_scene_text": "测试场景描述",
            "ratio": "1:1",
            "quantity": -1,  # 无效的数量
            "clothing_prompt": "测试服装提示词",
            "model_prompt": "测试模特提示词",
            "scene_prompt": "测试场景提示词",
            "negative_prompt": "测试负面提示词",
            "seed": 12345,
            "guidance_scale": 7.5,
            "num_inference_steps": 50,
            "strength": 0.8
        }
        
        print(f"发送请求到 {url}")
        print(f"请求参数: {json.dumps(request_data, ensure_ascii=False, indent=2)}")
        
        response = requests.post(url, json=request_data, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 422:
            print(f"预期失败（参数错误），响应内容: {response.text}")
            return True
        else:
            print(f"测试失败，预期状态码422，实际状态码{response.status_code}")
            print(f"响应内容: {response.text}")
            return False
    
    def test_async_task_completion(self):
        """
        测试异步任务完成情况
        """
        print("\n=== 测试异步任务完成情况 ===")
        
        if not self.created_record_id:
            print("没有可用的记录ID，请先运行生成测试")
            return False
        
        print(f"等待异步任务完成（记录ID: {self.created_record_id}）...")
        print("等待5秒后检查任务状态...")
        
        # 等待5秒，让异步任务有时间完成
        time.sleep(5)
        
        # 查询记录状态
        url = f"{self.BASE_URL}/api/v1/original_image_record/{self.created_record_id}"
        print(f"\n发送请求到 {url}")
        
        response = requests.get(url, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("响应内容:", json.dumps(result, ensure_ascii=False, indent=2))
            
            status = result.get("status")
            images = result.get("images")
            params = result.get("params")
            
            print(f"\n任务状态: {status}")
            print(f"生成的图片数量: {len(images) if images else 0}")
            print(f"保存的参数: {json.dumps(params, ensure_ascii=False, indent=2) if params else 'None'}")
            
            # 验证状态是否更新为completed
            if status != "completed":
                print(f"✗ 任务状态验证失败: 预期 'completed'，实际 '{status}'")
                return False
            
            # 验证是否生成了图片
            if not images or len(images) == 0:
                print(f"✗ 未生成图片")
                return False
            
            # 验证生成的图片数量是否正确（quantity=2）
            if len(images) != 2:
                print(f"✗ 生成的图片数量验证失败: 预期 2，实际 {len(images)}")
                return False
            
            # 验证图片数据格式
            for img in images:
                if not img.get("url") or not img.get("thumbnail"):
                    print(f"✗ 图片数据格式错误: {img}")
                    return False
            
            print(f"✓ 异步任务完成验证成功")
            print(f"✓ 生成了 {len(images)} 张图片")
            print(f"✓ 图片数据格式正确")
            return True
        else:
            print(f"查询失败，响应内容: {response.text}")
            return False
    
    def test_unauthorized_access(self):
        """
        测试未授权访问
        """
        print("\n=== 测试未授权访问 ===")
        
        url = f"{self.BASE_URL}/api/model-image/model-image-generation"
        request_data = {
            "version": "v1.0",
            "outfit_type": "casual",
            "model_type": "female",
            "selected_model": 1,
            "style_category": "portrait",
            "selected_style": 1,
            "custom_scene_text": "测试场景描述",
            "ratio": "1:1",
            "quantity": 1,
            "clothing_prompt": "测试服装提示词",
            "model_prompt": "测试模特提示词",
            "scene_prompt": "测试场景提示词",
            "negative_prompt": "测试负面提示词",
            "seed": 12345,
            "guidance_scale": 7.5,
            "num_inference_steps": 50,
            "strength": 0.8
        }
        
        print(f"发送请求到 {url}（不带认证令牌）")
        print(f"请求参数: {json.dumps(request_data, ensure_ascii=False, indent=2)}")
        
        response = requests.post(url, json=request_data)
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 401:
            print(f"预期失败（未授权），响应内容: {response.text}")
            return True
        else:
            print(f"测试失败，预期状态码401，实际状态码{response.status_code}")
            print(f"响应内容: {response.text}")
            return False
    
    def run_all_tests(self):
        """
        运行所有测试用例
        """
        print("=" * 60)
        print("开始运行模特图生成模块的所有测试用例")
        print("=" * 60)
        
        if not self.login():
            print("登录失败，无法继续测试")
            return
        
        test_results = []
        
        test_results.append(("模特图生成 - 正常情况", self.test_model_image_generation_normal()))
        test_results.append(("模特图生成 - 积分不足", self.test_model_image_generation_insufficient_points()))
        test_results.append(("模特图生成 - 参数错误", self.test_model_image_generation_invalid_params()))
        test_results.append(("异步任务完成情况", self.test_async_task_completion()))
        test_results.append(("未授权访问", self.test_unauthorized_access()))
        
        print("\n" + "=" * 60)
        print("测试结果汇总")
        print("=" * 60)
        
        passed = 0
        failed = 0
        
        for test_name, result in test_results:
            status = "✓ 通过" if result else "✗ 失败"
            print(f"{test_name}: {status}")
            if result:
                passed += 1
            else:
                failed += 1
        
        print(f"\n总计: {len(test_results)} 个测试用例")
        print(f"通过: {passed} 个")
        print(f"失败: {failed} 个")
        print("=" * 60)


if __name__ == "__main__":
    test_case = ModelImageGenerationTestCase()
    test_case.run_all_tests()
