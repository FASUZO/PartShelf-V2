import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_history_operations():
    """测试历史记录功能"""
    print("=== 测试历史记录功能 ===")
    
    results = []
    
    # 1. 测试获取所有历史记录
    print("\n1. 测试获取所有历史记录:")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/inventory_history", params={"page": 1, "page_size": 10}, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 获取历史记录成功，共 {data.get('pagination', {}).get('total_count', 0)} 条记录")
            results.append(("获取历史记录", True))
        else:
            print(f"✗ 获取历史记录失败: {response.status_code}")
            results.append(("获取历史记录", False))
    except Exception as e:
        print(f"✗ 获取历史记录异常: {e}")
        results.append(("获取历史记录", False))
    
    # 2. 测试按零件ID获取历史记录
    print("\n2. 测试按零件ID获取历史记录:")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/inventory_history", params={"part_id": 157, "page": 1, "page_size": 10}, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 获取零件历史记录成功，共 {data.get('pagination', {}).get('total_count', 0)} 条记录")
            results.append(("按零件ID获取历史", True))
        else:
            print(f"✗ 获取零件历史记录失败: {response.status_code}")
            results.append(("按零件ID获取历史", False))
    except Exception as e:
        print(f"✗ 获取零件历史记录异常: {e}")
        results.append(("按零件ID获取历史", False))
    
    # 3. 测试按操作类型筛选
    print("\n3. 测试按操作类型筛选:")
    operation_types = ["in", "out", "adjust"]
    for op_type in operation_types:
        try:
            response = requests.get(f"{BASE_URL}/api/inventory/inventory_history", params={"operation_type": op_type, "page": 1, "page_size": 5}, timeout=5)
            if response.status_code == 200:
                data = response.json()
                count = data.get('pagination', {}).get('total_count', 0)
                print(f"✓ 操作类型={op_type}: 找到 {count} 条记录")
                results.append((f"操作类型{op_type}", True))
            else:
                print(f"✗ 操作类型={op_type} 筛选失败: {response.status_code}")
                results.append((f"操作类型{op_type}", False))
        except Exception as e:
            print(f"✗ 操作类型={op_type} 筛选异常: {e}")
            results.append((f"操作类型{op_type}", False))
    
    return results

if __name__ == "__main__":
    results = test_history_operations()
    passed = sum(1 for _, ok in results if ok)
    print(f"\n历史记录测试: {passed}/{len(results)} 通过")
