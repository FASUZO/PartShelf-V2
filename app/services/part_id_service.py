"""
零件编号生成服务
格式: {位号前缀}{两位数字}{单英文}{4位数字}
示例: R01A0001 = 电阻 + 序号01 + 子类别A + 零件序号0001
"""
import logging
from sqlalchemy.orm import Session
from app.models.config import Category, Subcategory, LocationPrefix, PartIdSequence

logger = logging.getLogger(__name__)


def generate_part_number(db: Session, category_id: int, subcategory_id: int | None = None) -> str:
    """
    生成零件编号
    - category_id: 必填，用于获取前缀和序号
    - subcategory_id: 可选，用于获取子类别字母
    """
    # 获取类别信息
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise ValueError(f"Category {category_id} not found")

    prefix = category.location_prefix or "X"

    # 获取类别序号（两位数字）
    lp = db.query(LocationPrefix).filter(LocationPrefix.category_id == category_id).first()
    if not lp:
        # 如果没有 LocationPrefix 条目，创建一个
        max_seq = db.query(LocationPrefix).count() + 1
        lp = LocationPrefix(category_id=category_id, prefix=prefix, next_seq=max_seq)
        db.add(lp)
        db.flush()
    category_seq = lp.next_seq

    # 获取子类别字母
    sub_letter = "A"  # 默认
    if subcategory_id:
        sub = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
        if sub and sub.letter:
            sub_letter = sub.letter

    # 获取零件序号（4位数字）
    seq_record = db.query(PartIdSequence).filter(
        PartIdSequence.category_id == category_id,
        PartIdSequence.subcategory_id == subcategory_id
    ).first()

    if not seq_record:
        seq_record = PartIdSequence(
            category_id=category_id,
            subcategory_id=subcategory_id,
            next_seq=1
        )
        db.add(seq_record)
        db.flush()

    part_seq = seq_record.next_seq

    # 生成编号
    part_number = f"{prefix}{category_seq:02d}{sub_letter}{part_seq:04d}"

    # 递增序号
    seq_record.next_seq = part_seq + 1
    db.commit()

    logger.info(f"Generated part number: {part_number}")
    return part_number
