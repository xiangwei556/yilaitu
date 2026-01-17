import requests
from typing import Optional

BASE_URL = "http://localhost:8001/api/v1"

TOKEN = None

def login() -> bool:
    """登录获取token"""
    global TOKEN
    try:
        response = requests.post(
            f"{BASE_URL}/admin/login",
            json={"username": "admin", "password": "admin123"}
        )
        if response.status_code == 200:
            result = response.json()
            TOKEN = result.get("data", {}).get("access_token")
            print(f"✓ 登录成功，Token: {TOKEN[:20] if TOKEN else 'None'}...")
            return TOKEN is not None
        else:
            print(f"✗ 登录失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 登录异常: {e}")
        return False

def get_headers() -> dict:
    """获取请求头"""
    return {"Authorization": f"Bearer {TOKEN}"}

def test_category_list() -> bool:
    """测试获取类目列表"""
    print("\n测试1: 获取类目列表")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/admin/categories",
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            data = result.get('data', {})
            print(f"✓ 获取列表成功，共 {data.get('total', 0)} 条记录")
            return True
        else:
            print(f"✗ 获取列表失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 获取列表异常: {e}")
        return False

def test_category_create() -> Optional[int]:
    """测试创建类目"""
    print("\n测试2: 创建类目")
    try:
        data = {
            "name": "测试类目",
            "code": "test_category",
            "description": "这是一个测试类目",
            "status": "enabled"
        }
        response = requests.post(
            f"{BASE_URL}/sys-images/admin/categories",
            json=data,
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            category_data = result.get('data', {})
            print(f"✓ 创建成功，ID: {category_data.get('id')}")
            return category_data.get('id')
        else:
            print(f"✗ 创建失败: {response.text}")
            return None
    except Exception as e:
        print(f"✗ 创建异常: {e}")
        return None

def test_category_detail(category_id: int) -> bool:
    """测试获取类目详情"""
    print(f"\n测试3: 获取类目详情 (ID: {category_id})")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/admin/categories/{category_id}",
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            category_data = result.get('data', {})
            print(f"✓ 获取详情成功，名称: {category_data.get('name')}")
            return True
        else:
            print(f"✗ 获取详情失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 获取详情异常: {e}")
        return False

def test_category_update(category_id: int) -> bool:
    """测试更新类目"""
    print(f"\n测试4: 更新类目 (ID: {category_id})")
    try:
        data = {
            "name": "测试类目-已更新",
            "description": "这是一个已更新的测试类目",
            "status": "enabled"
        }
        response = requests.put(
            f"{BASE_URL}/sys-images/admin/categories/{category_id}",
            json=data,
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            category_data = result.get('data', {})
            print(f"✓ 更新成功，新名称: {category_data.get('name')}")
            return True
        else:
            print(f"✗ 更新失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 更新异常: {e}")
        return False

def test_category_change_status(category_id: int) -> bool:
    """测试修改类目状态"""
    print(f"\n测试5: 修改类目状态 (ID: {category_id})")
    try:
        response = requests.post(
            f"{BASE_URL}/sys-images/admin/categories/{category_id}/status",
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

def test_category_batch_status(category_ids: list) -> bool:
    """测试批量修改类目状态"""
    print(f"\n测试6: 批量修改类目状态 (IDs: {category_ids})")
    try:
        response = requests.post(
            f"{BASE_URL}/sys-images/admin/categories/batch-status",
            params={"status": "enabled"},
            json=category_ids,
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

def test_category_delete(category_id: int) -> bool:
    """测试删除类目"""
    print(f"\n测试7: 删除类目 (ID: {category_id})")
    try:
        response = requests.delete(
            f"{BASE_URL}/sys-images/admin/categories/{category_id}",
            headers=get_headers()
        )
        if response.status_code == 200:
            print(f"✓ 删除成功")
            return True
        else:
            print(f"✗ 删除失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 删除异常: {e}")
        return False

def test_category_batch_delete(category_ids: list) -> bool:
    """测试批量删除类目"""
    print(f"\n测试8: 批量删除类目 (IDs: {category_ids})")
    try:
        response = requests.delete(
            f"{BASE_URL}/sys-images/admin/categories/batch-delete",
            json=category_ids,
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

def test_category_filter() -> bool:
    """测试类目筛选"""
    print("\n测试9: 类目筛选")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/admin/categories",
            params={"name": "测试", "status": "enabled"},
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            data = result.get('data', {})
            print(f"✓ 筛选成功，找到 {data.get('total', 0)} 条记录")
            return True
        else:
            print(f"✗ 筛选失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 筛选异常: {e}")
        return False

def test_category_public_api() -> bool:
    """测试公开API"""
    print("\n测试10: 公开API")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/categories"
        )
        if response.status_code == 200:
            result = response.json()
            data = result.get('data', {})
            print(f"✓ 公开API访问成功，共 {data.get('total', 0)} 条记录")
            return True
        else:
            print(f"✗ 公开API访问失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 公开API访问异常: {e}")
        return False

def run_all_tests():
    """运行所有测试"""
    print("=" * 60)
    print("类目管理模块测试")
    print("=" * 60)
    
    if not login():
        print("\n✗ 登录失败，测试终止")
        return
    
    test_results = []
    
    test_results.append(("获取列表", test_category_list()))
    
    category_id = test_category_create()
    test_results.append(("创建", category_id is not None))
    
    if category_id:
        test_results.append(("获取详情", test_category_detail(category_id)))
        test_results.append(("更新", test_category_update(category_id)))
        test_results.append(("修改状态", test_category_change_status(category_id)))
        test_results.append(("批量修改状态", test_category_batch_status([category_id])))
        test_results.append(("删除", test_category_delete(category_id)))
    
    test_results.append(("筛选", test_category_filter()))
    test_results.append(("公开API", test_category_public_api()))
    
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
