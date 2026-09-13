"""
零件编号生成服务
格式: {位号前缀}{两位数字}{单英文}{4位数字}
示例: R01A0001 = 电阻 + 序号01 + 子类别A + 零件序号0001
"""
import logging
import threading
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.config import Category, Subcategory, LocationPrefix, PartIdSequence

logger = logging.getLogger(__name__)

# 编号生成锁（防止并发生成重复编号）
_part_id_lock = threading.Lock()

# 生成唯一编号的最大尝试次数（遇冲突自动跳过序号继续）
_MAX_ATTEMPTS = 10


def _get_category_seq(db: Session, category_id: int, prefix: str) -> int:
    """获取类别序号（两位数字部分）。不存在时按当前最大值+1 分配，避免删除后重号。"""
    lp = db.query(LocationPrefix).filter(LocationPrefix.category_id == category_id).first()
    if not lp:
        max_seq = db.query(func.max(LocationPrefix.next_seq)).scalar() or 0
        lp = LocationPrefix(category_id=category_id, prefix=prefix, next_seq=max_seq + 1)
        db.add(lp)
        db.flush()
    return lp.next_seq


def _get_subcategory_letter(db: Session, subcategory_id: int | None) -> str:
    """获取子类别字母，非法或缺失时回退为 A。"""
    if subcategory_id:
        sub = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
        if sub and sub.letter and len(sub.letter) == 1 and sub.letter.isalpha():
            return sub.letter.upper()
    return "A"


def _next_part_seq(db: Session, category_id: int, subcategory_id: int | None) -> tuple[PartIdSequence, int]:
    """取当前零件序号并将计数器+1，返回 (序号记录, 本次序号)。"""
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
    seq_record.next_seq = part_seq + 1
    db.flush()
    return seq_record, part_seq


def generate_part_number(db: Session, category_id: int, subcategory_id: int | None = None) -> str:
    """
    生成零件编号（线程安全，内部保证唯一）
    - category_id: 必填，用于获取前缀和序号
    - subcategory_id: 可选，用于获取子类别字母
    - 与现有零件编号冲突时自动递增序号重试，最多 _MAX_ATTEMPTS 次
    """
    # 规范化：0 与 None 视为同一个子类别维度
    subcategory_id = subcategory_id or None

    with _part_id_lock:
        # 获取类别信息
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise ValueError("Category %d not found" % category_id)

        prefix = (category.location_prefix or "X").strip() or "X"
        category_seq = _get_category_seq(db, category_id, prefix)
        sub_letter = _get_subcategory_letter(db, subcategory_id)

        # 延迟导入，避免循环依赖
        from app.models.part import Part

        for attempt in range(_MAX_ATTEMPTS):
            _, part_seq = _next_part_seq(db, category_id, subcategory_id)
            part_number = "%s%02d%s%04d" % (prefix, category_seq, sub_letter, part_seq)

            # 唯一性校验：与现有零件（含手动编号）冲突则跳过该序号继续
            exists = db.query(Part.id).filter(Part.part_number == part_number).first()
            if not exists:
                logger.info("Generated part number: %s", part_number)
                return part_number

            logger.warning("Part number %s already exists, advancing sequence (attempt %d)",
                           part_number, attempt + 1)

        raise RuntimeError(
            "Failed to generate a unique part number for category %d after %d attempts"
            % (category_id, _MAX_ATTEMPTS)
        )
