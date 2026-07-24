import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_inventory_operations():
    """测试库存管理操作"""
    print("=== 测试库存管理功能 ===")
    
    results = []
    
    # 1. 测试获取零件列表
    print("\n1. 测试获取零件列表:")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/get_parts_inventory", params={"page": 1, "page_size": 10}, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 获取零件列表成功，共 {data.get('pagination', {}).get('total_count', 0)} 个零件")
            results.append(("获取零件列表", True))
        else:
            print(f"✗ 获取零件列表失败: {response.status_code}")
            results.append(("获取零件列表", False))
    except Exception as e:
        print(f"✗ 获取零件列表异常: {e}")
        results.append(("获取零件列表", False))
    
    # 2. 测试搜索功能
    print("\n2. 测试搜索功能:")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/search", params={"search_key": "ESP"}, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 搜索成功，找到 {len(data)} 个结果")
            results.append(("搜索功能", True))
        else:
            print(f"✗ 搜索失败: {response.status_code}")
            results.append(("搜索功能", False))
    except Exception as e:
        print(f"✗ 搜索异常: {e}")
        results.append(("搜索功能", False))
    
    # 3. 测试高级筛选
    print("\n3. 测试高级筛选:")
    try:
        filter_data = {
            "category_id": 1,
            "param_filters": {
                "封装": "0603"
            }
        }
        response = requests.post(f"{BASE_URL}/api/inventory/advanced_search", json=filter_data, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 高级筛选成功，找到 {len(data.get('data', []))} 个结果")
            results.append(("高级筛选", True))
        else:
            print(f"✗ 高级筛选失败: {response.status_code}")
            results.append(("高级筛选", False))
    except Exception as e:
        print(f"✗ 高级筛选异常: {e}")
        results.append(("高级筛选", False))
    
    # 4. 测试获取零件详情
    print("\n4. 测试获取零件详情:")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/get_part_by_id", params={"part_id": 157}, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 获取零件详情成功: {data.get('name', 'N/A')}")
            results.append(("获取零件详情", True))
        else:
            print(f"✗ 获取零件详情失败: {response.status_code}")
            results.append(("获取零件详情", False))
    except Exception as e:
        print(f"✗ 获取零件详情异常: {e}")
        results.append(("获取零件详情", False))
    
    return results

if __name__ == "__main__":
    results = test_inventory_operations()
    passed = sum(1 for _, ok in results if ok)
    print(f"\n库存管理测试: {passed}/{len(results)} 通过")
