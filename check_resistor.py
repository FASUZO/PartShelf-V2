import sqlite3
import json

conn = sqlite3.connect('db/partshelf.db')
cursor = conn.cursor()

# 查找电阻类别
cursor.execute("SELECT id, name FROM categories WHERE name LIKE '%电阻%'")
categories = cursor.fetchall()
print("电阻类别:")
for cat in categories:
    print(f"  ID: {cat[0]}, Name: {cat[1]}")

if categories:
    cat_id = categories[0][0]
    # 查找该类别下的零件
    cursor.execute("SELECT id, name, other FROM parts WHERE category_id = ? AND other IS NOT NULL AND other != '' LIMIT 5", (cat_id,))
    parts = cursor.fetchall()
    print(f"\n电阻类别下的零件 (category_id={cat_id}):")
    for part in parts:
        print(f"  ID: {part[0]}, Name: {part[1]}")
        print(f"    Other: {part[2]}")
        try:
            params = json.loads(part[2])
            print(f"    Parsed: {json.dumps(params, ensure_ascii=False, indent=2)}")
        except Exception as e:
            print(f"    Parse Error: {e}")

conn.close()
