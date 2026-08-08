import logging
from sqlalchemy.orm import Session
from app.models.config import Category, Subcategory, ParamTemplate, LocationPrefix, PartIdSequence

logger = logging.getLogger(__name__)

# 34 类行业标准分类（参照《研发电子物料管理规范》）
DEFAULT_CATEGORIES = [
    {"key": "resistor", "name": "电阻", "location_prefix": "R"},
    {"key": "capacitor", "name": "电容", "location_prefix": "C"},
    {"key": "inductor", "name": "电感", "location_prefix": "L"},
    {"key": "diode", "name": "二极管", "location_prefix": "D"},
    {"key": "ferrite_bead", "name": "磁珠", "location_prefix": "FB"},
    {"key": "transistor", "name": "三极管", "location_prefix": "Q"},
    {"key": "fet_igbt", "name": "FET/IGBT", "location_prefix": "Q"},
    {"key": "transformer", "name": "变压器", "location_prefix": "T"},
    {"key": "protection", "name": "保护器件", "location_prefix": "F"},           # 合并了 Fuse, TVS, ESD 等
    {"key": "ic", "name": "集成电路", "location_prefix": "U"},               # 包含光耦、逻辑、接口等
    {"key": "power_chip", "name": "电源芯片", "location_prefix": "U"},
    {"key": "memory_chip", "name": "存储芯片", "location_prefix": "U"},
    {"key": "sensor_chip", "name": "传感器芯片", "location_prefix": "U"},
    {"key": "amplifier", "name": "运算放大器", "location_prefix": "U"},
    {"key": "processor", "name": "处理器", "location_prefix": "U"},
    {"key": "crystal", "name": "晶振", "location_prefix": "Y"},
    {"key": "switch", "name": "开关", "location_prefix": "SW"},
    {"key": "filter", "name": "滤波器", "location_prefix": "FL"},
    {"key": "module", "name": "模块", "location_prefix": "U"},
    {"key": "connector", "name": "连接器", "location_prefix": "J"},
    {"key": "cable", "name": "连接线", "location_prefix": "W"},
    {"key": "battery_cell", "name": "电池/电芯", "location_prefix": "BT"},
    {"key": "electroacoustic_display", "name": "声光显示器件", "location_prefix": "DS"}, # 蜂鸣器, 喇叭, 屏幕
    {"key": "led", "name": "LED", "location_prefix": "LED"},                 # 发光二极管
    {"key": "pcb", "name": "PCB板", "location_prefix": "PCB"},
    {"key": "pcba", "name": "PCBA", "location_prefix": "PCBA"},
]

DEFAULT_SUBCATEGORIES = {
    "resistor": ["贴片电阻", "精密电阻", "功率电阻", "热敏电阻", "压敏电阻", "排阻", "其他"],
    "capacitor": ["陶瓷电容", "铝电解电容", "钽电容", "薄膜电容", "超级电容", "其他"],
    "inductor": ["贴片电感", "功率电感", "共模电感", "色环电感", "其他"],
    "transformer": ["高频变压器", "隔离变压器", "脉冲变压器", "网络变压器", "环形变压器", "音频变压器", "其他"],
    "ferrite_bead": ["贴片磁珠", "功率磁珠", "插件磁珠", "高频磁珠", "其他"],
    "transistor": ["NPN三极管", "PNP三极管", "达林顿管", "带阻三极管", "其他"],
    "fet_igbt": ["N沟道MOSFET", "P沟道MOSFET", "IGBT单管", "IGBT模块", "氮化镓晶体管", "碳化硅晶体管", "其他"],
    "diode": ["整流二极管", "稳压二极管", "肖特基二极管", "快恢复二极管", "其他"],
    "protection": ["熔断保险丝", "自恢复保险丝", "TVS瞬态抑制管", "ESD静电保护管", "气体放电管", "其他"],
    "ic": ["光电耦合器", "隔离器", "逻辑芯片", "接口芯片", "ADC转换器", "DAC转换器", "电平转换芯片", "其他"],
    "power_chip": ["LDO稳压器", "DCDC开关电源", "锂电池充电管理", "PMIC电源管理", "锂电保护芯片", "其他"],
    "amplifier": ["通用运放", "精密运放", "高速运放", "低功耗运放", "仪表放大器", "功率放大器", "音频放大器", "其他"],
    "processor": ["MCU", "DSP", "FPGA", "SoC", "其他"],
    "crystal": ["无源晶体", "有源晶体振荡器", "温补晶振TCXO", "恒温晶振OCXO", "其他"],
    "memory_chip": ["EEPROM", "SPI Flash", "NAND Flash", "SRAM", "DRAM", "eMMC", "其他"],
    "sensor_chip": ["温湿度传感器", "加速度计", "陀螺仪IMU", "环境光传感器", "气压传感器", "霍尔传感器", "电流传感器", "其他"],
    "switch": ["轻触开关", "拨动开关", "旋转开关", "拨码开关", "信号继电器", "功率继电器", "固态继电器", "其他"],
    "filter": ["LC滤波器", "EMI电源滤波器", "SAW声表面波滤波器", "其他"],
    "module": ["WiFi模块", "蓝牙模块", "蜂窝通信模块", "GNSS定位模块", "电源模块", "其他"],
    "connector": ["FPC插座", "排针排母", "USB接口", "TypeC接口", "音频插座", "接线端子", "板对板连接器", "其他"],
    "cable": ["端子线", "排线", "同轴线", "屏蔽线", "硅胶线", "USB线", "网络线", "其他"],
    "battery_cell": ["锂离子电芯", "磷酸铁锂电芯", "聚合物电芯", "镍氢电池", "铅酸电池", "圆柱电芯", "软包电芯", "方形电芯", "其他"],
    "electroacoustic_display": ["蜂鸣器", "扬声器", "数码管", "LCD显示屏", "OLED显示屏", "触摸屏", "其他"],
    "led": ["贴片单色LED", "RGB发光二极管", "红外发射管", "紫外LED", "其他"],
    "pcb": ["裸板", "光板", "其他"],
    "pcba": ["半成品板", "成品板", "其他"],
}

