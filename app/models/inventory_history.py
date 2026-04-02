from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from db.database import Base

class InventoryHistory(Base):
    """库存操作历史记录表"""
    __tablename__ = "inventory_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    part_id = Column(Integer, ForeignKey("parts.id"), nullable=False, index=True)
    operation_type = Column(String(20), nullable=False)  # 'in'入库, 'out'出库, 'adjust'调整
    quantity_change = Column(Integer, nullable=False)  # 数量变化（正数增加，负数减少）
    quantity_before = Column(Integer, nullable=False)  # 操作前数量
    quantity_after = Column(Integer, nullable=False)  # 操作后数量
    remark = Column(Text, nullable=True)  # 备注
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # 关联零件
    part = relationship("Part", back_populates="inventory_history")

    def __repr__(self):
        return f"<InventoryHistory(id={self.id}, part_id={self.part_id}, type={self.operation_type}, change={self.quantity_change})>"
