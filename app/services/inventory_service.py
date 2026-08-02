"""
库存管理服务模块
提供库存相关的业务逻辑处理，包括：
- 零件添加和查询
- 库存更新（入库/出库/调整）
- 高级筛选和排序
- 库存历史记录
"""

import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from app.crud.inventory import create_inventory, get_inventory_by_part_id, update_inventory_quantity
from app.crud.manufacturer import get_manufacturer_by_name, create_manufacturer
from app.crud.package import get_package_by_name, create_part_package
from app.crud.part import create_part, get_part_by_id, get_part_by_name, get_parts_containing_key
from app.crud.type import get_type_by_name, create_part_type
from app.crud.inventory_history import create_inventory_history
from app.models.part import Part
from app.models.inventory import Inventory
from app.models.manufacturer import Manufacturer
from app.models.package import Package
from app.models.type import Type
from app.models.config import Category, Subcategory
from app.schemas.inventory import PartDetailsFlatGet, PartInventoryFlatGet, PartInventoryQuantity, PartInventoryQuantityUpdate, PartToInventoryAdd, PartInventoryFilter

from app.services.mqtt_service import publish_event

logger = logging.getLogger("partshelf.inventory")


def _parse_param_number(val: str) -> float:
    """解析参数值中的数字，支持单位后缀如 100R, 1K, 1uF, 0.25W"""
    import re
    if not val:
        raise ValueError("empty value")
    val = str(val).strip()
    # 提取数字部分和单位部分
    m = re.match(r'^([0-9]*\.?[0-9]+)\s*([kKmMuUnNpP]?)', val)
    if not m:
        raise ValueError(f"cannot parse: {val}")
    num = float(m.group(1))
    suffix = m.group(2).upper()
    multipliers = {'K': 1000, 'M': 1000000, 'U': 0.000001, 'N': 0.000000001, 'P': 0.000000000001}
    if suffix in multipliers:
        num *= multipliers[suffix]
    return num