DEFAULT_TEMPLATES = [
    # 无源器件
    {"category_key": "resistor", "subcategory_name": None, "name": "电阻-通用参数", "definition_json": '{"fields":["阻值","额定功率","封装","精度","温漂"]}'},
    {"category_key": "capacitor", "subcategory_name": None, "name": "电容-通用参数", "definition_json": '{"fields":["容值","耐压","封装","材质介质","精度"]}'},
    {"category_key": "inductor", "subcategory_name": None, "name": "电感-通用参数", "definition_json": '{"fields":["电感量","额定电流","饱和电流","直流电阻","封装"]}'},
    {"category_key": "transformer", "subcategory_name": None, "name": "变压器-通用参数", "definition_json": '{"fields":["变比","初级电感量","额定功率","工作频率","隔离电压","封装尺寸"]}'},
    {"category_key": "ferrite_bead", "subcategory_name": None, "name": "磁珠-通用参数", "definition_json": '{"fields":["阻抗@100MHz","额定电流","直流电阻","封装"]}'},
    {"category_key": "filter", "subcategory_name": None, "name": "滤波器-通用参数", "definition_json": '{"fields":["中心频率/截止频率","带外抑制","插入损耗","输入输出阻抗","封装"]}'},
    
    # 半导体分立器件与保护
    {"category_key": "diode", "subcategory_name": None, "name": "二极管-通用参数", "definition_json": '{"fields":["反向耐压","正向电流","正向压降","封装"]}'},
    {"category_key": "transistor", "subcategory_name": None, "name": "三极管-通用参数", "definition_json": '{"fields":["极性","集电极耐压","集电极电流","放大倍数","特征频率","封装"]}'},
    {"category_key": "fet_igbt", "subcategory_name": None, "name": "场效应管/IGBT-通用参数", "definition_json": '{"fields":["器件类型","漏源耐压","漏极电流","导通内阻","开启电压","封装"]}'},
    {"category_key": "protection", "subcategory_name": None, "name": "保护器件-通用参数", "definition_json": '{"fields":["保护类型","关断电压/额定电流","钳位电压/熔断电压","响应时间","封装"]}'},
    
    # 声光、显示与 LED
    {"category_key": "led", "subcategory_name": None, "name": "LED发光二极管参数", "definition_json": '{"fields":["发光颜色","正向电压","工作电流","发光强度/波长","封装"]}'},
    {"category_key": "electroacoustic_display", "subcategory_name": "OLED显示屏", "name": "显示屏参数", "definition_json": '{"fields":["屏幕尺寸","分辨率","接口协议","驱动IC","工作电压"]}'},
    {"category_key": "electroacoustic_display", "subcategory_name": None, "name": "声光器件-通用参数", "definition_json": '{"fields":["器件类型","工作电压","额定电流","声压级/显示尺寸","封装尺寸"]}'},

    # 集成电路 IC
    {"category_key": "amplifier", "subcategory_name": None, "name": "运算放大器参数", "definition_json": '{"fields":["通道数","增益带宽积","压摆率","输入失调电压","工作电压","封装"]}'},
    {"category_key": "ic", "subcategory_name": "光电耦合器", "name": "光耦参数", "definition_json": '{"fields":["隔离电压","电流传输比CTR","输出类型","工作温度","封装"]}'},
    {"category_key": "ic", "subcategory_name": None, "name": "通用集成电路参数", "definition_json": '{"fields":["功能描述","逻辑系列/接口协议","工作电压","工作温度","封装"]}'},
    {"category_key": "processor", "subcategory_name": "MCU", "name": "MCU微控制器参数", "definition_json": '{"fields":["内核架构","Flash容量","SRAM容量","主频","GPIO引脚数","封装"]}'},
    {"category_key": "power_chip", "subcategory_name": "LDO稳压器", "name": "LDO参数", "definition_json": '{"fields":["输入电压","输出电压","最大输出电流","压差电压","静态电流","封装"]}'},
    {"category_key": "power_chip", "subcategory_name": "DCDC开关电源", "name": "DCDC参数", "definition_json": '{"fields":["输入电压","输出电压","最大输出电流","开关频率","拓扑架构","封装"]}'},
    {"category_key": "memory_chip", "subcategory_name": None, "name": "存储芯片参数", "definition_json": '{"fields":["存储类型","容量","接口类型","工作电压","封装"]}'},
    {"category_key": "sensor_chip", "subcategory_name": None, "name": "传感器芯片参数", "definition_json": '{"fields":["传感器类型","通讯接口","测量范围","精度","工作电压","封装"]}'},

    # 结构件、连接与线束
    {"category_key": "crystal", "subcategory_name": None, "name": "晶振-通用参数", "definition_json": '{"fields":["标称频率","负载电容","频率偏差","工作温度","封装尺寸"]}'},
    {"category_key": "connector", "subcategory_name": None, "name": "连接器-通用参数", "definition_json": '{"fields":["Pin引脚数","间距","安装方式","额定电流","额定电压"]}'},
    {"category_key": "cable", "subcategory_name": None, "name": "线束线缆-通用参数", "definition_json": '{"fields":["线材规格/AWG","线长","接口/端子型号","耐温/耐压等级","芯数"]}'},
    {"category_key": "switch", "subcategory_name": None, "name": "开关与继电器参数", "definition_json": '{"fields":["动作类型","触点形式","控制电压/额定电流","机械寿命","封装尺寸"]}'},
    {"category_key": "module", "subcategory_name": None, "name": "无线/电源模块参数", "definition_json": '{"fields":["模块功能","主芯片","通信协议/输出参数","供电电压","模块尺寸"]}'},
    {"category_key": "battery_cell", "subcategory_name": None, "name": "电池电芯-通用参数", "definition_json": '{"fields":["标称电压","标称容量","放电倍率","组合方式/封装","尺寸规格"]}'},
    {"category_key": "pcb", "subcategory_name": None, "name": "PCB板-通用参数", "definition_json": '{"fields":["层数","板厚","板材类型","表面处理","铜厚"]}'},
    {"category_key": "pcba", "subcategory_name": None, "name": "PCBA板-通用参数", "definition_json": '{"fields":["版本号","SMT贴片工艺","主控MCU型号","输入电压范围"]}'}
]

