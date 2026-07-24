import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_config_operations():
    """测试配置管理操作"""
    print("=== 测试配置管理功能 ===")
    
    results = []
    
    # 1. 测试获取配置包
    print("\n1. 测试获取配置包:")
    try:
        response = requests.get(f"{BASE_URL}/api/config/bundle", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 获取配置包成功")
            print(f"   - 类别: {len(data.get('categories', []))} 个")
            print(f"   - 子类别: {len(data.get('subcategories', []))} 个")
            print(f"   - 参数模板: {len(data.get('param_templates', []))} 个")
            results.append(("获取配置包", True))
        else:
            print(f"✗ 获取配置包失败: {response.status_code}")
            results.append(("获取配置包", False))
    except Exception as e:
        print(f"✗ 获取配置包异常: {e}")
        results.append(("获取配置包", False))
    
    # 2. 测试获取类别列表
    print("\n2. 测试获取类别列表:")
    try:
        response = requests.get(f"{BASE_URL}/api/config/bundle", timeout=5)
        if response.status_code == 200:
            data = response.json()
            categories = data.get('categories', [])
            print(f"✓ 获取类别列表成功，共 {len(categories)} 个类别")
            for cat in categories[:5]:
                print(f"   - {cat.get('name', 'N/A')} (ID: {cat.get('id', 'N/A')})")
            results.append(("获取类别列表", True))
        else:
            print(f"✗ 获取类别列表失败: {response.status_code}")
            results.append(("获取类别列表", False))
    except Exception as e:
        print(f"✗ 获取类别列表异常: {e}")
        results.append(("获取类别列表", False))
    
    # 3. 测试参数模板
    print("\n3. 测试参数模板:")
    try:
        response = requests.get(f"{BASE_URL}/api/config/bundle", timeout=5)
        if response.status_code == 200:
            data = response.json()
            templates = data.get('param_templates', [])
            print(f"✓ 获取参数模板成功，共 {len(templates)} 个模板")
            for tpl in templates[:3]:
                print(f"   - {tpl.get('name', 'N/A')}")
                try:
                    def_json = json.loads(tpl.get('definition_json', '{}'))
                    print(f"     字段: {def_json.get('fields', [])}")
                except:
                    pass
            results.append(("参数模板", True))
        else:
            print(f"✗ 获取参数模板失败: {response.status_code}")
            results.append(("参数模板", False))
    except Exception as e:
        print(f"✗ 获取参数模板异常: {e}")
        results.append(("参数模板", False))
    
    return results

if __name__ == "__main__":
    results = test_config_operations()
    passed = sum(1 for _, ok in results if ok)
    print(f"\n配置管理测试: {passed}/{len(results)} 通过")
