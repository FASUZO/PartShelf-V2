import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_param_filter():
    """测试参数筛选功能"""
    print("=== 测试参数筛选功能 ===")
    
    results = []
    
    # 1. 测试获取类别参数值
    print("\n1. 测试获取类别参数值:")
    categories = [
        (1, "电阻"),
        (2, "电容"),
        (3, "电感"),
    ]
    
    for cat_id, cat_name in categories:
        try:
            response = requests.get(f"{BASE_URL}/api/inventory/category_param_values", params={"category_id": cat_id}, timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"✓ {cat_name}类别参数值:")
                for key, values in data.items():
                    print(f"   - {key}: {values[:5]}{'...' if len(values) > 5 else ''}")
                results.append((f"{cat_name}参数值", True))
            else:
                print(f"✗ {cat_name}类别参数值获取失败: {response.status_code}")
                results.append((f"{cat_name}参数值", False))
        except Exception as e:
            print(f"✗ {cat_name}类别参数值获取异常: {e}")
            results.append((f"{cat_name}参数值", False))
    
    # 2. 测试封装筛选
    print("\n2. 测试封装筛选:")
    packages = ["0603", "0402", "0805"]
    for pkg in packages:
        try:
            filter_data = {
                "category_id": 1,
                "param_filters": {
                    "封装": pkg
                }
            }
            response = requests.post(f"{BASE_URL}/api/inventory/advanced_search", json=filter_data, timeout=5)
            if response.status_code == 200:
                data = response.json()
                count = len(data.get('data', []))
                print(f"✓ 封装={pkg}: 找到 {count} 个结果")
                results.append((f"封装筛选{pkg}", True))
            else:
                print(f"✗ 封装={pkg} 筛选失败: {response.status_code}")
                results.append((f"封装筛选{pkg}", False))
        except Exception as e:
            print(f"✗ 封装={pkg} 筛选异常: {e}")
            results.append((f"封装筛选{pkg}", False))
    
    # 3. 测试参数范围筛选
    print("\n3. 测试参数范围筛选:")
    try:
        filter_data = {
            "category_id": 1,
            "param_filters": {
                "阻值": {"min": "1K", "max": "100K"}
            }
        }
        response = requests.post(f"{BASE_URL}/api/inventory/advanced_search", json=filter_data, timeout=5)
        if response.status_code == 200:
            data = response.json()
            count = len(data.get('data', []))
            print(f"✓ 阻值范围筛选: 找到 {count} 个结果")
            results.append(("参数范围筛选", True))
        else:
            print(f"✗ 参数范围筛选失败: {response.status_code}")
            results.append(("参数范围筛选", False))
    except Exception as e:
        print(f"✗ 参数范围筛选异常: {e}")
        results.append(("参数范围筛选", False))
    
    return results

if __name__ == "__main__":
    results = test_param_filter()
    passed = sum(1 for _, ok in results if ok)
    print(f"\n参数筛选测试: {passed}/{len(results)} 通过")