def seed_default_config(db: Session):
    """种子数据：增量模式，只添加不存在的类别"""
    existing_keys = {c.key for c in db.query(Category.key).all()}
    category_key_to_id = {c.key: c.id for c in db.query(Category).all()}

    # 增量添加新类别
    new_count = 0
    # 计算当前最大排序值，新类别追加到末尾
    from sqlalchemy import func as sa_func
    max_order = db.query(sa_func.max(Category.sort_order)).scalar() or 0
    for c in DEFAULT_CATEGORIES:
        if c["key"] not in existing_keys:
            max_order += 1
            row = Category(key=c["key"], name=c["name"], location_prefix=c.get("location_prefix"), sort_order=max_order)
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

    # 清理重复的子类别
    _cleanup_duplicate_subcategories(db)

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


def _cleanup_duplicate_subcategories(db: Session):
    """清理重复的子类别（保留第一个，删除后续重复）"""
    from sqlalchemy import func

    # 查找重复的子类别（同类别下同名）
    duplicates = db.query(
        Subcategory.category_id,
        Subcategory.name,
        func.min(Subcategory.id).label('keep_id'),
        func.count(Subcategory.id).label('cnt')
    ).group_by(
        Subcategory.category_id,
        Subcategory.name
    ).having(func.count(Subcategory.id) > 1).all()

    if not duplicates:
        return

    deleted_count = 0
    for dup in duplicates:
        # 删除除 keep_id 以外的重复记录
        deleted = db.query(Subcategory).filter(
            Subcategory.category_id == dup.category_id,
            Subcategory.name == dup.name,
            Subcategory.id != dup.keep_id
        ).delete(synchronize_session=False)
        deleted_count += deleted

    if deleted_count:
        db.commit()
        logger.info(f"Cleaned up {deleted_count} duplicate subcategories")
