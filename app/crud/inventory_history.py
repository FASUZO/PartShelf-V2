from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from app.models.inventory_history import InventoryHistory

def create_inventory_history(
    db: Session,
    part_id: int,
    operation_type: str,
    quantity_change: int,
    quantity_before: int,
    quantity_after: int,
    remark: str = None
) -> InventoryHistory:
    """创建库存操作历史记录"""
    history = InventoryHistory(
        part_id=part_id,
        operation_type=operation_type,
        quantity_change=quantity_change,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        remark=remark
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history

def get_inventory_history_by_part_id(
    db: Session,
    part_id: int,
    limit: int = 50,
    offset: int = 0
) -> List[InventoryHistory]:
    """获取指定零件的库存历史记录"""
    return db.query(InventoryHistory).filter(
        InventoryHistory.part_id == part_id
    ).order_by(desc(InventoryHistory.created_at)).offset(offset).limit(limit).all()

def get_all_inventory_history(
    db: Session,
    limit: int = 100,
    offset: int = 0,
    operation_type: Optional[str] = None
) -> List[InventoryHistory]:
    """获取所有库存历史记录"""
    query = db.query(InventoryHistory)
    if operation_type:
        query = query.filter(InventoryHistory.operation_type == operation_type)
    return query.order_by(desc(InventoryHistory.created_at)).offset(offset).limit(limit).all()

def get_inventory_history_count(db: Session, part_id: Optional[int] = None) -> int:
    """获取历史记录总数"""
    query = db.query(InventoryHistory)
    if part_id:
        query = query.filter(InventoryHistory.part_id == part_id)
    return query.count()
