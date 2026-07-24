import sqlite3
import json

print("=== 添加测试电阻数据 ===\n")

conn = sqlite3.connect('db/partshelf.db')
cursor = conn.cursor()

# 1. 查找电阻类别
cursor.execute("SELECT id, name FROM categories WHERE name LIKE '%电阻%'")
categories = cursor.fetchall()
print(f"电阻类别: {categories}")

if not categories:
    print("未找到电阻类别，退出")
    conn.close()
    exit()

cat_id = categories[0][0]
print(f"使用类别 ID: {cat_id}\n")

# 2. 查找一个现有的电阻零件
cursor.execute("SELECT id, name, part_number, other FROM parts WHERE category_id = ? LIMIT 1", (cat_id,))
existing_part = cursor.fetchone()

if existing_part:
    part_id = existing_part[0]
    part_name = existing_part[1]
    part_number = existing_part[2]
    print(f"找到现有电阻: ID={part_id}, Name={part_name}, Part Number={part_number}")
    
    # 3. 添加参数数据
    params = {
        "阻值": "10K",
        "功率": "0.25W",
        "精度": "1%",
        "温度系数": "50ppm/℃"
    }
    params_json = json.dumps(params, ensure_ascii=False)
    
    cursor.execute("UPDATE parts SET other = ? WHERE id = ?", (params_json, part_id))
    conn.commit()
    print(f"已添加参数: {json.dumps(params, ensure_ascii=False)}\n")
else:
    print("未找到电阻零件，退出")
    conn.close()
    exit()

# 4. 验证参数是否添加成功
cursor.execute("SELECT id, name, other FROM parts WHERE id = ?", (part_id,))
updated_part = cursor.fetchone()
print(f"验证更新后的数据:")
print(f"  ID: {updated_part[0]}")
print(f"  Name: {updated_part[1]}")
print(f"  Other: {updated_part[2]}")

# 5. 测试 get_category_param_values 查询
print("\n=== 测试参数值查询 ===")
cursor.execute("""
    SELECT id, name, other FROM parts 
    WHERE category_id = ? AND other IS NOT NULL AND other != '' AND other != 'None'
""", (cat_id,))
parts_with_params = cursor.fetchall()
print(f"有参数的电阻零件: {len(parts_with_params)} 个")
for part in parts_with_params:
    try:
        params = json.loads(part[2])
        print(f"  ID: {part[0]}, Name: {part[1]}")
        print(f"    Params: {json.dumps(params, ensure_ascii=False)}")
    except Exception as e:
        print(f"  ID: {part[0]}, Name: {part[1]} - 解析失败: {e}")

# 6. 测试搜索功能
print("\n=== 测试搜索功能 ===")
test_searches = ["ESP", "ZX", "U19", "J20"]
for search_key in test_searches:
    cursor.execute("""
        SELECT id, name, part_number FROM parts 
        WHERE name LIKE ? OR part_number LIKE ?
        LIMIT 3
    """, (f'%{search_key}%', f'%{search_key}%'))
    results = cursor.fetchall()
    print(f"搜索 '{search_key}': 找到 {len(results)} 个结果")
    for r in results:
        print(f"    ID={r[0]}, Name={r[1]}, Part Number={r[2]}")

conn.close()
print("\n=== 测试完成 ===")
