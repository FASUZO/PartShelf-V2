import requests
import json

BASE_URL = "http://127.0.0.1:8000"

print("=== 测试获取零件详情 ===\n")

try:
    response = requests.get(f"{BASE_URL}/api/inventory/get_part_by_id", params={"part_id": 157})
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.text}")
except Exception as e:
    print(f"异常: {e}")

print("\n=== 测试高级筛选 ===\n")

filter_data = {
    "category_id": 1,
    "param_filters": {
        "阻值": "10K"
    }
}

try:
    response = requests.post(f"{BASE_URL}/api/inventory/advanced_search", json=filter_data)
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.text}")
except Exception as e:
    print(f"异常: {e}")

print("\n=== 测试搜索 R01A ===\n")

try:
    response = requests.get(f"{BASE_URL}/api/inventory/search", params={"search_key": "R01A"})
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.text}")
except Exception as e:
    print(f"异常: {e}")
