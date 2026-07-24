import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_batch_operations():
    """测试批量操作功能"""
    print("=== 测试批量操作功能 ===")
    
    results = []
    
    # 1. 测试导出功能
    print("\n1. 测试CSV导出:")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/export_csv", timeout=10)
        if response.status_code == 200:
            print(f"✓ CSV导出成功，内容长度: {len(response.content)} 字节")
            results.append(("CSV导出", True))
        else:
            print(f"✗ CSV导出失败: {response.status_code}")
            results.append(("CSV导出", False))
    except Exception as e:
        print(f"✗ CSV导出异常: {e}")
        results.append(("CSV导出", False))
    
    # 2. 测试Excel导出
    print("\n2. 测试Excel导出:")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/export_excel", timeout=10)
        if response.status_code == 200:
            print(f"✓ Excel导出成功，内容长度: {len(response.content)} 字节")
            results.append(("Excel导出", True))
        else:
            print(f"✗ Excel导出失败: {response.status_code}")
            results.append(("Excel导出", False))
    except Exception as e:
        print(f"✗ Excel导出异常: {e}")
        results.append(("Excel导出", False))
    
    # 3. 测试导入模板下载
    print("\n3. 测试导入模板下载:")
    try:
        response = requests.get(f"{BASE_URL}/api/inventory/export_template", timeout=10)
        if response.status_code == 200:
            print(f"✓ 导入模板下载成功，内容长度: {len(response.content)} 字节")
            results.append(("导入模板", True))
        else:
            print(f"✗ 导入模板下载失败: {response.status_code}")
            results.append(("导入模板", False))
    except Exception as e:
        print(f"✗ 导入模板下载异常: {e}")
        results.append(("导入模板", False))
    
    return results

if __name__ == "__main__":
    results = test_batch_operations()
    passed = sum(1 for _, ok in results if ok)
    print(f"\n批量操作测试: {passed}/{len(results)} 通过")
