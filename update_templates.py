import sqlite3
import json

print("=== 更新参数模板，添加单位定义 ===\n")

conn = sqlite3.connect('db/partshelf.db')
cursor = conn.cursor()

# 定义各类别的单位映射
unit_mappings = {
    # 电阻
    1: {
        "fields": ["阻值", "功率", "精度"],
        "units": {
            "阻值": "kΩ",
            "功率": "W",
            "精度": "%"
        }
    },
    # 电容
    2: {
        "fields": ["容值", "耐压"],
        "units": {
            "容值": "μF",
            "耐压": "V"
        }
    },
    # 电感
    3: {
        "fields": ["电感量", "额定电流"],
        "units": {
            "电感量": "mH",
            "额定电流": "A"
        }
    },
    # 集成电路 - MCU (子类别1)
    4: {
        "subcategory_id": 1,
        "fields": ["内核", "Flash", "SRAM", "主频", "IO数"],
        "units": {
            "Flash": "KB",
            "SRAM": "KB",
            "主频": "MHz"
        }
    },
    # 集成电路 - LDO (子类别2)
    4: {
        "subcategory_id": 2,
        "fields": ["输入电压", "输出电压", "输出电流"],
        "units": {
            "输入电压": "V",
            "输出电压": "V",
            "输出电流": "A"
        }
    },
    # 二极管
    5: {
        "fields": ["反向电压", "整流电流", "正向压降"],
        "units": {
            "反向电压": "V",
            "整流电流": "A",
            "正向压降": "V"
        }
    },
    # 晶振
    7: {
        "fields": ["频率", "负载电容", "精度"],
        "units": {
            "频率": "MHz",
            "负载电容": "pF",
            "精度": "ppm"
        }
    },
    # 连接器
    20: {
        "fields": ["Pin数", "间距", "额定电流"],
        "units": {
            "间距": "mm",
            "额定电流": "A"
        }
    }
}

# 更新参数模板
cursor.execute("SELECT id, category_id, subcategory_id, name, definition_json FROM param_templates")
templates = cursor.fetchall()

updated_count = 0
for tpl in templates:
    tpl_id = tpl[0]
    cat_id = tpl[1]
    subcat_id = tpl[2]
    name = tpl[3]
    def_json = tpl[4]
    
    try:
        def_data = json.loads(def_json)
    except:
        print(f"跳过模板 {name} (ID: {tpl_id}): JSON解析失败")
        continue
    
    # 获取对应的单位映射
    unit_mapping = unit_mappings.get(cat_id)
    
    # 如果是集成电路类别，需要根据子类别选择不同的映射
    if cat_id == 4 and subcat_id:
        for key, mapping in unit_mappings.items():
            if key == 4 and mapping.get('subcategory_id') == subcat_id:
                unit_mapping = mapping
                break
    
    if not unit_mapping:
        print(f"跳过模板 {name} (ID: {tpl_id}): 没有对应的单位映射")
        continue
    
    # 检查是否已经有单位定义
    if 'units' in def_data:
        print(f"跳过模板 {name} (ID: {tpl_id}): 已有单位定义")
        continue
    
    # 更新定义
    def_data['units'] = unit_mapping.get('units', {})
    
    # 保存更新
    new_def_json = json.dumps(def_data, ensure_ascii=False)
    cursor.execute(
        "UPDATE param_templates SET definition_json = ? WHERE id = ?",
        (new_def_json, tpl_id)
    )
    
    print(f"更新模板 {name} (ID: {tpl_id}):")
    print(f"  添加单位: {json.dumps(def_data['units'], ensure_ascii=False)}")
    updated_count += 1

conn.commit()
print(f"\n=== 更新完成，共更新 {updated_count} 个模板 ===")

# 验证更新结果
print("\n=== 验证更新结果 ===")
cursor.execute("SELECT id, category_id, name, definition_json FROM param_templates ORDER BY category_id")
templates = cursor.fetchall()
for tpl in templates:
    try:
        def_data = json.loads(tpl[3])
        units = def_data.get('units', {})
        if units:
            print(f"模板 {tpl[2]} (ID: {tpl[0]}): {json.dumps(units, ensure_ascii=False)}")
    except:
        pass

conn.close()
