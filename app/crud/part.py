from sqlalchemy.orm import Session
from app.models.inventory import Inventory
from app.models.package import Package
from app.models.part import Part
from sqlalchemy.orm import joinedload


def get_part_by_name(db: Session, name: str):
    
    db_part= db.query(Part).filter(Part.name == name).first()
    return db_part

def get_part_by_name_manufacturer_package(db: Session, name: str, manufacturer_id: int, package_id: int):
    """按名称+制造商+封装组合查找零件"""
    db_part = db.query(Part).filter(
        Part.name == name,
        Part.manufacturer_id == manufacturer_id,
        Part.package_id == package_id
    ).first()
    return db_part
        

def create_part(db: Session, new_part: Part):
    db.add(new_part)
    db.commit()
    db.refresh(new_part)
    return new_part

def get_all_parts(db: Session, limit = 0):
    return db.query(Part).options(
        joinedload(Part.manufacturer),
        joinedload(Part.type),
        joinedload(Part.package),
        joinedload(Part.inventory)
    ).all()

def get_part_by_id(db: Session, id: int):
    
    db_part= db.query(Part).filter(Part.id == id).first()
    return db_part

def get_parts_containing_key(db: Session, search_key: str):
    """搜索零件（支持名称、编号模糊匹配，支持?和%通配符）"""
    # 将?转换为_（SQL通配符，匹配单个字符）
    # 将*转换为%（SQL通配符，匹配任意字符）
    search_pattern = search_key.replace('?', '_').replace('*', '%')
    # 如果没有通配符，则添加%进行模糊匹配
    if '%' not in search_pattern and '_' not in search_pattern:
        search_pattern = f'%{search_pattern}%'
    
    return db.query(Part).options(
        joinedload(Part.manufacturer),
        joinedload(Part.type),
        joinedload(Part.package),
        joinedload(Part.inventory)
    ).filter(
        (Part.name.ilike(search_pattern)) | (Part.part_number.ilike(search_pattern))
    ).all()

def delete_part(db: Session, part_to_delete: Part):
    # 先删除相关的库存记录
    if part_to_delete.inventory:
        db.delete(part_to_delete.inventory)
    
    # 删除零件
    db.delete(part_to_delete)
    db.commit()

def update_part(db: Session, part: Part):
    """更新零件信息"""
    db.commit()
    db.refresh(part)
    return part