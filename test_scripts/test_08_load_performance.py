import requests
import time
import statistics

BASE_URL = "http://127.0.0.1:8000"

def test_page_load_performance():
    """测试页面加载性能"""
    print("=== 测试页面加载性能 ===")
    
    results = []
    
    # 1. 测试首页加载时间
    print("\n1. 测试首页加载时间:")
    load_times = []
    for i in range(5):
        try:
            start_time = time.time()
            response = requests.get(f"{BASE_URL}/", timeout=5)
            end_time = time.time()
            
            if response.status_code == 200:
                load_time = (end_time - start_time) * 1000
                load_times.append(load_time)
                print(f"   第{i+1}次: {load_time:.2f}ms")
        except Exception as e:
            print(f"   第{i+1}次失败: {e}")
    
    if load_times:
        avg_time = statistics.mean(load_times)
        max_time = max(load_times)
        min_time = min(load_times)
        print(f"✓ 首页加载时间 - 平均: {avg_time:.2f}ms, 最大: {max_time:.2f}ms, 最小: {min_time:.2f}ms")
        results.append(("首页加载", avg_time < 500))
    else:
        print(f"✗ 首页加载测试失败")
        results.append(("首页加载", False))
    
    # 2. 测试API响应时间
    print("\n2. 测试API响应时间:")
    api_endpoints = [
        ("GET", "/api/inventory/get_parts_inventory?page=1&page_size=100", "获取零件列表"),
        ("GET", "/api/config/bundle", "获取配置包"),
        ("GET", "/api/inventory/category_param_values?category_id=1", "获取类别参数"),
    ]
    
    for method, endpoint, desc in api_endpoints:
        load_times = []
        for i in range(3):
            try:
                start_time = time.time()
                if method == "GET":
                    response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
                else:
                    response = requests.post(f"{BASE_URL}{endpoint}", timeout=5)
                end_time = time.time()
                
                if response.status_code == 200:
                    load_time = (end_time - start_time) * 1000
                    load_times.append(load_time)
            except Exception as e:
                pass
        
        if load_times:
            avg_time = statistics.mean(load_times)
            print(f"✓ {desc}: 平均 {avg_time:.2f}ms")
            results.append((desc, avg_time < 200))
        else:
            print(f"✗ {desc}: 测试失败")
            results.append((desc, False))
    
    # 3. 测试大页面加载
    print("\n3. 测试大页面加载 (100条数据):")
    try:
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/inventory/get_parts_inventory", params={"page": 1, "page_size": 100}, timeout=5)
        end_time = time.time()
        
        if response.status_code == 200:
            load_time = (end_time - start_time) * 1000
            data = response.json()
            print(f"✓ 大页面加载: {load_time:.2f}ms, 数据量: {len(data.get('data', []))} 条")
            results.append(("大页面加载", load_time < 300))
        else:
            print(f"✗ 大页面加载失败: {response.status_code}")
            results.append(("大页面加载", False))
    except Exception as e:
        print(f"✗ 大页面加载异常: {e}")
        results.append(("大页面加载", False))
    
    return results

if __name__ == "__main__":
    results = test_page_load_performance()
    passed = sum(1 for _, ok in results if ok)
    print(f"\n页面加载性能测试: {passed}/{len(results)} 通过")
