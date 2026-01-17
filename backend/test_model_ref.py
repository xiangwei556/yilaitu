import requests
import json
from typing import Dict, List, Optional

BASE_URL = "http://localhost:8001/api/v1"
TOKEN = None

def get_headers() -> Dict[str, str]:
    """获取请求头"""
    headers = {"Content-Type": "application/json"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    return headers

def login(username: str = "admin", password: str = "admin123") -> bool:
    """登录获取token"""
    global TOKEN
    try:
        response = requests.post(
            f"{BASE_URL}/admin/login",
            json={"username": username, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            TOKEN = data.get("data", {}).get("access_token")
            print(f"✓ 登录成功，Token: {TOKEN[:20] if TOKEN else 'None'}...")
            return TOKEN is not None
        else:
            print(f"✗ 登录失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 登录异常: {e}")
        return False

def test_model_ref_list() -> bool:
    """测试获取模特参考图列表"""
    print("\n测试1: 获取模特参考图列表")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/admin/model-refs",
            params={"page": 1, "page_size": 10},
            headers=get_headers()
        )
        if response.status_code == 200:
            data = response.json()
            result = data.get('data', {})
            print(f"✓ 获取列表成功，共 {result.get('total', 0)} 条记录")
            return True
        else:
            print(f"✗ 获取列表失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 获取列表异常: {e}")
        return False

def test_model_ref_create() -> Optional[int]:
    """测试创建模特参考图"""
    print("\n测试2: 创建模特参考图")
    try:
        data = {
            "image_url": "/api/v1/sys-images/files/model-refs/test.jpg",
            "gender": "female",
            "age_group": "youth",
            "status": "enabled",
            "category_ids": []
        }
        response = requests.post(
            f"{BASE_URL}/sys-images/admin/model-refs",
            json=data,
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            model_ref_data = result.get('data', {})
            print(f"✓ 创建成功，ID: {model_ref_data.get('id')}")
            return model_ref_data.get('id')
        else:
            print(f"✗ 创建失败: {response.text}")
            return None
    except Exception as e:
        print(f"✗ 创建异常: {e}")
        return None

def test_model_ref_detail(model_ref_id: int) -> bool:
    """测试获取模特参考图详情"""
    print(f"\n测试3: 获取模特参考图详情 (ID: {model_ref_id})")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/admin/model-refs/{model_ref_id}",
            headers=get_headers()
        )
        if response.status_code == 200:
            data = response.json()
            model_ref_data = data.get('data', {})
            print(f"✓ 获取详情成功，性别: {model_ref_data.get('gender')}, 年龄组: {model_ref_data.get('age_group')}")
            return True
        else:
            print(f"✗ 获取详情失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 获取详情异常: {e}")
        return False

def test_model_ref_update(model_ref_id: int) -> bool:
    """测试更新模特参考图"""
    print(f"\n测试4: 更新模特参考图 (ID: {model_ref_id})")
    try:
        data = {
            "age_group": "middle"
        }
        response = requests.put(
            f"{BASE_URL}/sys-images/admin/model-refs/{model_ref_id}",
            json=data,
            headers=get_headers()
        )
        if response.status_code == 200:
            print(f"✓ 更新成功")
            return True
        else:
            print(f"✗ 更新失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 更新异常: {e}")
        return False

def test_model_ref_change_status(model_ref_id: int) -> bool:
    """测试修改模特参考图状态"""
    print(f"\n测试5: 修改模特参考图状态 (ID: {model_ref_id})")
    try:
        response = requests.post(
            f"{BASE_URL}/sys-images/admin/model-refs/{model_ref_id}/status",
            params={"status": "disabled"},
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            data = result.get('data', {})
            print(f"✓ 修改状态成功，更新数量: {data.get('updated', 0)}")
            return True
        else:
            print(f"✗ 修改状态失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 修改状态异常: {e}")
        return False

def test_model_ref_batch_status(model_ref_ids: List[int]) -> bool:
    """测试批量修改模特参考图状态"""
    print(f"\n测试6: 批量修改模特参考图状态 (IDs: {model_ref_ids})")
    try:
        response = requests.post(
            f"{BASE_URL}/sys-images/admin/model-refs/batch-status",
            json=model_ref_ids,
            params={"status": "enabled"},
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            data = result.get('data', {})
            print(f"✓ 批量修改状态成功，更新数量: {data.get('updated', 0)}")
            return True
        else:
            print(f"✗ 批量修改状态失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 批量修改状态异常: {e}")
        return False

def test_model_ref_delete(model_ref_id: int) -> bool:
    """测试删除模特参考图"""
    print(f"\n测试7: 删除模特参考图 (ID: {model_ref_id})")
    try:
        response = requests.delete(
            f"{BASE_URL}/sys-images/admin/model-refs/{model_ref_id}",
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            data = result.get('data', {})
            print(f"✓ 删除成功，删除数量: {data.get('deleted', 0)}")
            return True
        else:
            print(f"✗ 删除失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 删除异常: {e}")
        return False

def test_model_ref_batch_delete(model_ref_ids: List[int]) -> bool:
    """测试批量删除模特参考图"""
    print(f"\n测试8: 批量删除模特参考图 (IDs: {model_ref_ids})")
    try:
        response = requests.post(
            f"{BASE_URL}/sys-images/admin/model-refs/batch-delete",
            json=model_ref_ids,
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            data = result.get('data', {})
            print(f"✓ 批量删除成功，删除数量: {data.get('deleted', 0)}")
            return True
        else:
            print(f"✗ 批量删除失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 批量删除异常: {e}")
        return False

def test_model_ref_filter() -> bool:
    """测试筛选模特参考图"""
    print("\n测试9: 筛选模特参考图")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/admin/model-refs",
            params={"page": 1, "page_size": 10, "gender": "female", "age_group": "youth"},
            headers=get_headers()
        )
        if response.status_code == 200:
            data = response.json()
            result = data.get('data', {})
            print(f"✓ 筛选成功，共 {result.get('total', 0)} 条记录")
            return True
        else:
            print(f"✗ 筛选失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 筛选异常: {e}")
        return False

def test_model_ref_public_api() -> bool:
    """测试公开API获取模特参考图"""
    print("\n测试10: 公开API获取模特参考图")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/model-refs",
            params={"page": 1, "page_size": 10}
        )
        if response.status_code == 200:
            data = response.json()
            result = data.get('data', {})
            print(f"✓ 公开API获取成功，共 {result.get('total', 0)} 条记录")
            return True
        else:
            print(f"✗ 公开API获取失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 公开API获取异常: {e}")
        return False

def run_all_tests():
    """运行所有测试"""
    print("=" * 60)
    print("模特参考图管理模块测试")
    print("=" * 60)
    
    if not login():
        print("\n✗ 登录失败，测试终止")
        return
    
    test_results = []
    
    test_results.append(("获取列表", test_model_ref_list()))
    
    model_ref_id = test_model_ref_create()
    test_results.append(("创建", model_ref_id is not None))
    
    if model_ref_id:
        test_results.append(("获取详情", test_model_ref_detail(model_ref_id)))
        test_results.append(("更新", test_model_ref_update(model_ref_id)))
        test_results.append(("修改状态", test_model_ref_change_status(model_ref_id)))
        test_results.append(("批量修改状态", test_model_ref_batch_status([model_ref_id])))
        test_results.append(("删除", test_model_ref_delete(model_ref_id)))
    
    test_results.append(("筛选", test_model_ref_filter()))
    test_results.append(("公开API", test_model_ref_public_api()))
    
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)
    
    for name, result in test_results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"{name:20s} {status}")
    
    print(f"\n总计: {passed}/{total} 测试通过")
    print("=" * 60)

if __name__ == "__main__":
    run_all_tests()
