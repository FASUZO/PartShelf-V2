import requests
import json

BASE_URL = "http://127.0.0.1:8000"

print("=== 测试电阻类别参数筛选 ===\n")

# 1. 获取类别参数值
print("1. 获取电阻类别参数值:")
try:
    response = requests.get(f"{BASE_URL}/api/inventory/category_param_values", params={"category_id": 1})
    if response.status_code == 200:
        param_values = response.json()
        print(f"   参数值: {json.dumps(param_values, ensure_ascii=False, indent=2)}")
        
        # 检查是否有封装字段
        if '封装' in param_values:
            print(f"   ✓ 封装字段存在，值: {param_values['封装']}")
        else:
            print(f"   ✗ 封装字段不存在")
        
        # 检查其他字段
        for field in ['阻值', '功率', '精度']:
            if field in param_values:
                print(f"   ✓ {field}字段存在，值: {param_values[field]}")
            else:
                print(f"   ✗ {field}字段不存在")
    else:
        print(f"   ✗ 查询失败: {response.status_code}")
except Exception as e:
    print(f"   ✗ 查询异常: {e}")

# 2. 测试参数筛选
print("\n2. 测试参数筛选:")
filter_data = {
    "category_id": 1,
    "param_filters": {
        "封装": "0402"
    }
}
try:
    response = requests.post(f"{BASE_URL}/api/inventory/advanced_search", json=filter_data)
    if response.status_code == 200:
        result = response.json()
        parts = result.get("data", [])
        print(f"   筛选封装=0402: 找到 {len(parts)} 个结果")
        for p in parts[:3]:  # 只显示前3个
            print(f"      ID={p['id']}, Name={p['name']}, Package={p.get('package', 'N/A')}")
    else:
        print(f"   ✗ 筛选失败: {response.status_code}")
        print(f"      响应: {response.text[:200]}")
except Exception as e:
    print(f"   ✗ 筛选异常: {e}")

# 3. 测试参数模板
print("\n3. 测试参数模板:")
try:
    response = requests.get(f"{BASE_URL}/api/config/bundle")
    if response.status_code == 200:
        bundle = response.json()
        templates = [t for t in bundle.get('param_templates', []) if t.get('category_id') == 1]
        if templates:
            tpl = templates[0]
            print(f"   模板名称: {tpl['name']}")
            try:
                def_json = json.loads(tpl['definition_json'])
                print(f"   字段: {def_json.get('fields', [])}")
                print(f"   单位: {json.dumps(def_json.get('units', {}), ensure_ascii=False)}")
            except Exception as e:
                print(f"   ✗ JSON解析失败: {e}")
        else:
            print(f"   ✗ 未找到电阻类别模板")
    else:
        print(f"   ✗ 查询失败: {response.status_code}")
except Exception as e:
    print(f"   ✗ 查询异常: {e}")

print("\n=== 测试完成 ===")
