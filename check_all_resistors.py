import sqlite3
import json

conn = sqlite3.connect('db/partshelf.db')
cursor = conn.cursor()

# 查找电阻类别下的所有零件
cursor.execute("SELECT id, name, other, category_id FROM parts WHERE category_id = 1 LIMIT 10")
parts = cursor.fetchall()
print(f"电阻类别下的零件 (共 {len(parts)} 个):")
for part in parts:
    print(f"  ID: {part[0]}, Name: {part[1]}, Category: {part[3]}")
    print(f"    Other: '{part[2]}'")
    if part[2]:
        try:
            params = json.loads(part[2])
            print(f"    Parsed: {json.dumps(params, ensure_ascii=False, indent=2)}")
        except Exception as e:
            print(f"    Parse Error: {e}")

# 检查是否有零件的other字段格式不正确
cursor.execute("SELECT id, name, other FROM parts WHERE other IS NOT NULL AND other != '' AND category_id = 1")
all_parts = cursor.fetchall()
print(f"\n所有有参数的电阻零件 (共 {len(all_parts)} 个):")
for part in all_parts:
    try:
        params = json.loads(part[2])
        if not isinstance(params, dict):
            print(f"  ID: {part[0]}, Name: {part[1]} - 不是字典格式: {type(params)}")
    except Exception as e:
        print(f"  ID: {part[0]}, Name: {part[1]} - JSON解析失败: {e}")
        print(f"    Other: '{part[2]}'")

conn.close()
