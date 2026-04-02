"""
库存管理服务模块
提供库存相关的业务逻辑处理，包括：
- 零件添加和查询
- 库存更新（入库/出库/调整）
- 高级筛选和排序
- 库存历史记录
"""

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
from app.schemas.inventory import PartDetailsFlatGet, PartInventoryFlatGet, PartInventoryQuantity, PartInventoryQuantityUpdate, PartToInventoryAdd, PartInventoryFilter


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
    
    @staticmethod
    def _create_part_inventory_flat_get(part: Part) -> PartInventoryFlatGet:
        """创建零件库存扁平化对象（统一数据格式）"""
        return PartInventoryFlatGet(
            id=part.id,
            name=part.name,
            manufacturer=part.manufacturer.name if part.manufacturer else None,
            part_type=part.type.part_type if part.type else None,
            package=part.package.package_type if part.package else None,
            quantity=part.inventory.quantity_available if part.inventory else None,
            description=part.description if part.description else None,
            price=float(part.price) if part.price else None,
            lc_number=part.lc_number,
            other=part.other
        )

    @staticmethod
    def add_part_to_inventory(db: Session, part: PartToInventoryAdd):
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
            db_part = create_part(db, Part(
                name=part.name,
                description=part.description,
                manufacturer_id=db_manufacturer.id,
                package_id=db_package.id,
                type_id=db_type.id,
                price=str(part.price) if part.price is not None else None,
                lc_number=part.lc_number,
                other=part.other
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
                remark=f"添加零件时自动增加库存"
            )

        return part

    @staticmethod
    def update_inventory_quantity(db: Session, inventory_quantity: PartInventoryQuantityUpdate, remark: str = None):
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
        create_inventory_history(
            db=db,
            part_id=inventory_quantity.part_id,
            operation_type=operation_type,
            quantity_change=quantity_change,
            quantity_before=quantity_before,
            quantity_after=new_quantity,
            remark=remark
        )
        
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
        result = [InventoryService._create_part_inventory_flat_get(part) for part in parts]
        
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
        
        flat_get = InventoryService._create_part_inventory_flat_get(part_found)
        return PartDetailsFlatGet(**flat_get.dict())
        

    @staticmethod
    def search(search_key: str, db: Session) -> List[PartInventoryFlatGet]:
        """搜索零件（模糊匹配）"""
        parts_list = get_parts_containing_key(db, search_key)
        return [InventoryService._create_part_inventory_flat_get(part) for part in parts_list]
    
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
        
        delete_part(db, part_to_delete)

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
        """
        query = db.query(Part).join(Inventory)
        
        # 跟踪已连接的表以避免重复连接
        joined_tables = {"Inventory"}
        
        # 应用筛选条件
        if filter_data.search_key:
            query = query.filter(Part.name.contains(filter_data.search_key))
        
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
        result = [InventoryService._create_part_inventory_flat_get(part) for part in parts_list]
        
        return {
            "data": result,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": (total_count + page_size - 1) // page_size
            }
        }



