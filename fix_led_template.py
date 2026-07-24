import sqlite3
import json

print("=== 修复LED参数模板 ===\n")

conn = sqlite3.connect('db/partshelf.db')
cursor = conn.cursor()

# 修复LED模板
cursor.execute("SELECT id, definition_json FROM param_templates WHERE id = 10")
tpl = cursor.fetchone()

if tpl:
    print(f"原始JSON: {tpl[1]}")
    
    # 修复JSON格式
    fixed_json = {
        "fields": ["颜色", "正向电压", "发光强度"],
        "units": {
            "正向电压": "V",
            "发光强度": "mcd"
        }
    }
    
    cursor.execute(
        "UPDATE param_templates SET definition_json = ? WHERE id = 10",
        (json.dumps(fixed_json, ensure_ascii=False),)
    )
    
    print(f"修复后: {json.dumps(fixed_json, ensure_ascii=False)}")

conn.commit()

# 验证修复结果
print("\n=== 验证修复结果 ===")
cursor.execute("SELECT id, category_id, name, definition_json FROM param_templates WHERE id = 10")
tpl = cursor.fetchone()
if tpl:
    try:
        def_data = json.loads(tpl[3])
        print(f"LED模板 (ID: {tpl[0]}): {json.dumps(def_data, ensure_ascii=False, indent=2)}")
    except Exception as e:
        print(f"解析失败: {e}")

conn.close()
print("\n=== 修复完成 ===")
