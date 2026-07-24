import subprocess
import sys
import time

def run_all_tests():
    """运行所有测试"""
    print("=" * 60)
    print("PartShelf V2 项目功能及稳定性检测")
    print("=" * 60)
    
    tests = [
        ("服务器启动测试", "test_scripts/test_01_server.py"),
        ("库存管理测试", "test_scripts/test_02_inventory.py"),
        ("配置管理测试", "test_scripts/test_03_config.py"),
        ("参数筛选测试", "test_scripts/test_04_filter.py"),
        ("批量操作测试", "test_scripts/test_05_batch.py"),
        ("历史记录测试", "test_scripts/test_06_history.py"),
        ("稳定性测试", "test_scripts/test_07_stability.py"),
        ("页面加载性能测试", "test_scripts/test_08_load_performance.py"),
        ("操作流畅度测试", "test_scripts/test_09_fluency.py"),
    ]
    
    results = []
    
    for test_name, test_file in tests:
        print(f"\n{'=' * 60}")
        print(f"运行测试: {test_name}")
        print(f"{'=' * 60}")
        
        try:
            result = subprocess.run(
                [sys.executable, test_file],
                capture_output=True,
                text=True,
                timeout=120  # 120秒超时
            )
            
            if result.returncode == 0:
                print(f"✓ {test_name} 通过")
                results.append((test_name, True))
            else:
                print(f"✗ {test_name} 失败")
                print(f"错误输出: {result.stderr[:200]}")
                results.append((test_name, False))
        except subprocess.TimeoutExpired:
            print(f"✗ {test_name} 超时")
            results.append((test_name, False))
        except Exception as e:
            print(f"✗ {test_name} 异常: {e}")
            results.append((test_name, False))
    
    # 生成测试报告
    print("\n" + "=" * 60)
    print("测试报告")
    print("=" * 60)
    
    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    
    print(f"\n测试结果: {passed}/{total} 通过")
    print(f"通过率: {passed/total*100:.1f}%")
    
    print("\n详细结果:")
    for test_name, ok in results:
        status = "✓ 通过" if ok else "✗ 失败"
        print(f"  {test_name}: {status}")
    
    if passed == total:
        print("\n🎉 所有测试通过！项目功能正常。")
    else:
        print(f"\n⚠️  {total - passed} 个测试失败，请检查相关功能。")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
