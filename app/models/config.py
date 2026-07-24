from sqlalchemy import Column, Integer, String, Text, DateTime, func
from db.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    location_prefix = Column(String(8), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class Subcategory(Base):
    __tablename__ = "subcategories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, nullable=False, index=True)
    name = Column(String(128), nullable=False, index=True)
    letter = Column(String(1), nullable=True, index=True)  # 自动分配 A-Z
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class ParamTemplate(Base):
    __tablename__ = "param_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, nullable=True, index=True)
    subcategory_id = Column(Integer, nullable=True, index=True)
    name = Column(String(128), nullable=False)
    definition_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class LocationPrefix(Base):
    __tablename__ = "location_prefixes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, nullable=True, index=True)
    prefix = Column(String(8), nullable=False, index=True)
    next_seq = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class PartIdSequence(Base):
    """跟踪每个类别+子类别的零件序号（4位数字部分）"""
    __tablename__ = "part_id_sequences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, nullable=False, index=True)
    subcategory_id = Column(Integer, nullable=True, index=True)
    next_seq = Column(Integer, nullable=False, default=1)


class SystemConfig(Base):
    """系统配置键值表（MQTT 等）"""
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(64), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
