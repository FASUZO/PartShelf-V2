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
    return db.query(Part).options(
        joinedload(Part.manufacturer),
        joinedload(Part.type),
        joinedload(Part.package),
        joinedload(Part.inventory)
    ).filter(Part.name.ilike(f'%{search_key}%')).all()

def delete_part(db: Session, part_to_delete: Part):
    # 先删除相关的库存记录
    if part_to_delete.inventory:
        db.delete(part_to_delete.inventory)
    
    # 删除零件
    db.delete(part_to_delete)
    db.commit()