class InventoryService:
    """库存服务类 - 处理所有库存相关业务逻辑"""
    
    # 字段映射字典 - 用于排序功能
    _FIELD_MAPPING = {
        "name": Part.name,
        "part_type": Type.part_type,
        "package": Package.package_type,
        "quantity": Inventory.quantity_available,
        "id": Part.id,
        "manufacturer": Manufacturer.name
    }
    
    # 类别/子类别名称缓存（避免每次查询都访问 DB）
    _category_name_cache: dict = {}
    _subcategory_name_cache: dict = {}

    @staticmethod
    def _get_category_name(db: Session, category_id: int) -> str | None:
        if not category_id:
            return None
        if category_id not in InventoryService._category_name_cache:
            cat = db.query(Category).filter(Category.id == category_id).first()
            InventoryService._category_name_cache[category_id] = cat.name if cat else None
        return InventoryService._category_name_cache[category_id]

    @staticmethod
    def _get_subcategory_name(db: Session, subcategory_id: int) -> str | None:
        if not subcategory_id:
            return None
        if subcategory_id not in InventoryService._subcategory_name_cache:
            sub = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()
            InventoryService._subcategory_name_cache[subcategory_id] = sub.name if sub else None
        return InventoryService._subcategory_name_cache[subcategory_id]

    @staticmethod
    def _parse_price(price_str: str) -> float | None:
        """解析价格字符串，支持批量采购格式如 '0.06@100'"""
        if not price_str:
            return None
        try:
            # 处理批量采购格式：提取@前面的价格部分
            if '@' in str(price_str):
                price_part = str(price_str).split('@')[0]
                return float(price_part)
            return float(price_str)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _create_part_inventory_flat_get(part: Part, db: Session = None) -> PartInventoryFlatGet:
        """创建零件库存扁平化对象（统一数据格式）"""
        cat_name = None
        subcat_name = None
        if db and getattr(part, 'category_id', None):
            cat_name = InventoryService._get_category_name(db, part.category_id)
        if db and getattr(part, 'subcategory_id', None):
            subcat_name = InventoryService._get_subcategory_name(db, part.subcategory_id)
        return PartInventoryFlatGet(
            id=part.id,
            part_number=getattr(part, 'part_number', None),
            name=part.name,
            manufacturer=part.manufacturer.name if part.manufacturer else None,
            part_type=part.type.part_type if part.type else None,
            package=part.package.package_type if part.package else None,
            quantity=part.inventory.quantity_available if part.inventory else None,
            description=part.description if part.description else None,
            price=InventoryService._parse_price(part.price),
            price_display=str(part.price) if part.price else None,
            lc_number=part.lc_number,
            other=part.other,
            category_id=getattr(part, 'category_id', None),
            subcategory_id=getattr(part, 'subcategory_id', None),
            category_name=cat_name,
            subcategory_name=subcat_name
        )

    @staticmethod
    def add_part_to_inventory(db: Session, part: PartToInventoryAdd, record_history: bool = True):
        """
        添加零件到库存
        - 自动创建或获取制造商、封装、类型
        - 按名称+制造商+封装组合查找零件，避免重复
        - 如枟零件已存在，则增加库存数量
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Adding part: {part.name}, manufacturer: {part.manufacturer}, package: {part.package}")
        
        if part.quantity < 0:
            raise HTTPException(
                status_code=status.HTTP_406_NOT_ACCEPTABLE,
                detail="Cannot add new part with negative quantity"
            )

        # 获取或创建制造商、封装、类型
        db_manufacturer = get_manufacturer_by_name(db, part.manufacturer)
        if not db_manufacturer:
            db_manufacturer = create_manufacturer(db, part.manufacturer)
            logger.info(f"Created manufacturer: {part.manufacturer}")
           
        db_package = get_package_by_name(db, part.package)
        if not db_package:
            db_package = create_part_package(db, part.package)
            logger.info(f"Created package: {part.package}")

        db_type = get_type_by_name(db, part.part_type)
        if not db_type:
            db_type = create_part_type(db, part.part_type)
            logger.info(f"Created type: {part.part_type}")

        # 按名称+制造商+封装组合查找零件
        from app.crud.part import get_part_by_name_manufacturer_package
        db_part = get_part_by_name_manufacturer_package(db, part.name, db_manufacturer.id, db_package.id)
        
        if not db_part:
            logger.info(f"Creating new part: {part.name}")
            # 生成零件编号
            part_number = None
            if part.category_id:
                try:
                    from app.services.part_id_service import generate_part_number
                    part_number = generate_part_number(db, part.category_id, part.subcategory_id)
                except Exception as e:
                    logger.warning(f"Failed to generate part_number: {e}")

            # 创建零件（create_part会处理编号重复情况）
            db_part = create_part(db, Part(
                part_number=part_number,
                name=part.name,
                description=part.description,
                manufacturer_id=db_manufacturer.id,
                package_id=db_package.id,
                type_id=db_type.id,
                price=str(part.price) if part.price is not None else None,
                lc_number=part.lc_number,
                other=part.other,
                category_id=part.category_id,
                subcategory_id=part.subcategory_id
            ))
        else:
            logger.info(f"Found existing part ID: {db_part.id}, updating quantity")

        # 处理库存
        db_inventory = get_inventory_by_part_id(db, db_part.id)
        if not db_inventory:
            logger.info(f"Creating inventory for part {db_part.id}")
            db_inventory = Inventory(
                part_id=db_part.id,
                quantity_available=part.quantity
            )
            create_inventory(db, db_inventory)
        else:
            logger.info(f"Updating inventory for part {db_part.id}: {db_inventory.quantity_available} -> {db_inventory.quantity_available + part.quantity}")
            InventoryService.update_inventory_quantity(
                db,
                PartInventoryQuantityUpdate(part_id=db_part.id, quantity=part.quantity),
                remark=f"添加零件时自动增加库存",
                record_history=record_history
            )

        # 发送MQTT通知
        try:
            import json
            payload = json.dumps({
                "part_id": db_part.id,
                "name": part.name,
                "manufacturer": part.manufacturer,
                "package": part.package,
                "quantity": db_inventory.quantity_available
            }, ensure_ascii=False)
            publish_event("inventory.add", payload)
        except Exception:
            pass

        return part

    @staticmethod
    def update_inventory_quantity(db: Session, inventory_quantity: PartInventoryQuantityUpdate, remark: str = None, record_history: bool = True):
        """
        更新库存数量
        - operation_mode: add(增加) / subtract(减少) / set(直接设置)
        - 自动记录库存变更历史
        """
        db_inventory = get_inventory_by_part_id(db, inventory_quantity.part_id)
        if not db_inventory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory record not found."
            )

        # 记录操作前数量
        quantity_before = db_inventory.quantity_available

        # 根据操作模式计算新数量
        if inventory_quantity.operation_mode == "add":
            # 增加模式
            new_quantity = db_inventory.quantity_available + inventory_quantity.quantity
            operation_type = "in"
            quantity_change = inventory_quantity.quantity
        elif inventory_quantity.operation_mode == "subtract":
            # 减少模式
            new_quantity = db_inventory.quantity_available - inventory_quantity.quantity
            operation_type = "out"
            quantity_change = -inventory_quantity.quantity
        else:  # "set" 或默认模式
            # 直接设置模式
            new_quantity = inventory_quantity.quantity
            operation_type = "adjust"
            quantity_change = new_quantity - quantity_before

        # 检查库存是否足够（仅对减少模式）
        if inventory_quantity.operation_mode == "subtract" and new_quantity < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough stock to remove {abs(inventory_quantity.quantity)} items. Available: {db_inventory.quantity_available}"
            )

        # 检查新数量是否为负数
        if new_quantity < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quantity cannot be negative. Calculated quantity: {new_quantity}"
            )

        # 更新库存
        db_inventory.quantity_available = new_quantity
        update_inventory_quantity(db, db_inventory)

        # 记录历史
        if record_history:
            create_inventory_history(
                db=db,
                part_id=inventory_quantity.part_id,
                operation_type=operation_type,
                quantity_change=quantity_change,
                quantity_before=quantity_before,
                quantity_after=new_quantity,
                remark=remark
            )
        
        try:
            publish_event("inventory.update", f'{"part_id": {inventory_quantity.part_id}, "new_quantity": {db_inventory.quantity_available}}')
        except Exception:
            pass

        return PartInventoryQuantity(updatedQuantity = db_inventory.quantity_available)



    @staticmethod
    def get_parts_inventory_list(db: Session, page: int = 1, page_size: int = 100, sort_field: str = None, sort_direction: str = "asc") -> Dict[str, Any]:
        """
        获取零件库存列表（支持分页和排序）
        - page: 页码
        - page_size: 每页数量
        - sort_field: 排序字段
        - sort_direction: 排序方向 (asc/desc)
        """
        offset = (page - 1) * page_size
        
        # 构建查询
        query = db.query(Part)
        
        # 根据排序字段添加必要的JOIN
        if sort_field == "part_type":
            query = query.join(Type)
        elif sort_field == "package":
            query = query.join(Package)
        elif sort_field == "manufacturer":
            query = query.join(Manufacturer)
        elif sort_field == "quantity":
            query = query.join(Inventory)
        
        # 应用排序
        if sort_field:
            field = InventoryService._FIELD_MAPPING.get(sort_field, Part.id)
            if sort_direction == "desc":
                query = query.order_by(field.desc())
            else:
                query = query.order_by(field.asc())
        else:
            query = query.order_by(Part.id.asc())
        
        # 获取分页数据
        total_count = query.count()
        parts = query.offset(offset).limit(page_size).all()
        
        # 使用通用方法创建结果
        result = [InventoryService._create_part_inventory_flat_get(part, db) for part in parts]
        
        # 返回分页结果
        return {
            "data": result,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": (total_count + page_size - 1) // page_size
            }
        }


    @staticmethod
    def get_part_by_id(db: Session, id: int) -> PartDetailsFlatGet:
        """根据ID获取零件详情"""
        part_found = get_part_by_id(db, id)
        if part_found is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Part with id = {id} does not exist"
            )
        
        flat_get = InventoryService._create_part_inventory_flat_get(part_found, db)
        return PartDetailsFlatGet(**flat_get.dict())
        

    @staticmethod
    def search(search_key: str, db: Session) -> List[PartInventoryFlatGet]:
        """搜索零件（模糊匹配）"""
        parts_list = get_parts_containing_key(db, search_key)
        return [InventoryService._create_part_inventory_flat_get(part, db) for part in parts_list]
    
    @staticmethod
    def delete_part_with_id(part_id: int, db: Session):
        """删除指定零件及其库存记录"""
        from app.crud.part import delete_part
        part_to_delete = get_part_by_id(db, part_id)
        if part_to_delete is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Part to delete with id = {part_id} does not exist"
            )

        # 保存零件信息用于通知
        part_name = part_to_delete.name

        delete_part(db, part_to_delete)

        # 发送MQTT通知
        try:
            import json
            payload = json.dumps({
                "part_id": part_id,
                "name": part_name
            }, ensure_ascii=False)
            publish_event("inventory.delete", payload)
        except Exception:
            pass

    @staticmethod
    def update_part(db: Session, part_id: int, name: str, manufacturer: str, package: str, price: str = None, lc_number: str = None, description: str = None, other: str = None, part_number: str = None):
        """更新零件信息"""
        from app.crud.part import update_part, get_part_by_part_number
        from app.crud.manufacturer import get_manufacturer_by_name, create_manufacturer
        from app.crud.package import get_package_by_name, create_part_package
        from sqlalchemy.exc import IntegrityError

        part = get_part_by_id(db, part_id)
        if part is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Part with id = {part_id} does not exist"
            )

        # 获取或创建制造商
        db_manufacturer = get_manufacturer_by_name(db, manufacturer)
        if not db_manufacturer:
            db_manufacturer = create_manufacturer(db, manufacturer)

        # 获取或创建封装
        db_package = get_package_by_name(db, package)
        if not db_package:
            db_package = create_part_package(db, package)

        # 处理手动指定的编号
        if part_number is not None and part_number.strip():
            # 检查编号唯一性（排除自身）
            existing = get_part_by_part_number(db, part_number.strip())
            if existing and existing.id != part_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"零件编号 {part_number} 已存在"
                )
            part.part_number = part_number.strip()
        # 如果编号为空且没有手动指定，自动生成
        elif not part.part_number and part.category_id:
            try:
                from app.services.part_id_service import generate_part_number
                for attempt in range(3):
                    try:
                        new_part_number = generate_part_number(db, part.category_id, part.subcategory_id)
                        # 检查编号是否已存在
                        if not get_part_by_part_number(db, new_part_number):
                            part.part_number = new_part_number
                            break
                        logger.warning(f"Part number {new_part_number} already exists, retrying...")
                    except Exception as e:
                        logger.warning(f"Attempt {attempt + 1} failed: {e}")
                        if attempt == 2:
                            raise
            except Exception as e:
                logger.warning(f"Failed to generate part_number: {e}")
        
        # 更新零件信息
        part.name = name
        part.manufacturer_id = db_manufacturer.id
        part.package_id = db_package.id
        part.price = price if price else None
        part.lc_number = lc_number if lc_number else None
        part.description = description if description else None
        
        # 处理 other 字段：确保是有效的JSON或None
        if other and other.strip() and other.strip() != 'None':
            try:
                import json as _json
                # 验证是否为有效JSON
                _json.loads(other)
                part.other = other
            except (ValueError, TypeError):
                part.other = None
        else:
            part.other = None
        
        try:
            db.commit()
            db.refresh(part)
        except IntegrityError as e:
            if 'part_number' in str(e):
                db.rollback()
                # 清除编号重试
                part.part_number = None
                db.commit()
                db.refresh(part)
            else:
                raise
        
        return {"success": True, "message": "零件更新成功"}

    @staticmethod
    def fix_missing_part_numbers(db: Session):
        """批量为无编号的零件生成编号"""
        from app.services.part_id_service import generate_part_number
        from app.crud.part import get_part_by_part_number

        # 查询无编号且有类别ID的零件
        parts = db.query(Part).filter(
            Part.part_number.is_(None),
            Part.category_id.isnot(None)
        ).all()

        fixed = 0
        skipped = 0
        errors = []

        for part in parts:
            try:
                for attempt in range(3):
                    try:
                        new_number = generate_part_number(db, part.category_id, part.subcategory_id)
                        if not get_part_by_part_number(db, new_number):
                            part.part_number = new_number
                            fixed += 1
                            break
                    except Exception as e:
                        if attempt == 2:
                            raise
            except Exception as e:
                logger.warning(f"Failed to generate part_number for part {part.id}: {e}")
                skipped += 1
                errors.append(f"零件 {part.name} (ID:{part.id}): {str(e)}")

        # 查询无类别ID的零件数量
        no_category_count = db.query(Part).filter(Part.category_id.is_(None)).count()

        db.commit()

        return {
            "success": True,
            "fixed": fixed,
            "skipped": skipped,
            "no_category_count": no_category_count,
            "errors": errors[:10],  # 只返回前10个错误
            "message": f"修复完成: {fixed}个已修复, {skipped}个跳过, {no_category_count}个无类别"
        }

    @staticmethod
    def get_database_report(db: Session, include_details: bool = False):
        """生成数据库健康检查报告"""
        from sqlalchemy import func, text
        from app.models.manufacturer import Manufacturer
        from app.models.package import Package

        report = {}

        # 零件总数
        report["total_parts"] = db.query(Part).count()

        # 无编号的零件
        report["no_part_number"] = db.query(Part).filter(Part.part_number.is_(None)).count()

        # 无类别ID的零件
        report["no_category_id"] = db.query(Part).filter(Part.category_id.is_(None)).count()

        # 无子类别ID的零件
        report["no_subcategory_id"] = db.query(Part).filter(
            Part.part_number.isnot(None),
            Part.subcategory_id.is_(None)
        ).count()

        # 重复编号检查
        duplicate_numbers = db.execute(text(
            "SELECT part_number, COUNT(*) as cnt FROM parts WHERE part_number IS NOT NULL GROUP BY part_number HAVING cnt > 1"
        )).fetchall()
        report["duplicate_numbers"] = [{"part_number": row[0], "count": row[1]} for row in duplicate_numbers]

        # 孤立库存记录
        orphaned_inventory = db.execute(text(
            "SELECT COUNT(*) FROM inventories WHERE part_id NOT IN (SELECT id FROM parts)"
        )).scalar()
        report["orphaned_inventory"] = orphaned_inventory

        # 各类别零件统计
        category_stats = db.execute(text(
            "SELECT c.name, COUNT(p.id) as cnt FROM categories c LEFT JOIN parts p ON c.id = p.category_id GROUP BY c.id, c.name ORDER BY cnt DESC"
        )).fetchall()
        report["category_stats"] = [{"category": row[0], "count": row[1]} for row in category_stats]

        # 无类别的零件
        uncategorized = db.execute(text(
            "SELECT COUNT(*) FROM parts WHERE category_id IS NULL"
        )).scalar()
        report["uncategorized_parts"] = uncategorized

        # 库存记录总数
        report["total_inventory"] = db.query(Inventory).count()

        # 历史记录总数
        from app.models.inventory_history import InventoryHistory
        report["total_history"] = db.query(InventoryHistory).count()

        # LocationPrefix 状态
        from app.models.config import LocationPrefix, PartIdSequence, Category, Subcategory
        location_prefixes = db.query(LocationPrefix).all()
        report["location_prefixes"] = [
            {"category_id": lp.category_id, "prefix": lp.prefix, "next_seq": lp.next_seq}
            for lp in location_prefixes
        ]

        # PartIdSequence 状态
        part_sequences = db.query(PartIdSequence).all()
        report["part_id_sequences"] = [
            {"category_id": ps.category_id, "subcategory_id": ps.subcategory_id, "next_seq": ps.next_seq}
            for ps in part_sequences
        ]

        # 详细数据（用于导出）
        if include_details:
            # 构建查找字典
            categories = {c.id: c.name for c in db.query(Category).all()}
            subcategories = {s.id: s.name for s in db.query(Subcategory).all()}
            manufacturers = {m.id: m.name for m in db.query(Manufacturer).all()}
            packages = {p.id: p.package_type for p in db.query(Package).all()}

            # 无编号零件详情
            no_number_parts = db.query(Part).filter(Part.part_number.is_(None)).all()
            report["no_part_number_details"] = [
                {
                    "id": p.id,
                    "name": p.name,
                    "manufacturer": manufacturers.get(p.manufacturer_id, ""),
                    "package": packages.get(p.package_id, ""),
                    "category": categories.get(p.category_id, ""),
                    "subcategory": subcategories.get(p.subcategory_id, ""),
                }
                for p in no_number_parts
            ]

            # 无类别零件详情
            no_category_parts = db.query(Part).filter(Part.category_id.is_(None)).all()
            report["no_category_details"] = [
                {
                    "id": p.id,
                    "name": p.name,
                    "manufacturer": manufacturers.get(p.manufacturer_id, ""),
                    "package": packages.get(p.package_id, ""),
                    "part_number": p.part_number or "",
                }
                for p in no_category_parts
            ]

            # 无子类别（有编号）零件详情
            no_subcategory_parts = db.query(Part).filter(
                Part.part_number.isnot(None),
                Part.subcategory_id.is_(None)
            ).all()
            report["no_subcategory_details"] = [
                {
                    "id": p.id,
                    "part_number": p.part_number,
                    "name": p.name,
                    "manufacturer": manufacturers.get(p.manufacturer_id, ""),
                    "package": packages.get(p.package_id, ""),
                    "category": categories.get(p.category_id, ""),
                }
                for p in no_subcategory_parts
            ]

        return report

    @staticmethod
    def get_all_manufacturers(db: Session):
        """获取所有制造商"""
        from app.crud.manufacturer import get_all_manufacturers as crud_get_all_manufacturers
        return crud_get_all_manufacturers(db)
    
    @staticmethod
    def get_all_packages(db: Session):
        """获取所有封装类型"""
        from app.crud.package import get_all_packages as crud_get_all_packages
        return crud_get_all_packages(db)
    
    @staticmethod
    def get_all_types(db: Session):
        """获取所有零件类型"""
        from app.crud.type import get_all_types as crud_get_all_types
        return crud_get_all_types(db)
    
    @staticmethod
    def advanced_search(db: Session, filter_data: PartInventoryFilter, sort_field: str = None, sort_direction: str = "asc") -> Dict[str, Any]:
        """
        高级筛选（支持多条件组合和排序）
        - 支持按搜索关键字、制造商、封装、类型筛选
        - 支持分页和排序
        - 支持正则表达式搜索（前缀 re: 或 regex:）
        """
        from sqlalchemy import or_, func
        import re as regex_module

        query = db.query(Part).join(Inventory)

        # 跟踪已连接的表以避免重复连接
        joined_tables = {"Inventory"}

        # 应用筛选条件
        if filter_data.search_key:
            search_key = filter_data.search_key.strip()

            # 检测正则表达式模式
            is_regex = False
            if search_key.startswith('re:') or search_key.startswith('regex:'):
                is_regex = True
                pattern = search_key.split(':', 1)[1] if ':' in search_key else search_key

            if is_regex:
                # 正则表达式搜索模式
                # 确保连接 Manufacturer 和 Type 表
                if "Manufacturer" not in joined_tables:
                    query = query.join(Manufacturer, isouter=True)
                    joined_tables.add("Manufacturer")
                if "Type" not in joined_tables:
                    query = query.join(Type, isouter=True)
                    joined_tables.add("Type")
                if "Package" not in joined_tables:
                    query = query.join(Package, isouter=True)
                    joined_tables.add("Package")

                # 注册 SQLite REGEXP 函数
                @db.event.listens_for(db.get_bind(), "connect")
                def _regexp(dbapi_conn, connection_rec):
                    dbapi_conn.create_function("REGEXP", 2, lambda p, s: 1 if s and regex_module.search(p, str(s)) else 0)

                # 对多个字段应用正则匹配
                try:
                    regex_filter = or_(
                        Part.name.op('REGEXP')(pattern),
                        Part.description.op('REGEXP')(pattern),
                        Part.part_number.op('REGEXP')(pattern),
                        Part.lc_number.op('REGEXP')(pattern),
                        Manufacturer.name.op('REGEXP')(pattern),
                        Type.part_type.op('REGEXP')(pattern),
                        Package.package_type.op('REGEXP')(pattern),
                    )
                    query = query.filter(regex_filter)
                except Exception:
                    # 正则表达式无效时回退到普通搜索
                    query = query.filter(Part.name.contains(search_key))
            else:
                # 普通搜索模式 - 搜索多个字段
                # 确保连接 Manufacturer、Type 和 Package 表
                if "Manufacturer" not in joined_tables:
                    query = query.join(Manufacturer, isouter=True)
                    joined_tables.add("Manufacturer")
                if "Type" not in joined_tables:
                    query = query.join(Type, isouter=True)
                    joined_tables.add("Type")
                if "Package" not in joined_tables:
                    query = query.join(Package, isouter=True)
                    joined_tables.add("Package")

                search_pattern = f'%{search_key}%'
                multi_field_filter = or_(
                    Part.name.ilike(search_pattern),
                    Part.description.ilike(search_pattern),
                    Part.part_number.ilike(search_pattern),
                    Part.lc_number.ilike(search_pattern),
                    Manufacturer.name.ilike(search_pattern),
                    Type.part_type.ilike(search_pattern),
                    Package.package_type.ilike(search_pattern),
                )
                query = query.filter(multi_field_filter)
        
        if filter_data.manufacturer:
            if "Manufacturer" not in joined_tables:
                query = query.join(Manufacturer)
                joined_tables.add("Manufacturer")
            query = query.filter(Manufacturer.name == filter_data.manufacturer)
        
        if filter_data.package:
            if "Package" not in joined_tables:
                query = query.join(Package)
                joined_tables.add("Package")
            query = query.filter(Package.package_type == filter_data.package)
        
        if filter_data.part_type:
            if "Type" not in joined_tables:
                query = query.join(Type)
                joined_tables.add("Type")
            query = query.filter(Type.part_type == filter_data.part_type)

        if filter_data.category_id:
            query = query.filter(Part.category_id == filter_data.category_id)

        if filter_data.subcategory_id:
            query = query.filter(Part.subcategory_id == filter_data.subcategory_id)

        # 参数筛选（解析 other JSON 字段和 package 字段）
        if filter_data.param_filters:
            import json as _json
            # 先获取所有候选零件，Python 侧解析 JSON 筛选
            # 对于大量数据应使用 SQLite json_extract，但当前规模足够
            all_parts = query.all()
            filtered_ids = []
            for part in all_parts:
                # 构建参数字典
                params = {}
                
                # 从 package 字段获取封装值
                if part.package:
                    try:
                        package_name = part.package.package_type if hasattr(part.package, 'package_type') else str(part.package)
                        if package_name:
                            params['封装'] = package_name
                    except:
                        pass
                
                # 从 other 字段获取其他参数值
                if part.other and part.other != 'None':
                    try:
                        data = _json.loads(part.other)
                        
                        # 检查是否是新格式（包含 fields、values、units）
                        if isinstance(data, dict) and 'fields' in data and 'values' in data:
                            # 新格式：从 values 中提取参数值
                            other_params = data.get('values', {})
                            if isinstance(other_params, dict):
                                params.update(other_params)
                        else:
                            # 旧格式：直接使用整个对象
                            if isinstance(data, dict):
                                params.update(data)
                    except (ValueError, TypeError):
                        pass
                
                if not params:
                    continue
                match = True
                for field_name, condition in filter_data.param_filters.items():
                    val = params.get(field_name)
                    if val is None:
                        match = False
                        break
                    if isinstance(condition, dict):
                        # 范围筛选 {"min": "100", "max": "1000"}
                        try:
                            num_val = _parse_param_number(str(val))
                            if condition.get("min") is not None:
                                if num_val < _parse_param_number(str(condition["min"])):
                                    match = False
                                    break
                            if condition.get("max") is not None:
                                if num_val > _parse_param_number(str(condition["max"])):
                                    match = False
                                    break
                        except (ValueError, TypeError):
                            match = False
                            break
                    elif isinstance(condition, list):
                        # 多选匹配
                        if str(val) not in [str(v) for v in condition]:
                            match = False
                            break
                    else:
                        # 精确匹配
                        if str(val) != str(condition):
                            match = False
                            break
                if match:
                    filtered_ids.append(part.id)

            query = db.query(Part).join(Inventory).filter(Part.id.in_(filtered_ids))
            # 重新应用 category_id 筛选（因为 query 被替换了）
            if filter_data.category_id:
                query = query.filter(Part.category_id == filter_data.category_id)
            if filter_data.subcategory_id:
                query = query.filter(Part.subcategory_id == filter_data.subcategory_id)

        # 应用排序
        if sort_field:
            # 确保排序字段所需的表已连接
            if sort_field == "part_type" and "Type" not in joined_tables:
                query = query.join(Type)
                joined_tables.add("Type")
            elif sort_field == "package" and "Package" not in joined_tables:
                query = query.join(Package)
                joined_tables.add("Package")
            elif sort_field == "manufacturer" and "Manufacturer" not in joined_tables:
                query = query.join(Manufacturer)
                joined_tables.add("Manufacturer")
                
            field = InventoryService._FIELD_MAPPING.get(sort_field, Part.id)
            
            if sort_direction == "desc":
                query = query.order_by(field.desc())
            else:
                query = query.order_by(field.asc())
        else:
            query = query.order_by(Part.id.asc())
        
        # 分页处理
        total_count = query.count()
        page = filter_data.page or 1
        page_size = filter_data.page_size or 100
        offset = (page - 1) * page_size
        
        parts_list = query.offset(offset).limit(page_size).all()
        
        # 使用通用方法创建结果
        result = [InventoryService._create_part_inventory_flat_get(part, db) for part in parts_list]
        
        return {
            "data": result,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": (total_count + page_size - 1) // page_size
            }
        }

    @staticmethod
    def get_category_param_values(db: Session, category_id: int) -> Dict[str, list]:
        """获取指定类别下所有零件的参数值分布（从 other JSON 字段和 package 字段解析）"""
        import json as _json
        
        # 获取该类别下所有零件（包括没有other字段的）
        parts = db.query(Part).filter(
            Part.category_id == category_id
        ).all()

        param_values: Dict[str, set] = {}
        
        for part in parts:
            # 从 package 字段获取封装值
            if part.package:
                try:
                    package_name = part.package.package_type if hasattr(part.package, 'package_type') else str(part.package)
                    if package_name:
                        if '封装' not in param_values:
                            param_values['封装'] = set()
                        param_values['封装'].add(package_name)
                except:
                    pass
            
            # 从 other 字段获取其他参数值
            if not part.other or part.other == '' or part.other == 'None':
                continue
                
            try:
                data = _json.loads(part.other)
                if not isinstance(data, dict):
                    continue
                
                # 检查是否是新格式（包含 fields、values、units）
                if 'fields' in data and 'values' in data:
                    # 新格式：从 values 中提取参数值
                    params = data.get('values', {})
                else:
                    # 旧格式：直接使用整个对象
                    params = data
                
                if not isinstance(params, dict):
                    continue
                    
            except (ValueError, TypeError):
                continue
            for k, v in params.items():
                if k not in param_values:
                    param_values[k] = set()
                param_values[k].add(str(v))

        return {k: sorted(v) for k, v in param_values.items()}
