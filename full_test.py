import subprocess
import time
import sys

print("=== 完整测试流程 ===\n")

# 1. 启动服务器
print("1. 启动服务器...")
server_process = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

# 等待服务器启动
print("   等待服务器启动...")
time.sleep(5)

# 2. 运行测试
print("\n2. 运行API测试...")
try:
    import requests
    import json

    BASE_URL = "http://127.0.0.1:8000"

    # 测试搜索功能
    print("\n   测试搜索功能:")
    test_searches = ["ESP", "U19", "R01A"]
    for search_key in test_searches:
        try:
            response = requests.get(f"{BASE_URL}/api/inventory/search", params={"search_key": search_key})
            if response.status_code == 200:
                results = response.json()
                print(f"   ✓ 搜索 '{search_key}': 找到 {len(results)} 个结果")
                for r in results[:2]:
                    print(f"      ID={r['id']}, Name={r['name']}, Part Number={r.get('part_number', 'N/A')}")
            else:
                print(f"   ✗ 搜索 '{search_key}': 失败 - {response.status_code}")
        except Exception as e:
            print(f"   ✗ 搜索 '{search_key}': 异常 - {e}")

    # 测试类别参数值查询
    print("\n   测试类别参数值查询:")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/category_param_values", params={"category_id": 1})
        if response.status_code == 200:
            param_values = response.json()
            print(f"   ✓ 电阻类别参数值: {json.dumps(param_values, ensure_ascii=False)}")
        else:
            print(f"   ✗ 查询失败: {response.status_code}")
    except Exception as e:
        print(f"   ✗ 查询异常: {e}")

    # 测试高级筛选
    print("\n   测试高级筛选（参数筛选）:")
    filter_data = {
        "category_id": 1,
        "param_filters": {
            "阻值": "10K"
        }
    }
    try:
        response = requests.post(f"{BASE_URL}/api/inventory/advanced_search", json=filter_data)
        if response.status_code == 200:
            result = response.json()
            parts = result.get("data", [])
            print(f"   ✓ 筛选阻值=10K: 找到 {len(parts)} 个结果")
            for p in parts:
                print(f"      ID={p['id']}, Name={p['name']}")
        else:
            print(f"   ✗ 筛选失败: {response.status_code}")
            print(f"      响应: {response.text[:200]}")
    except Exception as e:
        print(f"   ✗ 筛选异常: {e}")

    # 测试获取零件详情
    print("\n   测试获取零件详情:")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/get_part_by_id", params={"part_id": 157})
        if response.status_code == 200:
            part = response.json()
            print(f"   ✓ 零件详情:")
            print(f"      ID: {part['id']}")
            print(f"      Name: {part['name']}")
            print(f"      Part Number: {part.get('part_number', 'N/A')}")
            print(f"      Other: {part.get('other', 'N/A')}")
        else:
            print(f"   ✗ 获取失败: {response.status_code}")
    except Exception as e:
        print(f"   ✗ 获取异常: {e}")

except ImportError:
    print("   错误: 需要安装 requests 库")
    print("   运行: pip install requests")

# 3. 停止服务器
print("\n3. 停止服务器...")
server_process.terminate()
server_process.wait()
print("   服务器已停止")

print("\n=== 测试完成 ===")
