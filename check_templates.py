import sqlite3
import json

conn = sqlite3.connect('db/partshelf.db')
cursor = conn.cursor()

# 查看所有类别
print("=== 所有类别 ===")
cursor.execute("SELECT id, name, key FROM categories ORDER BY id")
categories = cursor.fetchall()
for cat in categories:
    print(f"ID: {cat[0]}, Name: {cat[1]}, Key: {cat[2]}")

print("\n=== 参数模板 ===")
cursor.execute("SELECT id, category_id, subcategory_id, name, definition_json FROM param_templates ORDER BY category_id")
templates = cursor.fetchall()
for tpl in templates:
    print(f"\n模板ID: {tpl[0]}, 类别ID: {tpl[1]}, 子类别ID: {tpl[2]}, 名称: {tpl[3]}")
    try:
        def_json = json.loads(tpl[4])
        print(f"  定义: {json.dumps(def_json, ensure_ascii=False, indent=2)}")
    except:
        print(f"  原始JSON: {tpl[4]}")

print("\n=== 各类别参数值示例 ===")
cursor.execute("""
    SELECT category_id, other 
    FROM parts 
    WHERE other IS NOT NULL AND other != '' AND other != 'None'
    LIMIT 20
""")
parts = cursor.fetchall()
for part in parts:
    print(f"\n类别ID: {part[0]}")
    try:
        data = json.loads(part[1])
        if 'fields' in data and 'values' in data:
            print(f"  新格式: {json.dumps(data, ensure_ascii=False)}")
        else:
            print(f"  旧格式: {json.dumps(data, ensure_ascii=False)}")
    except:
        print(f"  解析失败: {part[1][:100]}")

conn.close()
