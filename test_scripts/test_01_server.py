import requests
import time
import subprocess
import sys
import os

def test_server_startup():
    """测试服务器启动"""
    print("=== 测试服务器启动 ===")
    
    # 检查服务器是否已经在运行
    try:
        response = requests.get("http://127.0.0.1:8000/", timeout=2)
        if response.status_code == 200:
            print("✓ 服务器已在运行")
            return True, None
    except:
        pass
    
    # 启动服务器
    print("正在启动服务器...")
    server_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    
    # 等待服务器启动
    time.sleep(5)
    
    # 测试服务器是否响应
    try:
        response = requests.get("http://127.0.0.1:8000/")
        print(f"✓ 服务器启动成功，状态码: {response.status_code}")
        return True, server_process
    except Exception as e:
        print(f"✗ 服务器启动失败: {e}")
        return False, server_process

def test_api_endpoints():
    """测试基础API端点"""
    print("\n=== 测试基础API端点 ===")
    
    endpoints = [
        ("GET", "/api/inventory/get_parts_inventory?page=1&page_size=10", "获取零件列表"),
        ("GET", "/api/config/bundle", "获取配置包"),
        ("GET", "/api/inventory/category_param_values?category_id=1", "获取类别参数值"),
    ]
    
    results = []
    for method, endpoint, desc in endpoints:
        try:
            if method == "GET":
                response = requests.get(f"http://127.0.0.1:8000{endpoint}", timeout=5)
            else:
                response = requests.post(f"http://127.0.0.1:8000{endpoint}", timeout=5)
            
            if response.status_code == 200:
                print(f"✓ {desc}: {response.status_code}")
                results.append((desc, True))
            else:
                print(f"✗ {desc}: {response.status_code}")
                results.append((desc, False))
        except Exception as e:
            print(f"✗ {desc}: {e}")
            results.append((desc, False))
    
    return results

if __name__ == "__main__":
    success, server = test_server_startup()
    if success:
        results = test_api_endpoints()
        passed = sum(1 for _, ok in results if ok)
        print(f"\n基础API测试: {passed}/{len(results)} 通过")
        
        if server:
            server.terminate()
    else:
        print("\n服务器启动失败，无法进行API测试")
