import requests
import json
from decimal import Decimal
from typing import Optional


class OriginalImageRecordTestCase:
    
    BASE_URL = "http://localhost:8001/api/v1"
    
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
        login_url = f"{self.BASE_URL}/auth/login/phone"
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
        url = f"{self.BASE_URL}/points/my-account"
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

    def test_create_original_image_record_normal(self):
        """
        测试POST /original_image_record接口 - 正常情况
        """
        print("\n=== 测试创建生图记录 - 正常情况 ===")
        
        # 获取创建前的积分账户余额
        print("\n--- 获取创建前的积分账户余额 ---")
        account_before = self.get_points_account()
        if not account_before:
            print("无法获取积分账户信息，测试终止")
            return False
        
        balance_before_permanent = float(account_before.get("balance_permanent", 0))
        balance_before_limited = float(account_before.get("balance_limited", 0))
        total_balance_before = balance_before_permanent + balance_before_limited
        print(f"创建前总积分: {total_balance_before} (永久: {balance_before_permanent}, 限时: {balance_before_limited})")
        
        url = f"{self.BASE_URL}/original_image_record"
        params = {
            "model_id": 1,
            "model_name": "测试模型",
            "params": {
                "prompt": "测试提示词",
                "style": "realistic"
            },
            "cost_integral": "10.00"
        }
        
        print(f"\n发送请求到 {url}")
        print(f"请求参数: {json.dumps(params, ensure_ascii=False, indent=2)}")
        
        response = requests.post(url, params=params, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("响应内容:", json.dumps(result, ensure_ascii=False, indent=2))
            self.created_record_id = result.get("id")
            print(f"创建的记录ID: {self.created_record_id}")
            
            # 获取创建后的积分账户余额
            print("\n--- 获取创建后的积分账户余额 ---")
            account_after = self.get_points_account()
            if not account_after:
                print("无法获取积分账户信息，无法验证积分扣除")
                return True
            
            balance_after_permanent = float(account_after.get("balance_permanent", 0))
            balance_after_limited = float(account_after.get("balance_limited", 0))
            total_balance_after = balance_after_permanent + balance_after_limited
            print(f"创建后总积分: {total_balance_after} (永久: {balance_after_permanent}, 限时: {balance_after_limited})")
            
            # 验证积分是否正确扣除
            expected_balance = total_balance_before - 10
            if total_balance_after == expected_balance:
                print(f"✓ 积分扣除验证成功: {total_balance_before} -> {total_balance_after} (扣除10积分)")
                return True
            else:
                print(f"✗ 积分扣除验证失败: 预期 {expected_balance}，实际 {total_balance_after}")
                return False
        else:
            print(f"创建失败，响应内容: {response.text}")
            return False
    
    def test_create_original_image_record_insufficient_points(self):
        """
        测试POST /original_image_record接口 - 积分不足
        """
        print("\n=== 测试创建生图记录 - 积分不足 ===")
        
        url = f"{self.BASE_URL}/original_image_record"
        params = {
            "model_id": 1,
            "model_name": "测试模型",
            "params": {
                "prompt": "测试提示词"
            },
            "cost_integral": "999999.00"
        }
        
        print(f"发送请求到 {url}")
        print(f"请求参数: {json.dumps(params, ensure_ascii=False, indent=2)}")
        
        response = requests.post(url, params=params, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 400:
            print(f"预期失败（积分不足），响应内容: {response.text}")
            return True
        else:
            print(f"测试失败，预期状态码400，实际状态码{response.status_code}")
            print(f"响应内容: {response.text}")
            return False
    
    def test_create_original_image_record_invalid_params(self):
        """
        测试POST /original_image_record接口 - 参数错误
        """
        print("\n=== 测试创建生图记录 - 参数错误 ===")
        
        url = f"{self.BASE_URL}/original_image_record"
        params = {
            "cost_integral": "-10.00"
        }
        
        print(f"发送请求到 {url}")
        print(f"请求参数: {json.dumps(params, ensure_ascii=False, indent=2)}")
        
        response = requests.post(url, params=params, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 400 or response.status_code == 422:
            print(f"预期失败（参数错误），响应内容: {response.text}")
            return True
        else:
            print(f"测试失败，预期状态码400/422，实际状态码{response.status_code}")
            print(f"响应内容: {response.text}")
            return False
    
    def test_get_original_image_record_normal(self):
        """
        测试GET /original_image_record/{id}接口 - 正常情况
        """
        print("\n=== 测试获取生图记录 - 正常情况 ===")
        
        if not self.created_record_id:
            print("没有可用的记录ID，请先运行创建记录测试")
            return False
        
        url = f"{self.BASE_URL}/original_image_record/{self.created_record_id}"
        print(f"发送请求到 {url}")
        
        response = requests.get(url, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("响应内容:", json.dumps(result, ensure_ascii=False, indent=2))
            return True
        else:
            print(f"获取失败，响应内容: {response.text}")
            return False
    
    def test_get_original_image_record_not_found(self):
        """
        测试GET /original_image_record/{id}接口 - 记录不存在
        """
        print("\n=== 测试获取生图记录 - 记录不存在 ===")
        
        url = f"{self.BASE_URL}/original_image_record/999999999"
        print(f"发送请求到 {url}")
        
        response = requests.get(url, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 404:
            print(f"预期失败（记录不存在），响应内容: {response.text}")
            return True
        else:
            print(f"测试失败，预期状态码404，实际状态码{response.status_code}")
            print(f"响应内容: {response.text}")
            return False
    
    def test_get_original_image_records_by_user_normal(self):
        """
        测试GET /original_image_record/user/{user_id}接口 - 正常情况
        """
        print("\n=== 测试获取用户生图记录列表 - 正常情况 ===")
        
        if not self.test_user_id:
            print("没有用户ID，请先登录")
            return False
        
        url = f"{self.BASE_URL}/original_image_record/user/{self.test_user_id}?skip=0&limit=10"
        print(f"发送请求到 {url}")
        
        response = requests.get(url, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("响应内容:", json.dumps(result, ensure_ascii=False, indent=2))
            return True
        else:
            print(f"获取失败，响应内容: {response.text}")
            return False
    
    def test_get_original_image_records_by_user_not_found(self):
        """
        测试GET /original_image_record/user/{user_id}接口 - 用户不存在
        """
        print("\n=== 测试获取用户生图记录列表 - 用户不存在 ===")
        
        url = f"{self.BASE_URL}/original_image_record/user/999999999?skip=0&limit=10"
        print(f"发送请求到 {url}")
        
        response = requests.get(url, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 403:
            print(f"预期失败（无权访问），响应内容: {response.text}")
            return True
        else:
            print(f"测试失败，预期状态码403，实际状态码{response.status_code}")
            print(f"响应内容: {response.text}")
            return False
    
    def test_update_original_image_record_normal(self):
        """
        测试PUT /original_image_record/{id}接口 - 正常情况
        """
        print("\n=== 测试更新生图记录 - 正常情况 ===")
        
        if not self.created_record_id:
            print("没有可用的记录ID，请先运行创建记录测试")
            return False
        
        url = f"{self.BASE_URL}/original_image_record/{self.created_record_id}"
        update_data = {
            "status": "completed",
            "images": [
                {
                    "url": "https://example.com/image1.jpg",
                    "thumbnail": "https://example.com/thumb1.jpg"
                }
            ]
        }
        
        print(f"发送请求到 {url}")
        print(f"更新数据: {json.dumps(update_data, ensure_ascii=False, indent=2)}")
        
        response = requests.put(url, json=update_data, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("响应内容:", json.dumps(result, ensure_ascii=False, indent=2))
            return True
        else:
            print(f"更新失败，响应内容: {response.text}")
            return False
    
    def test_update_original_image_record_not_found(self):
        """
        测试PUT /original_image_record/{id}接口 - 记录不存在
        """
        print("\n=== 测试更新生图记录 - 记录不存在 ===")
        
        url = f"{self.BASE_URL}/original_image_record/999999999"
        update_data = {
            "status": "completed"
        }
        
        print(f"发送请求到 {url}")
        print(f"更新数据: {json.dumps(update_data, ensure_ascii=False, indent=2)}")
        
        response = requests.put(url, json=update_data, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 404:
            print(f"预期失败（记录不存在），响应内容: {response.text}")
            return True
        else:
            print(f"测试失败，预期状态码404，实际状态码{response.status_code}")
            print(f"响应内容: {response.text}")
            return False
    
    def test_update_original_image_record_invalid_params(self):
        """
        测试PUT /original_image_record/{id}接口 - 参数错误
        """
        print("\n=== 测试更新生图记录 - 参数错误 ===")
        
        if not self.created_record_id:
            print("没有可用的记录ID，请先运行创建记录测试")
            return False
        
        url = f"{self.BASE_URL}/original_image_record/{self.created_record_id}"
        update_data = {
            "status": "invalid_status"
        }
        
        print(f"发送请求到 {url}")
        print(f"更新数据: {json.dumps(update_data, ensure_ascii=False, indent=2)}")
        
        response = requests.put(url, json=update_data, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 422:
            print(f"预期失败（参数错误），响应内容: {response.text}")
            return True
        else:
            print(f"测试失败，预期状态码422，实际状态码{response.status_code}")
            print(f"响应内容: {response.text}")
            return False
    
    def test_delete_original_image_record_normal(self):
        """
        测试DELETE /original_image_record/{id}接口 - 正常情况
        """
        print("\n=== 测试删除生图记录 - 正常情况 ===")
        
        if not self.created_record_id:
            print("没有可用的记录ID，请先运行创建记录测试")
            return False
        
        url = f"{self.BASE_URL}/original_image_record/{self.created_record_id}"
        print(f"发送请求到 {url}")
        
        response = requests.delete(url, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("响应内容:", json.dumps(result, ensure_ascii=False, indent=2))
            self.created_record_id = None
            return True
        else:
            print(f"删除失败，响应内容: {response.text}")
            return False
    
    def test_delete_original_image_record_not_found(self):
        """
        测试DELETE /original_image_record/{id}接口 - 记录不存在
        """
        print("\n=== 测试删除生图记录 - 记录不存在 ===")
        
        url = f"{self.BASE_URL}/original_image_record/999999999"
        print(f"发送请求到 {url}")
        
        response = requests.delete(url, headers=self.get_headers())
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 404:
            print(f"预期失败（记录不存在），响应内容: {response.text}")
            return True
        else:
            print(f"测试失败，预期状态码404，实际状态码{response.status_code}")
            print(f"响应内容: {response.text}")
            return False
    
    def run_all_tests(self):
        """
        运行所有测试用例
        """
        print("=" * 60)
        print("开始运行OriginalImageRecord模块的所有测试用例")
        print("=" * 60)
        
        if not self.login():
            print("登录失败，无法继续测试")
            return
        
        test_results = []
        
        test_results.append(("创建记录 - 正常情况", self.test_create_original_image_record_normal()))
        test_results.append(("创建记录 - 积分不足", self.test_create_original_image_record_insufficient_points()))
        test_results.append(("创建记录 - 参数错误", self.test_create_original_image_record_invalid_params()))
        test_results.append(("获取记录 - 正常情况", self.test_get_original_image_record_normal()))
        test_results.append(("获取记录 - 记录不存在", self.test_get_original_image_record_not_found()))
        test_results.append(("获取用户记录列表 - 正常情况", self.test_get_original_image_records_by_user_normal()))
        test_results.append(("获取用户记录列表 - 用户不存在", self.test_get_original_image_records_by_user_not_found()))
        test_results.append(("更新记录 - 正常情况", self.test_update_original_image_record_normal()))
        test_results.append(("更新记录 - 记录不存在", self.test_update_original_image_record_not_found()))
        test_results.append(("更新记录 - 参数错误", self.test_update_original_image_record_invalid_params()))
        test_results.append(("删除记录 - 正常情况", self.test_delete_original_image_record_normal()))
        test_results.append(("删除记录 - 记录不存在", self.test_delete_original_image_record_not_found()))
        
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
    test_case = OriginalImageRecordTestCase()
    test_case.run_all_tests()
