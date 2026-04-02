from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from db.database import get_db
from app.services.project_service import ProjectService
from app.schemas.project import ProjectCreate

router = APIRouter()

@router.post("/create_project")
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    return ProjectService.create_project(db, project)

@router.get("/get_projects")
def get_projects_list(
    page: int = Query(1, description="页码", ge=1),
    page_size: int = Query(100, description="每页数量", ge=1, le=500),
    db: Session = Depends(get_db)
):
    return ProjectService.get_projects_list(db, page, page_size)

@router.get("/get_project_details")
def get_project_details(
    project_id: int = Query(..., description="项目ID"),
    db: Session = Depends(get_db)
):
    return ProjectService.get_project_details(db, project_id)

@router.get("/get_project_bom")
def get_project_bom(
    project_id: int = Query(..., description="项目ID"),
    db: Session = Depends(get_db)
):
    return ProjectService.get_project_bom(db, project_id)