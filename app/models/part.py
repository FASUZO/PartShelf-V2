from db.database import Base
from sqlalchemy import Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

class Part(Base):
    __tablename__ = "parts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)  # 移除 unique=True
    description = Column(String(255), nullable=True) 
    manufacturer_id = Column(Integer, ForeignKey("manufacturers.id"))
    package_id = Column(Integer, ForeignKey("packages.id"))
    type_id = Column(Integer, ForeignKey("types.id"))
    price = Column(String(50), nullable=True)  # 单价
    lc_number = Column(String(100), nullable=True)  # LC编号
    other = Column(String(255), nullable=True)  # 其他信息

    # 组合唯一约束：名称+制造商+封装
    __table_args__ = (
        UniqueConstraint('name', 'manufacturer_id', 'package_id', name='uix_part_name_manufacturer_package'),
    )

    manufacturer = relationship("Manufacturer", back_populates="parts")
    package= relationship("Package", back_populates="parts")
    type = relationship("Type", back_populates="parts")
    inventory = relationship("Inventory", back_populates="part", uselist=False)
    inventory_history = relationship("InventoryHistory", back_populates="part")
