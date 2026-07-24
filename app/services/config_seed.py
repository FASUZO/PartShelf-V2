import logging
from sqlalchemy.orm import Session
from app.models.config import Category, Subcategory, ParamTemplate, LocationPrefix, PartIdSequence

logger = logging.getLogger(__name__)

# 34 类行业标准分类（参照《研发电子物料管理规范》）
DEFAULT_CATEGORIES = [
    {"key": "resistor", "name": "电阻", "location_prefix": "R"},
    {"key": "capacitor", "name": "电容", "location_prefix": "C"},
    {"key": "inductor", "name": "电感", "location_prefix": "L"},
    {"key": "transformer", "name": "变压器", "location_prefix": "T"},
    {"key": "ferrite_bead", "name": "磁珠", "location_prefix": "FB"},
    {"key": "transistor", "name": "三极管", "location_prefix": "Q"},
    {"key": "fet_igbt", "name": "FET/IGBT", "location_prefix": "Q"},
    {"key": "diode", "name": "二极管", "location_prefix": "D"},
    {"key": "led", "name": "LED", "location_prefix": "D"},
    {"key": "ic", "name": "集成电路", "location_prefix": "U"},
    {"key": "power_chip", "name": "电源芯片", "location_prefix": "U"},
    {"key": "memory_chip", "name": "存储芯片", "location_prefix": "U"},
    {"key": "sensor_chip", "name": "传感器芯片", "location_prefix": "U"},
    {"key": "processor", "name": "处理器", "location_prefix": "U"},
    {"key": "crystal", "name": "晶振", "location_prefix": "Y"},
    {"key": "switch", "name": "开关", "location_prefix": "SW"},
    {"key": "fuse", "name": "保险丝", "location_prefix": "F"},
    {"key": "filter", "name": "滤波器", "location_prefix": "FL"},
    {"key": "module", "name": "模块", "location_prefix": "U"},
    {"key": "connector", "name": "连接器", "location_prefix": "J"},
    {"key": "antenna", "name": "天线", "location_prefix": "A"},
    {"key": "amplifier", "name": "放大器", "location_prefix": "U"},
    {"key": "speaker", "name": "扬声器", "location_prefix": "SPK"},
    {"key": "microphone", "name": "麦克风", "location_prefix": "MIC"},
    {"key": "camera", "name": "摄像头", "location_prefix": "CAM"},
    {"key": "cable", "name": "连接线", "location_prefix": "W"},
    {"key": "battery_cell", "name": "电芯", "location_prefix": "BT"},
    {"key": "transducer", "name": "换能器", "location_prefix": "TR"},
    {"key": "memory_card", "name": "内存卡", "location_prefix": "SD"},
    {"key": "lcd", "name": "液晶", "location_prefix": "LCD"},
    {"key": "optoelectronic", "name": "光电器件", "location_prefix": "OP"},
    {"key": "optical", "name": "光学元件", "location_prefix": "OPT"},
    {"key": "relay", "name": "继电器", "location_prefix": "K"},
    {"key": "pcb", "name": "PCB板", "location_prefix": "PCB"},
]

DEFAULT_SUBCATEGORIES = {
    "ic": ["单片机", "LDO", "运放", "驱动", "DC-DC", "ADC/DAC", "接口芯片", "逻辑芯片"],
    "power_chip": ["LDO", "DC-DC", "充电管理", "PMIC"],
    "processor": ["MCU", "DSP", "FPGA", "SoC"],
    "crystal": ["TCXO", "无源晶振", "有源晶振"],
    "connector": ["FPC座", "排针", "排母", "USB", "Type-C", "音频座"],
    "led": ["贴片LED", "直插LED", "大功率LED", "RGB LED"],
    "sensor_chip": ["温湿度", "加速度", "陀螺仪", "光电", "气压"],
    "diode": ["整流管", "稳压管", "TVS管", "肖特基"],
    "switch": ["轻触开关", "拨动开关", "旋转开关", "继电器开关"],
    "capacitor": ["陶瓷电容", "电解电容", "钽电容", "薄膜电容"],
    "resistor": ["贴片电阻", "精密电阻", "功率电阻", "热敏电阻"],
    "inductor": ["贴片电感", "功率电感", "共模电感"],
    "filter": ["LC滤波器", "EMI滤波器", "陶瓷滤波器"],
    "module": ["WiFi模块", "蓝牙模块", "4G/5G模块", "GPS模块"],
}

