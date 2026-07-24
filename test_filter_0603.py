import requests
import json

BASE_URL = "http://127.0.0.1:8000"

print("=== 测试电阻封装筛选 ===\n")

# 测试筛选封装=0603
print("测试筛选封装=0603:")
filter_data = {
    "category_id": 1,
    "param_filters": {
        "封装": "0603"
    }
}
try:
    response = requests.post(f"{BASE_URL}/api/inventory/advanced_search", json=filter_data)
    if response.status_code == 200:
        result = response.json()
        parts = result.get("data", [])
        print(f"找到 {len(parts)} 个结果")
        for p in parts[:5]:  # 只显示前5个
            print(f"   ID={p['id']}, Name={p['name']}, Package={p.get('package', 'N/A')}")
    else:
        print(f"筛选失败: {response.status_code}")
        print(f"响应: {response.text[:200]}")
except Exception as e:
    print(f"筛选异常: {e}")

# 测试筛选封装=2512
print("\n测试筛选封装=2512:")
filter_data = {
    "category_id": 1,
    "param_filters": {
        "封装": "2512"
    }
}
try:
    response = requests.post(f"{BASE_URL}/api/inventory/advanced_search", json=filter_data)
    if response.status_code == 200:
        result = response.json()
        parts = result.get("data", [])
        print(f"找到 {len(parts)} 个结果")
        for p in parts[:5]:  # 只显示前5个
            print(f"   ID={p['id']}, Name={p['name']}, Package={p.get('package', 'N/A')}")
    else:
        print(f"筛选失败: {response.status_code}")
        print(f"响应: {response.text[:200]}")
except Exception as e:
    print(f"筛选异常: {e}")

print("\n=== 测试完成 ===")
