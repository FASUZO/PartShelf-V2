"""
迁移脚本：为现有零件分配分类(category_id)和编号(part_number)
基于 type_name → (category_key, subcategory_name) 映射
"""
import logging
from sqlalchemy.orm import Session
from app.models.part import Part
from app.models.type import Type
from app.models.config import Category, Subcategory
from app.services.part_id_service import generate_part_number

logger = logging.getLogger(__name__)

# type_name → (category_key, subcategory_name | None)
TYPE_TO_CATEGORY = {
    # 电阻
    "贴片电阻": ("resistor", "贴片电阻"),
    "可调电阻/电位器": ("resistor", None),
    "电流采样电阻/分流器": ("resistor", "精密电阻"),
    # 电容
    "贴片电容(MLCC)": ("capacitor", "陶瓷电容"),
    "直插铝电解电容": ("capacitor", "电解电容"),
    "贴片型铝电解电容": ("capacitor", "电解电容"),
    "超级电容器": ("capacitor", None),
    # 电感
    "贴片电感": ("inductor", "贴片电感"),
    "功率电感": ("inductor", "功率电感"),
    # 晶振
    "无源晶振": ("crystal", "无源晶振"),
    "有源晶振": ("crystal", "有源晶振"),
    # 保险丝
    "自恢复保险丝": ("fuse", None),
    # 开关
    "轻触开关": ("switch", "轻触开关"),
    "按键开关": ("switch", "轻触开关"),
    "多功能开关": ("switch", None),
    "滑动开关": ("switch", None),
    # LED
    "发光二极管/LED": ("led", "贴片LED"),
    "RGB LED": ("led", "RGB LED"),
    "红外发射管": ("optoelectronic", None),
    # 二极管
    "肖特基二极管": ("diode", "肖特基"),
    "稳压二极管": ("diode", "稳压管"),
    "通用二极管": ("diode", "整流管"),
    "开关二极管": ("diode", None),
    "快恢复/高效率二极管": ("diode", "整流管"),
    "静电和浪涌保护(TVS/ESD)": ("diode", "TVS管"),
    # 三极管/FET
    "三极管(BJT)": ("transistor", None),
    "场效应管(MOSFET)": ("fet_igbt", None),
    # IC - 单片机/处理器
    "单片机(MCU/MPU/SOC)": ("ic", "单片机"),
    # IC - 电源
    "线性稳压器(LDO)": ("ic", "LDO"),
    "DC-DC电源芯片": ("ic", "DC-DC"),
    "电池管理": ("power_chip", "充电管理"),
    # IC - 运放/比较器
    "运算放大器": ("ic", "运放"),
    "比较器": ("ic", "运放"),
    "电流感应放大器": ("amplifier", None),
    "音频功率放大器": ("amplifier", None),
    # IC - ADC/DAC
    "模数转换芯片ADC": ("ic", "ADC/DAC"),
    "电能计量芯片": ("ic", "ADC/DAC"),
    # IC - 接口
    "RS-485/RS-422芯片": ("ic", "接口芯片"),
    "RS232芯片": ("ic", "接口芯片"),
    "CAN收发器": ("ic", "接口芯片"),
    "USB集线器": ("ic", "接口芯片"),
    # IC - 逻辑
    "逻辑门": ("ic", "逻辑芯片"),
    "信号开关/编解码器/多路复用器": ("ic", "逻辑芯片"),
    "模拟开关/多路复用器": ("ic", "逻辑芯片"),
    "移位寄存器": ("ic", "逻辑芯片"),
    # IC - 驱动
    "缓冲器/驱动器/收发器": ("ic", "驱动"),
    "栅极驱动芯片": ("ic", "驱动"),
    "数码管驱动": ("ic", "驱动"),
    # IC - 其他
    "电压基准芯片": ("ic", None),
    "监控和复位芯片": ("ic", None),
    "实时时钟(RTC)": ("ic", None),
    # 存储
    "EEPROM": ("memory_chip", None),
    "NOR FLASH": ("memory_chip", None),
    # 传感器
    "温度传感器": ("sensor_chip", "温湿度"),
    "温湿度传感器": ("sensor_chip", "温湿度"),
    "人体感应传感器": ("sensor_chip", None),
    # 连接器
    "排针": ("connector", "排针"),
    "排母": ("connector", "排母"),
    "线对板针座": ("connector", "排针"),
    "USB连接器": ("connector", "USB"),
    "FFC/FPC连接器": ("connector", "FPC座"),
    "FFC连接线(柔性扁平线缆)": ("connector", "FPC座"),
    "HDMI连接器": ("connector", None),
    "DC电源连接器": ("connector", None),
    "以太网连接器(RJ45 RJ11)": ("connector", None),
    "SD卡/存储卡连接器": ("connector", None),
    "纽扣与条形电池连接器": ("connector", None),
    "螺钉式接线端子": ("connector", None),
    "RF射频同轴连接器": ("connector", None),
    # 模块
    "WiFi模块": ("module", "WiFi模块"),
    "蓝牙模块": ("module", "蓝牙模块"),
    "AC-DC电源模块": ("module", None),
    "隔离电源模块": ("module", None),
    # 天线
    "天线": ("antenna", None),
    # 线缆
    "杜邦线/端子排线/电子线": ("cable", None),
    "电源线/刹车线/延长线": ("cable", None),
    # 换能器
    "蜂鸣器": ("transducer", None),
}


def migrate_existing_parts(db: Session):
    """为没有分类的零件分配 category_id, subcategory_id 和 part_number"""
    # 构建查找索引
    categories = {c.key: c for c in db.query(Category).all()}
    subcategories = {}
    for s in db.query(Subcategory).all():
        if s.category_id not in subcategories:
            subcategories[s.category_id] = {}
        subcategories[s.category_id][s.name] = s

    types = {t.id: t.part_type for t in db.query(Type).all()}

    parts = db.query(Part).filter(Part.part_number.is_(None)).all()
    logger.info(f"Found {len(parts)} parts without part_number")

    updated = 0
    skipped = 0
    for part in parts:
        type_name = types.get(part.type_id)
        if not type_name or type_name not in TYPE_TO_CATEGORY:
            skipped += 1
            continue

        cat_key, sub_name = TYPE_TO_CATEGORY[type_name]
        cat = categories.get(cat_key)
        if not cat:
            skipped += 1
            continue

        # 查找 subcategory_id
        subcat_id = None
        if sub_name and cat.id in subcategories and sub_name in subcategories[cat.id]:
            subcat_id = subcategories[cat.id][sub_name].id

        # 更新分类
        part.category_id = cat.id
        part.subcategory_id = subcat_id

        # 生成编号
        try:
            part.part_number = generate_part_number(db, cat.id, subcat_id)
            updated += 1
        except Exception as e:
            logger.warning(f"Failed to generate part_number for part {part.id}: {e}")
            skipped += 1

    db.commit()
    logger.info(f"Migration complete: {updated} updated, {skipped} skipped")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    from app.main import app
    from db.database import SessionLocal
    db = SessionLocal()
    migrate_existing_parts(db)
    db.close()