DEFAULT_TEMPLATES = [
    {"category_key": "resistor", "subcategory_name": None, "name": "电阻-主参数", "definition_json": '{"fields":["阻值","功率","封装","精度"]}'},
    {"category_key": "capacitor", "subcategory_name": None, "name": "电容-主参数", "definition_json": '{"fields":["容值","耐压","封装","材质"]}'},
    {"category_key": "inductor", "subcategory_name": None, "name": "电感-主参数", "definition_json": '{"fields":["电感量","额定电流","封装"]}'},
    {"category_key": "ic", "subcategory_name": "单片机", "name": "MCU参数", "definition_json": '{"fields":["内核","Flash","SRAM","主频","IO数"]}'},
    {"category_key": "ic", "subcategory_name": "LDO", "name": "LDO参数", "definition_json": '{"fields":["输入电压","输出电压","输出电流","封装"]}'},
    {"category_key": "ic", "subcategory_name": "DC-DC", "name": "DC-DC参数", "definition_json": '{"fields":["输入电压","输出电压","输出电流","开关频率"]}'},
    {"category_key": "diode", "subcategory_name": None, "name": "二极管-主参数", "definition_json": '{"fields":["反向电压","整流电流","正向压降"]}'},
    {"category_key": "crystal", "subcategory_name": None, "name": "晶振-主参数", "definition_json": '{"fields":["频率","负载电容","精度","封装"]}'},
    {"category_key": "connector", "subcategory_name": None, "name": "连接器-主参数", "definition_json": '{"fields":["Pin数","间距","额定电流"]}'},
    {"category_key": "led", "subcategory_name": None, "name": "LED-主参数", "definition_json": '{"fields":["颜色","正向电压","发光强度","封装"]}'},
]


def seed_default_config(db: Session):
    """种子数据：增量模式，只添加不存在的类别"""
    existing_keys = {c.key for c in db.query(Category.key).all()}
    category_key_to_id = {c.key: c.id for c in db.query(Category).all()}

    # 增量添加新类别
    new_count = 0
    for c in DEFAULT_CATEGORIES:
        if c["key"] not in existing_keys:
            row = Category(key=c["key"], name=c["name"], location_prefix=c.get("location_prefix"))
            db.add(row)
            db.flush()
            category_key_to_id[row.key] = row.id
            new_count += 1
    if new_count:
        logger.info(f"Added {new_count} new categories")

    # 增量添加子类别
    existing_sub_keys = set()
    for s in db.query(Subcategory).all():
        existing_sub_keys.add((s.category_id, s.name))

    subcategory_name_to_id = {}
    # 先加载已有子类别
    for s in db.query(Subcategory).all():
        cat_key = None
        for k, v in category_key_to_id.items():
            if v == s.category_id:
                cat_key = k
                break
        if cat_key:
            subcategory_name_to_id[(cat_key, s.name)] = s.id

    new_sub_count = 0
    for cat_key, names in DEFAULT_SUBCATEGORIES.items():
        cat_id = category_key_to_id.get(cat_key)
        if not cat_id:
            continue
        for name in names:
            if (cat_id, name) not in existing_sub_keys:
                sub = Subcategory(category_id=cat_id, name=name)
                db.add(sub)
                db.flush()
                subcategory_name_to_id[(cat_key, name)] = sub.id
                new_sub_count += 1
    if new_sub_count:
        logger.info(f"Added {new_sub_count} new subcategories")

    # 增量添加参数模板
    existing_tpl_names = {t.name for t in db.query(ParamTemplate.name).all()}

    new_tpl_count = 0
    for t in DEFAULT_TEMPLATES:
        if t["name"] not in existing_tpl_names:
            cat_id = category_key_to_id.get(t["category_key"])
            subcat_id = None
            if t.get("subcategory_name"):
                subcat_id = subcategory_name_to_id.get((t["category_key"], t["subcategory_name"]))
            db.add(ParamTemplate(
                category_id=cat_id,
                subcategory_id=subcat_id,
                name=t["name"],
                definition_json=t["definition_json"],
            ))
            new_tpl_count += 1
    if new_tpl_count:
        logger.info(f"Added {new_tpl_count} new param templates")

    if new_count or new_sub_count or new_tpl_count:
        db.commit()
        logger.info("Config seed update complete.")
    else:
        logger.info("Config data up to date.")

    # 确保所有子类别都有字母分配
    _assign_subcategory_letters(db)

    # 确保所有类别都有 LocationPrefix 条目
    _ensure_location_prefixes(db)


def _assign_subcategory_letters(db: Session):
    """为没有字母的子类别自动分配 A-Z"""
    categories = db.query(Category).all()
    for cat in categories:
        subs = db.query(Subcategory).filter(
            Subcategory.category_id == cat.id
        ).order_by(Subcategory.id.asc()).all()
        used_letters = {s.letter for s in subs if s.letter}
        letter_idx = 0
        changed = False
        for sub in subs:
            if not sub.letter:
                while True:
                    letter = chr(ord('A') + letter_idx)
                    letter_idx += 1
                    if letter not in used_letters:
                        break
                sub.letter = letter
                used_letters.add(letter)
                changed = True
    if changed:
        db.commit()
        logger.info("Assigned letters to subcategories")


def _ensure_location_prefixes(db: Session):
    """确保每个类别都有对应的 LocationPrefix 和 PartIdSequence 条目"""
    categories = db.query(Category).all()
    existing_prefixes = {lp.category_id for lp in db.query(LocationPrefix).all()}
    changed = False
    seq_num = db.query(LocationPrefix).count() + 1
    for cat in categories:
        if cat.id not in existing_prefixes and cat.location_prefix:
            db.add(LocationPrefix(
                category_id=cat.id,
                prefix=cat.location_prefix,
                next_seq=seq_num
            ))
            seq_num += 1
            changed = True
    if changed:
        db.commit()
        logger.info("Initialized location prefixes")
