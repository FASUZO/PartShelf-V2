import os
from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, FileResponse

templates = Jinja2Templates(directory="templates")

router = APIRouter()

# 获取静态文件目录的绝对路径
_static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static")

@router.get("/favicon.ico")
def get_favicon():
    """返回网站图标"""
    favicon_path = os.path.join(_static_dir, "favicon.ico")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path, media_type="image/x-icon")
    return FileResponse(os.path.join(_static_dir, "favicon.ico"))

@router.get("/", response_class=HTMLResponse)
def get_home_template(request: Request):
    return templates.TemplateResponse(request=request, name="inventory.html")

@router.get("/inventory", response_class=HTMLResponse)
def get_inventory_template(request: Request):
    return templates.TemplateResponse(request=request, name="inventory.html")

@router.get("/component_details", response_class=HTMLResponse)
def get_component_details_template(request: Request):
    return templates.TemplateResponse(request=request, name="component_details.html")

@router.get("/projects", response_class=HTMLResponse)
def get_projects_template(request: Request):
    return templates.TemplateResponse(request=request, name="projects.html")

@router.get("/project_details", response_class=HTMLResponse)
def get_project_details_template(request: Request, project_id: int):
    return templates.TemplateResponse(request=request, name="project_details.html", context={"project_id": project_id})

@router.get("/settings", response_class=HTMLResponse)
def get_settings_template(request: Request):
    return templates.TemplateResponse(request=request, name="settings.html")
