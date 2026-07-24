import requests
import time
import threading

BASE_URL = "http://127.0.0.1:8000"

def test_concurrent_requests():
    """测试并发请求"""
    print("=== 测试并发请求 ===")
    
    results = []
    
    # 测试并发获取零件列表
    print("\n1. 测试并发获取零件列表:")
    
    success_count = [0]
    
    def fetch_parts():
        try:
            response = requests.get(f"{BASE_URL}/api/inventory/get_parts_inventory", params={"page": 1, "page_size": 10}, timeout=5)
            if response.status_code == 200:
                success_count[0] += 1
        except:
            pass
    
    # 创建10个并发请求
    threads = []
    for i in range(10):
        thread = threading.Thread(target=fetch_parts)
        threads.append(thread)
        thread.start()
    
    # 等待所有线程完成
    for thread in threads:
        thread.join()
    
    print(f"✓ 并发请求测试: {success_count[0]}/10 成功")
    results.append(("并发请求", success_count[0] >= 8))
    
    # 测试连续请求
    print("\n2. 测试连续请求:")
    success_count = 0
    for i in range(20):
        try:
            response = requests.get(f"{BASE_URL}/api/inventory/get_parts_inventory", params={"page": 1, "page_size": 10}, timeout=5)
            if response.status_code == 200:
                success_count += 1
        except:
            pass
    
    print(f"✓ 连续请求测试: {success_count}/20 成功")
    results.append(("连续请求", success_count >= 18))
    
    return results

def test_error_handling():
    """测试错误处理"""
    print("\n=== 测试错误处理 ===")
    
    results = []
    
    # 1. 测试不存在的零件ID
    print("\n1. 测试不存在的零件ID:")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/get_part_by_id", params={"part_id": 999999}, timeout=5)
        if response.status_code == 404:
            print(f"✓ 正确返回404状态码")
            results.append(("不存在的零件ID", True))
        else:
            print(f"✗ 未正确返回404状态码: {response.status_code}")
            results.append(("不存在的零件ID", False))
    except Exception as e:
        print(f"✗ 测试异常: {e}")
        results.append(("不存在的零件ID", False))
    
    # 2. 测试无效的筛选参数
    print("\n2. 测试无效的筛选参数:")
    try:
        filter_data = {
            "category_id": 999999,
            "param_filters": {}
        }
        response = requests.post(f"{BASE_URL}/api/inventory/advanced_search", json=filter_data, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 无效筛选参数处理正常，返回 {len(data.get('data', []))} 个结果")
            results.append(("无效筛选参数", True))
        else:
            print(f"✗ 无效筛选参数处理异常: {response.status_code}")
            results.append(("无效筛选参数", False))
    except Exception as e:
        print(f"✗ 测试异常: {e}")
        results.append(("无效筛选参数", False))
    
    return results

if __name__ == "__main__":
    results1 = test_concurrent_requests()
    results2 = test_error_handling()
    
    all_results = results1 + results2
    passed = sum(1 for _, ok in all_results if ok)
    print(f"\n稳定性测试: {passed}/{len(all_results)} 通过")
