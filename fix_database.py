import sqlite3
import json

print("=== 修复数据库中的 'None' 字符串问题 ===\n")

conn = sqlite3.connect('db/partshelf.db')
cursor = conn.cursor()

# 1. 查找所有 other 字段为 'None' 的记录
cursor.execute("SELECT id, name, other FROM parts WHERE other = 'None'")
none_parts = cursor.fetchall()
print(f"找到 {len(none_parts)} 个 other='None' 的记录")

# 2. 修复这些记录
if none_parts:
    cursor.execute("UPDATE parts SET other = NULL WHERE other = 'None'")
    conn.commit()
    print(f"已修复 {len(none_parts)} 条记录\n")

# 3. 查找所有 other 字段不是有效 JSON 的记录
cursor.execute("SELECT id, name, other FROM parts WHERE other IS NOT NULL AND other != ''")
all_parts = cursor.fetchall()
invalid_parts = []
for part in all_parts:
    try:
        json.loads(part[2])
    except:
        invalid_parts.append(part)

print(f"找到 {len(invalid_parts)} 个 other 字段不是有效 JSON 的记录")
for part in invalid_parts:
    print(f"  ID: {part[0]}, Name: {part[1]}, Other: '{part[2][:50]}...'")

# 4. 修复无效的 JSON 记录
if invalid_parts:
    for part in invalid_parts:
        cursor.execute("UPDATE parts SET other = NULL WHERE id = ?", (part[0],))
    conn.commit()
    print(f"已修复 {len(invalid_parts)} 条记录\n")

# 5. 验证修复结果
cursor.execute("SELECT COUNT(*) FROM parts WHERE other IS NULL")
null_count = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM parts WHERE other IS NOT NULL AND other != ''")
valid_count = cursor.fetchone()[0]

print(f"修复后统计:")
print(f"  other 为 NULL: {null_count}")
print(f"  other 有值: {valid_count}")

# 6. 测试搜索功能
print("\n=== 测试搜索功能 ===\n")

# 测试搜索 part_number
cursor.execute("SELECT id, name, part_number FROM parts WHERE part_number IS NOT NULL LIMIT 5")
parts_with_number = cursor.fetchall()
print(f"有 part_number 的零件: {len(parts_with_number)} 个")
for part in parts_with_number:
    print(f"  ID: {part[0]}, Name: {part[1]}, Part Number: {part[2]}")

# 7. 测试参数筛选
print("\n=== 测试参数筛选 ===\n")

cursor.execute("SELECT id, name, other, category_id FROM parts WHERE other IS NOT NULL AND other != '' LIMIT 5")
parts_with_params = cursor.fetchall()
print(f"有参数的零件: {len(parts_with_params)} 个")
for part in parts_with_params:
    try:
        params = json.loads(part[2])
        print(f"  ID: {part[0]}, Name: {part[1]}, Category: {part[3]}")
        print(f"    Params: {json.dumps(params, ensure_ascii=False)}")
    except Exception as e:
        print(f"  ID: {part[0]}, Name: {part[1]} - 解析失败: {e}")

conn.close()
print("\n=== 修复完成 ===")
