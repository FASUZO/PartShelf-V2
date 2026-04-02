from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.models.project import Project
from app.models.project_part import ProjectPart
from app.models.part import Part
from app.schemas.project import ProjectCreate

class ProjectService:
    
    @staticmethod
    def create_project(db: Session, project_create: ProjectCreate):
        """创建新项目"""
        db_project = Project(
            name=project_create.name,
            description=project_create.description
        )
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        return db_project

    @staticmethod
    def get_projects_list(db: Session, page: int = 1, page_size: int = 100):
        """获取项目列表"""
        offset = (page - 1) * page_size
        
        # 获取项目总数
        total_count = db.query(Project).count()
        
        # 获取分页项目列表
        projects = db.query(Project).offset(offset).limit(page_size).all()
        
        # 为每个项目计算器件种类数
        projects_with_stats = []
        for project in projects:
            part_count = db.query(ProjectPart).filter(ProjectPart.project_id == project.id).count()
            projects_with_stats.append({
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "part_count": part_count
            })
        
        return {
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "projects": projects_with_stats
        }
    
    @staticmethod
    def get_project_details(db: Session, project_id: int):
        """获取项目详情"""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None
        
        # 计算项目中的器件种类数
        part_count = db.query(ProjectPart).filter(ProjectPart.project_id == project_id).count()
        
        return {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "part_count": part_count
        }
    
    @staticmethod
    def get_project_bom(db: Session, project_id: int):
        """获取项目的BOM表"""
        # 验证项目是否存在
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None
        
        # 获取项目的BOM表数据
        bom_data = db.query(
            ProjectPart,
            Part
        ).join(
            Part, ProjectPart.part_id == Part.id
        ).filter(
            ProjectPart.project_id == project_id
        ).all()
        
        # 格式化BOM表数据
        bom_list = []
        for project_part, part in bom_data:
            bom_list.append({
                "part_id": part.id,
                "part_name": part.name,
                "manufacturer": part.manufacturer,
                "part_type": part.part_type,
                "package": part.package,
                "quantity_needed": project_part.quantity_needed,
                "description": part.description
            })
        
        return {
            "project_id": project_id,
            "project_name": project.name,
            "bom": bom_list
        }