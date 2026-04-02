import csv
import io
import re
import zipfile
import xml.etree.ElementTree as ET
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.crud.file_templates import create_file_template, get_available_file_templates, get_template_by_id
from app.models.file_template import FileTemplate
from app.models.part import Part
from app.models.inventory import Inventory
from app.schemas.file_template import FileTemplateAdd, FileTemplateGet
from app.schemas.inventory import PartToInventoryAdd
from app.services.inventory_service import InventoryService

class FileService:
    def add_file_template(db: Session, template: FileTemplateAdd):
        return create_file_template(db ,FileTemplate(
            template_type = template.template_type,
            template_name = template.template_name,
            manufacturer_column = template.manufacturer_column,
            part_name_column =  template.part_name_column,
            package_column = template.package_column,
            description_column = template.description_column,
            quantity_column =template.quantity_column
        ))
    
    def get_available_file_templates(db: Session):
        file_templates = get_available_file_templates(db)
        
        return [
        FileTemplateGet(
            id = template.id,
            template_type = template.template_type,
            template_name = template.template_name,
            
            manufacturer_column = template.manufacturer_column,
            part_name_column = template.part_name_column,
            package_column = template.package_column,
            description_column = template.description_column,
            quantity_column = template.quantity_column,
        )
        for template in file_templates
        ] 
    
    def import_order_csv_file(file_content: bytes, template_id: int, db: Session):
        text_io = io.StringIO(file_content.decode("utf-8"))
        reader = csv.DictReader(text_io)

        file_template = get_template_by_id(db, template_id)
        if not file_template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template with id={template_id} not found to parse file"
            )

        for row in reader:
            description = row[file_template.description_column].strip()
            value, part_type = FileService.extract_info(description)
           
            part_to_add = PartToInventoryAdd(
                name = row[file_template.part_name_column].strip(),
                manufacturer = row[file_template.manufacturer_column].strip(),
                package = row[file_template.package_column].strip(),
                quantity = int(row[file_template.quantity_column].strip()),
                description = description,
                part_type = part_type
            )

            InventoryService.add_part_to_inventory(db, part_to_add)

        return text_io

    def extract_info(description):
        if description is None or description == "" or str(description).strip() == "":
            return None, None
        
        value_match = re.search(r'\b\d+(?:\.\d+)?\s?(kΩ|Ω|MΩ|nF|uF|pF|F|H|mH|µH)\b', description, re.IGNORECASE)
        value = value_match.group(0) if value_match else ""

        type_match = re.search(r'(Thick Film Resistor|Chip Resistor|Capacitor|Multilayer Ceramic Capacitor|Operational Amplifier)', description, re.IGNORECASE)
        part_type = type_match.group(0) if type_match else ""
        
        return value, part_type

    def parse_excel_file(file_path):
        """使用pandas解析Excel文件"""
        try:
            import pandas as pd
            # 使用pandas读取Excel文件，header=None表示不将第一行作为列名
            df = pd.read_excel(file_path, header=None)
            # 将DataFrame转换为二维列表
            data = df.values.tolist()
            return data
        except ImportError:
            # 如果pandas不可用，回退到原始方法
            import zipfile
            import xml.etree.ElementTree as ET
            
            data = []
            
            # 打开Excel文件（实际上是zip文件）
            with zipfile.ZipFile(file_path, 'r') as zf:
                # 读取sharedStrings.xml（共享字符串表）
                shared_strings = {}
                if 'xl/sharedStrings.xml' in zf.namelist():
                    shared_strings_content = zf.read('xl/sharedStrings.xml').decode('utf-8')
                    root = ET.fromstring(shared_strings_content)
                    for i, si in enumerate(root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si')):
                        t = si.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                        if t is not None and t.text:
                            shared_strings[i] = t.text
                
                # 读取第一个工作表
                sheet_files = [f for f in zf.namelist() if f.startswith('xl/worksheets/sheet') and f.endswith('.xml')]
                if not sheet_files:
                    return data
                
                # 读取第一个工作表
                sheet_content = zf.read(sheet_files[0]).decode('utf-8')
                root = ET.fromstring(sheet_content)
                
                # 解析工作表数据
                sheet_data = root.find('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetData')
                if sheet_data is None:
                    return data
                
                # 解析每一行
                for row_elem in sheet_data.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                    row_data = []
                    
                    # 解析每个单元格
                    for cell_elem in row_elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                        cell_value = ""
                        v_elem = cell_elem.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                        
                        if v_elem is not None and v_elem.text:
                            cell_type = cell_elem.get('t')
                            if cell_type == 's':  # 共享字符串
                                idx = int(v_elem.text)
                                cell_value = shared_strings.get(idx, "")
                            else:  # 直接值
                                cell_value = v_elem.text
                        
                        row_data.append(cell_value)
                    
                    data.append(row_data)
            
            return data

    def import_order_excel_file(file_content: bytes, template_id: int, db: Session):
        try:
            # 使用zipfile和xml解析Excel文件，避免外部库依赖问题
            import tempfile
            import os
            
            # 创建临时文件
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
                tmp_file.write(file_content)
                tmp_file_path = tmp_file.name
            
            try:
                # 解析Excel文件
                data = FileService.parse_excel_file(tmp_file_path)
                
                # 获取文件模板
                file_template = get_template_by_id(db, template_id)
                if not file_template:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Template with id={template_id} not found to parse file"
                    )
                
                # 获取列名（第一行）
                if not data or len(data) < 2:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Excel文件为空或格式不正确"
                    )
                
                header_row = data[0]
                
                # 找到对应的列索引
                manufacturer_col_idx = None
                part_name_col_idx = None
                package_col_idx = None
                description_col_idx = None
                quantity_col_idx = None
                
                for idx, col_name in enumerate(header_row):
                    if col_name == file_template.manufacturer_column:
                        manufacturer_col_idx = idx
                    elif col_name == file_template.part_name_column:
                        part_name_col_idx = idx
                    elif col_name == file_template.package_column:
                        package_col_idx = idx
                    elif col_name == file_template.description_column:
                        description_col_idx = idx
                    elif col_name == file_template.quantity_column:
                        quantity_col_idx = idx
                
                # 检查是否找到了所有必需的列
                if not all([manufacturer_col_idx is not None, part_name_col_idx is not None, 
                           package_col_idx is not None, quantity_col_idx is not None]):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Excel文件中缺少必需的列"
                    )
                
                # 遍历数据行（从第二行开始，假设第一行是列名）
                for row_idx, row in enumerate(data[1:], start=2):
                    # 跳过空行
                    if not row or len(row) <= max(manufacturer_col_idx, part_name_col_idx, package_col_idx, quantity_col_idx):
                        continue
                    
                    # 获取行数据
                    manufacturer = row[manufacturer_col_idx] if manufacturer_col_idx < len(row) else None
                    part_name = row[part_name_col_idx] if part_name_col_idx < len(row) else None
                    package = row[package_col_idx] if package_col_idx < len(row) else None
                    quantity = row[quantity_col_idx] if quantity_col_idx < len(row) else None
                    description = str(row[description_col_idx]).strip() if description_col_idx is not None and description_col_idx < len(row) and row[description_col_idx] else ""
                    
                    # 跳过空行 - 根据要求只需要型号列和数量列有数据
                    if not part_name or not quantity:
                        continue
                    
                    # 清理数据
                    manufacturer = str(manufacturer).strip()
                    part_name = str(part_name).strip()
                    package = str(package).strip()
                    quantity = int(float(quantity)) if isinstance(quantity, (int, float)) else int(quantity)
                    
                    # 提取信息
                    value, part_type = FileService.extract_info(description)
                    
                    # 创建零件数据
                    part_to_add = PartToInventoryAdd(
                        name=part_name,
                        manufacturer=manufacturer,
                        package=package,
                        quantity=quantity,
                        description=description,
                        part_type=part_type
                    )
                    
                    # 添加到库存
                    InventoryService.add_part_to_inventory(db, part_to_add)
                
                return {"message": "Excel文件导入成功"}
                
            finally:
                # 删除临时文件
                os.unlink(tmp_file_path)
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Excel文件导入失败: {str(e)}"
            )
    
    def import_order_csv_file_direct(file_content: bytes, db: Session, import_mode: str = "append"):
        """直接导入CSV文件，使用预设的列映射
        
        Args:
            file_content: CSV文件内容
            db: 数据库会话
            import_mode: 导入模式，"append"（追加）或 "overwrite"（覆盖）
        """
        # 如果是覆盖模式，先清空库存
        if import_mode == "overwrite":
            # 删除所有库存记录
            db.query(Inventory).delete()
            # 删除所有零件记录
            db.query(Part).delete()
            db.commit()
        try:
            text_io = io.StringIO(file_content.decode("utf-8"))
            reader = csv.DictReader(text_io)
            
            # 预设的列名映射（支持中英文）
            column_mapping = {
            'name': ['name', '型号'],
            'manufacturer': ['manufacturer', '制造商', '厂家', '厂商', '品牌'],
            'package': ['package', '封装', '封装类型', 'package type', '封装格式'],
            'quantity': ['quantity', '数量', 'qty', '库存', '型号发货数量'],
            'description': ['description', '描述', '说明', 'desc', '商品型号'],
            'price': ['price', '单价', '单价（人民币含税）'],
            'lc_number': ['lc_number', 'LC编号', '商品编号'],
            'other': ['other', '其他', '其他信息']
        }
            
            for row_idx, row in enumerate(reader, start=2):
                # 自动检测列名
                row_data = {}
                for field, possible_names in column_mapping.items():
                    for col_name in possible_names:
                        if col_name in row:
                            row_data[field] = row[col_name].strip()
                            break
                
                # 检查必需字段
                required_fields = ['name', 'manufacturer', 'package', 'quantity']
                missing_fields = [f for f in required_fields if f not in row_data or not row_data[f]]
                if missing_fields:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"CSV文件第{row_idx}行缺少必需字段: {', '.join(missing_fields)}"
                    )
                
                # 转换数量字段
                try:
                    quantity = int(row_data['quantity'])
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"CSV文件第{row_idx}行数量字段必须是数字"
                    )
                
                # 提取信息
                description = row_data.get('description', '')
                value, part_type = FileService.extract_info(description)
                
                # 创建零件数据
                part_to_add = PartToInventoryAdd(
                    name=row_data['name'],
                    manufacturer=row_data['manufacturer'],
                    package=row_data['package'],
                    quantity=quantity,
                    description=description,
                    part_type=part_type,
                    lc_number=row_data.get('lc_number', None),
                    price=float(row_data['price']) if row_data.get('price') else None
                )
                
                # 添加到库存
                InventoryService.add_part_to_inventory(db, part_to_add)
            
            return {"message": "CSV文件导入成功"}
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"CSV文件导入失败: {str(e)}"
            )
    
    def import_order_excel_file_direct(file_content: bytes, db: Session, import_mode: str = "append"):
        """直接导入Excel文件，使用预设的列映射
        
        Args:
            file_content: Excel文件内容
            db: 数据库会话
            import_mode: 导入模式，"append"（追加）或 "overwrite"（覆盖）
        """
        # 如果是覆盖模式，先清空库存
        if import_mode == "overwrite":
            # 删除所有库存记录
            db.query(Inventory).delete()
            # 删除所有零件记录
            db.query(Part).delete()
            db.commit()
        try:
            # 使用新的parse_excel_file方法读取Excel文件
            import tempfile
            import os
            
            # 创建临时文件
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
                tmp_file.write(file_content)
                tmp_file_path = tmp_file.name
            
            try:
                # 解析Excel文件
                data = FileService.parse_excel_file(tmp_file_path)
                
                # 预设的列名映射（支持中英文）
                column_mapping = {
                    'name': ['name', '型号', '商品型号'],
                    'manufacturer': ['manufacturer', '制造商', '厂家', '厂商', '品牌'],
                    'package': ['package', '封装', '封装类型', 'package type', '封装格式'],
                    'quantity': ['quantity', '数量', 'qty', '库存', '型号发货数量'],
                    'description': ['description', '描述', '说明', 'desc'],
                    'part_type': ['part_type', '类型', '商品类型', '零件类型', 'type'],
                    'price': ['price', '单价', '单价（人民币含税）'],
                    'lc_number': ['lc_number', 'LC编号', '商品编号'],
                    'other': ['other', '其他', '其他信息']
                }
                
                # 获取列名，处理第一行可能是空行的情况
                if not data or len(data) < 2:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Excel文件为空或格式不正确"
                    )
                
                # 查找有效的列名行（跳过空行）
                header_row = None
                data_start_row = 0
                
                for i, row in enumerate(data):
                    if any(cell and str(cell).strip() for cell in row):
                        header_row = row
                        data_start_row = i
                        break
                
                if header_row is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Excel文件中没有找到有效的列名行"
                    )
                
                # 自动检测列映射
                col_mapping = {}
                for field, possible_names in column_mapping.items():
                    for idx, col_name in enumerate(header_row):
                        if col_name and any(name.lower() in str(col_name).lower() for name in possible_names):
                            col_mapping[field] = idx
                            break
                
                # 检查是否找到了所有必需的列
                required_fields = ['name', 'manufacturer', 'package', 'quantity']
                missing_fields = [f for f in required_fields if f not in col_mapping]
                if missing_fields:
                    # 提供更详细的错误信息，包括实际检测到的列名
                    detected_columns = []
                    for idx, col_name in enumerate(header_row):
                        if col_name and col_name.strip():
                            detected_columns.append(f"'{col_name}'")
                    
                    if detected_columns:
                        detail_msg = f"Excel文件中缺少必需的列: {', '.join(missing_fields)}。检测到的列名: {', '.join(detected_columns)}"
                    else:
                        detail_msg = f"Excel文件中缺少必需的列: {', '.join(missing_fields)}。第一行似乎是空的，请确保Excel文件包含列名。"
                    
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=detail_msg
                    )
                
                # 遍历数据行（从列名行的下一行开始）
                for row_idx, row in enumerate(data[data_start_row + 1:], start=data_start_row + 2):
                    # 跳过空行（检查行是否为空或长度不足）
                    if not row or len(row) <= max(col_mapping.values()):
                        continue
                    
                    # 获取行数据
                    row_data = {}
                    for field, col_idx in col_mapping.items():
                        if col_idx < len(row):
                            value = row[col_idx]
                            row_data[field] = str(value).strip() if value is not None else ""
                        else:
                            row_data[field] = ""
                    
                    # 检查必需字段，但只跳过完全空白的行
                    # 如果行中有任何数据，尝试处理
                    has_data = any(row_data.get(field) for field in required_fields)
                    if not has_data:
                        continue  # 跳过完全空白的行
                    
                    # 检查必需字段，根据要求只需要型号列（name字段）有数据就可以导入
                    # 允许其他字段为空，但数量字段必须有值
                    if not row_data.get('name'):
                        continue  # 跳过型号字段为空的行的行
                        
                    if not row_data.get('quantity'):
                        continue  # 跳过数量字段为空的行的行
                        
                    # 转换数量字段
                    try:
                        quantity = int(float(row_data['quantity']))
                    except ValueError:
                        continue  # 跳过数量格式不正确的行
                    
                    # 提取信息
                    description = row_data.get('description', '')
                    # 优先使用Excel中的类型列数据，如果没有则从描述中提取
                    part_type = row_data.get('part_type', '')
                    if not part_type:
                        value, part_type = FileService.extract_info(description)
                    
                    # 创建零件数据
                    part_to_add = PartToInventoryAdd(
                        name=row_data['name'],
                        manufacturer=row_data['manufacturer'],
                        package=row_data['package'],
                        quantity=quantity,
                        description=description,
                        part_type=part_type,
                        lc_number=row_data.get('lc_number', None),
                        price=float(row_data['price']) if row_data.get('price') else None
                    )
                    
                    # 添加到库存
                    InventoryService.add_part_to_inventory(db, part_to_add)
                
                return {"message": "Excel文件导入成功"}
                
            finally:
                # 删除临时文件
                os.unlink(tmp_file_path)
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Excel文件导入失败: {str(e)}"
            )
        
