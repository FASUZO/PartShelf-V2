import sys
sys.path.insert(0, '.')

from db.database import get_db
from app.crud.part import get_parts_containing_key
from app.services.inventory_service import InventoryService

print("=== 测试函数 ===\n")

# 获取数据库会话
db = next(get_db())

# 1. 测试搜索函数
print("1. 测试搜索函数:")
try:
    results = get_parts_containing_key(db, "ESP")
    print(f"   搜索 'ESP': 找到 {len(results)} 个结果")
    for r in results[:2]:
        print(f"      ID={r.id}, Name={r.name}, Part Number={r.part_number}")
except Exception as e:
    print(f"   搜索 'ESP' 失败: {e}")
    import traceback
    traceback.print_exc()

# 2. 测试获取零件详情
print("\n2. 测试获取零件详情:")
try:
    result = InventoryService.get_part_by_id(db, 157)
    print(f"   获取零件 157: 成功")
    print(f"      ID: {result.id}")
    print(f"      Name: {result.name}")
    print(f"      Other: {result.other}")
except Exception as e:
    print(f"   获取零件 157 失败: {e}")
    import traceback
    traceback.print_exc()

# 3. 测试类别参数值查询
print("\n3. 测试类别参数值查询:")
try:
    result = InventoryService.get_category_param_values(db, 1)
    print(f"   电阻类别参数值: {result}")
except Exception as e:
    print(f"   查询失败: {e}")
    import traceback
    traceback.print_exc()

db.close()
print("\n=== 测试完成 ===")
