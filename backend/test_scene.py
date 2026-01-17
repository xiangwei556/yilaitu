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

def test_scene_list() -> bool:
    """测试获取场景图列表"""
    print("\n测试1: 获取场景图列表")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/admin/scenes",
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

def test_scene_create() -> Optional[int]:
    """测试创建场景图"""
    print("\n测试2: 创建场景图")
    try:
        data = {
            "name": "测试场景",
            "image_url": "/api/v1/sys-images/files/scenes/test.jpg",
            "status": "enabled"
        }
        response = requests.post(
            f"{BASE_URL}/sys-images/admin/scenes",
            json=data,
            headers=get_headers()
        )
        if response.status_code == 200:
            result = response.json()
            scene_data = result.get('data', {})
            print(f"✓ 创建成功，ID: {scene_data.get('id')}")
            return scene_data.get('id')
        else:
            print(f"✗ 创建失败: {response.text}")
            return None
    except Exception as e:
        print(f"✗ 创建异常: {e}")
        return None

def test_scene_detail(scene_id: int) -> bool:
    """测试获取场景图详情"""
    print(f"\n测试3: 获取场景图详情 (ID: {scene_id})")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/admin/scenes/{scene_id}",
            headers=get_headers()
        )
        if response.status_code == 200:
            data = response.json()
            scene_data = data.get('data', {})
            print(f"✓ 获取详情成功，名称: {scene_data.get('name')}")
            return True
        else:
            print(f"✗ 获取详情失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 获取详情异常: {e}")
        return False

def test_scene_update(scene_id: int) -> bool:
    """测试更新场景图"""
    print(f"\n测试4: 更新场景图 (ID: {scene_id})")
    try:
        data = {
            "name": "更新后的测试场景"
        }
        response = requests.put(
            f"{BASE_URL}/sys-images/admin/scenes/{scene_id}",
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

def test_scene_change_status(scene_id: int) -> bool:
    """测试修改场景图状态"""
    print(f"\n测试5: 修改场景图状态 (ID: {scene_id})")
    try:
        response = requests.post(
            f"{BASE_URL}/sys-images/admin/scenes/{scene_id}/status",
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

def test_scene_batch_status(scene_ids: List[int]) -> bool:
    """测试批量修改场景图状态"""
    print(f"\n测试6: 批量修改场景图状态 (IDs: {scene_ids})")
    try:
        response = requests.post(
            f"{BASE_URL}/sys-images/admin/scenes/batch-status",
            json=scene_ids,
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

def test_scene_delete(scene_id: int) -> bool:
    """测试删除场景图"""
    print(f"\n测试7: 删除场景图 (ID: {scene_id})")
    try:
        response = requests.delete(
            f"{BASE_URL}/sys-images/admin/scenes/{scene_id}",
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

def test_scene_batch_delete(scene_ids: List[int]) -> bool:
    """测试批量删除场景图"""
    print(f"\n测试8: 批量删除场景图 (IDs: {scene_ids})")
    try:
        response = requests.post(
            f"{BASE_URL}/sys-images/admin/scenes/batch-delete",
            json=scene_ids,
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

def test_scene_filter() -> bool:
    """测试筛选场景图"""
    print("\n测试9: 筛选场景图")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/admin/scenes",
            params={"page": 1, "page_size": 10, "name": "测试", "status": "enabled"},
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

def test_scene_sort() -> bool:
    """测试排序场景图"""
    print("\n测试10: 排序场景图")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/admin/scenes",
            params={"page": 1, "page_size": 10, "sort_by": "name", "order": "asc"},
            headers=get_headers()
        )
        if response.status_code == 200:
            data = response.json()
            result = data.get('data', {})
            print(f"✓ 排序成功，共 {result.get('total', 0)} 条记录")
            return True
        else:
            print(f"✗ 排序失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 排序异常: {e}")
        return False

def test_scene_public_api() -> bool:
    """测试公开API获取场景图"""
    print("\n测试11: 公开API获取场景图")
    try:
        response = requests.get(
            f"{BASE_URL}/sys-images/scenes",
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
    print("场景图管理模块测试")
    print("=" * 60)
    
    if not login():
        print("\n✗ 登录失败，测试终止")
        return
    
    test_results = []
    
    test_results.append(("获取列表", test_scene_list()))
    
    scene_id = test_scene_create()
    test_results.append(("创建", scene_id is not None))
    
    if scene_id:
        test_results.append(("获取详情", test_scene_detail(scene_id)))
        test_results.append(("更新", test_scene_update(scene_id)))
        test_results.append(("修改状态", test_scene_change_status(scene_id)))
        test_results.append(("批量修改状态", test_scene_batch_status([scene_id])))
        test_results.append(("删除", test_scene_delete(scene_id)))
    
    test_results.append(("筛选", test_scene_filter()))
    test_results.append(("排序", test_scene_sort()))
    test_results.append(("公开API", test_scene_public_api()))
    
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
