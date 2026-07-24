import requests
import time

BASE_URL = "http://127.0.0.1:8000"

def test_operation_fluency():
    """测试操作流畅度"""
    print("=== 测试操作流畅度 ===")
    
    results = []
    
    # 1. 测试搜索响应速度
    print("\n1. 测试搜索响应速度:")
    search_keywords = ["ESP", "电阻", "0603", "10K"]
    
    for keyword in search_keywords:
        try:
            start_time = time.time()
            response = requests.get(f"{BASE_URL}/api/inventory/search", params={"search_key": keyword}, timeout=5)
            end_time = time.time()
            
            if response.status_code == 200:
                response_time = (end_time - start_time) * 1000
                data = response.json()
                print(f"✓ 搜索'{keyword}': {response_time:.2f}ms, 找到 {len(data)} 个结果")
                results.append((f"搜索{keyword}", response_time < 100))
            else:
                print(f"✗ 搜索'{keyword}'失败: {response.status_code}")
                results.append((f"搜索{keyword}", False))
        except Exception as e:
            print(f"✗ 搜索'{keyword}'异常: {e}")
            results.append((f"搜索{keyword}", False))
    
    # 2. 测试筛选响应速度
    print("\n2. 测试筛选响应速度:")
    filters = [
        {"category_id": 1, "param_filters": {"封装": "0603"}},
        {"category_id": 2, "param_filters": {"容值": {"min": "1uF", "max": "100uF"}}},
        {"category_id": 1, "param_filters": {"阻值": "10K"}},
    ]
    
    for i, filter_data in enumerate(filters):
        try:
            start_time = time.time()
            response = requests.post(f"{BASE_URL}/api/inventory/advanced_search", json=filter_data, timeout=5)
            end_time = time.time()
            
            if response.status_code == 200:
                response_time = (end_time - start_time) * 1000
                data = response.json()
                print(f"✓ 筛选{i+1}: {response_time:.2f}ms, 找到 {len(data.get('data', []))} 个结果")
                results.append((f"筛选{i+1}", response_time < 150))
            else:
                print(f"✗ 筛选{i+1}失败: {response.status_code}")
                results.append((f"筛选{i+1}", False))
        except Exception as e:
            print(f"✗ 筛选{i+1}异常: {e}")
            results.append((f"筛选{i+1}", False))
    
    # 3. 测试连续操作响应
    print("\n3. 测试连续操作响应:")
    try:
        start_time = time.time()
        
        requests.get(f"{BASE_URL}/api/inventory/get_parts_inventory", params={"page": 1, "page_size": 10}, timeout=5)
        requests.get(f"{BASE_URL}/api/inventory/search", params={"search_key": "ESP"}, timeout=5)
        requests.post(f"{BASE_URL}/api/inventory/advanced_search", json={"category_id": 1}, timeout=5)
        
        end_time = time.time()
        total_time = (end_time - start_time) * 1000
        
        print(f"✓ 连续操作响应: {total_time:.2f}ms (3个请求)")
        results.append(("连续操作", total_time < 300))
    except Exception as e:
        print(f"✗ 连续操作异常: {e}")
        results.append(("连续操作", False))
    
    # 4. 测试数据刷新速度
    print("\n4. 测试数据刷新速度:")
    try:
        start_time = time.time()
        requests.get(f"{BASE_URL}/api/inventory/get_parts_inventory", params={"page": 1, "page_size": 50}, timeout=5)
        end_time = time.time()
        first_load = (end_time - start_time) * 1000
        
        start_time = time.time()
        requests.get(f"{BASE_URL}/api/inventory/get_parts_inventory", params={"page": 1, "page_size": 50}, timeout=5)
        end_time = time.time()
        second_load = (end_time - start_time) * 1000
        
        print(f"✓ 数据刷新速度 - 首次: {first_load:.2f}ms, 二次: {second_load:.2f}ms")
        results.append(("数据刷新", second_load <= first_load * 1.5))
    except Exception as e:
        print(f"✗ 数据刷新异常: {e}")
        results.append(("数据刷新", False))
    
    return results

if __name__ == "__main__":
    results = test_operation_fluency()
    passed = sum(1 for _, ok in results if ok)
    print(f"\n操作流畅度测试: {passed}/{len(results)} 通过")
