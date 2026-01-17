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

def test_background_list() -> bool:
    """测试获取背景图列表"""
    print("\n测试1: 获取背景图列表")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/admin/backgrounds",
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✓ 获取列表成功，共 {result.get('total', 0)} 条记录")
            return True
        else:
            print(f"✗ 获取列表失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 获取列表异常: {e}")
        return False

def test_background_create() -> Optional[int]:
    """测试创建背景图"""
    print("\n测试2: 创建背景图")
    try:
        data = {
            "name": "测试背景",
            "image_url": "/api/v1/sys-images/files/backgrounds/test.jpg",
            "status": "enabled"
        }
        response = requests.post(
            f"{BASE_URL}/sys-images/admin/backgrounds",
            json=data,
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✓ 创建成功，ID: {result.get('id')}")
            return result.get("id")
        else:
            print(f"✗ 创建失败: {response.text}")
            return None
    except Exception as e:
        print(f"✗ 创建异常: {e}")
        return None

def test_background_detail(background_id: int) -> bool:
    """测试获取背景图详情"""
    print(f"\n测试3: 获取背景图详情 (ID: {background_id})")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/admin/backgrounds/{background_id}",
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✓ 获取详情成功，名称: {result.get('name')}")
            return True
        else:
            print(f"✗ 获取详情失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 获取详情异常: {e}")
        return False

def test_background_update(background_id: int) -> bool:
    """测试更新背景图"""
    print(f"\n测试4: 更新背景图 (ID: {background_id})")
    try:
        data = {
            "name": "测试背景-已更新",
            "status": "enabled"
        }
        response = requests.put(
            f"{BASE_URL}/sys-images/admin/backgrounds/{background_id}",
            json=data,
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            background_data = result.get('data', {})
            print(f"✓ 更新成功，新名称: {background_data.get('name')}")
            return True
        else:
            print(f"✗ 更新失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 更新异常: {e}")
        return False

def test_background_change_status(background_id: int) -> bool:
    """测试修改背景图状态"""
    print(f"\n测试5: 修改背景图状态 (ID: {background_id})")
    try:
        response = requests.post(
            f"{BASE_URL}/sys-images/admin/backgrounds/{background_id}/status",
            params={"status": "disabled"},
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✓ 修改状态成功，更新数量: {result.get('updated', 0)}")
            return True
        else:
            print(f"✗ 修改状态失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 修改状态异常: {e}")
        return False

def test_background_batch_status(background_ids: list) -> bool:
    """测试批量修改背景图状态"""
    print(f"\n测试6: 批量修改背景图状态 (IDs: {background_ids})")
    try:
        response = requests.post(
            f"{BASE_URL}/sys-images/admin/backgrounds/batch-status",
            params={"status": "enabled"},
            json=background_ids,
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✓ 批量修改状态成功，更新数量: {result.get('updated', 0)}")
            return True
        else:
            print(f"✗ 批量修改状态失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 批量修改状态异常: {e}")
        return False

def test_background_delete(background_id: int) -> bool:
    """测试删除背景图"""
    print(f"\n测试7: 删除背景图 (ID: {background_id})")
    try:
        response = requests.delete(
            f"{BASE_URL}/sys-images/admin/backgrounds/{background_id}",
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

def test_background_batch_delete(background_ids: list) -> bool:
    """测试批量删除背景图"""
    print(f"\n测试8: 批量删除背景图 (IDs: {background_ids})")
    try:
        data = {"ids": background_ids}
        response = requests.delete(
            f"{BASE_URL}/sys-images/admin/backgrounds/batch",
            json=data,
            headers=get_headers()
        )
        if response.status_code == 200:
            print(f"✓ 批量删除成功")
            return True
        else:
            print(f"✗ 批量删除失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 批量删除异常: {e}")
        return False

def test_background_filter() -> bool:
    """测试背景图筛选"""
    print("\n测试9: 背景图筛选")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/admin/backgrounds",
            params={"name": "测试", "status": "enabled"},
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✓ 筛选成功，找到 {result.get('total', 0)} 条记录")
            return True
        else:
            print(f"✗ 筛选失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 筛选异常: {e}")
        return False

def test_background_public_api() -> bool:
    """测试公开API"""
    print("\n测试10: 公开API")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/backgrounds"
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
    print("背景图管理模块测试")
    print("=" * 60)
    
    if not login():
        print("\n✗ 登录失败，测试终止")
        return
    
    test_results = []
    
    test_results.append(("获取列表", test_background_list()))
    
    background_id = test_background_create()
    test_results.append(("创建", background_id is not None))
    
    if background_id:
        test_results.append(("获取详情", test_background_detail(background_id)))
        test_results.append(("更新", test_background_update(background_id)))
        test_results.append(("修改状态", test_background_change_status(background_id)))
        test_results.append(("批量修改状态", test_background_batch_status([background_id])))
        test_results.append(("删除", test_background_delete(background_id)))
    
    test_results.append(("筛选", test_background_filter()))
    test_results.append(("公开API", test_background_public_api()))
    
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
