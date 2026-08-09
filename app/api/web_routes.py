import os
from fastapi import APIRouter, Request, Depends
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, FileResponse, Response
from sqlalchemy.orm import Session
from db.database import get_db
from app.api.auth_routes import get_current_user_from_request

templates = Jinja2Templates(directory="templates")

router = APIRouter()

# 获取静态文件目录的绝对路径
_static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static")


def get_template_context(request: Request, db: Session, **extra):
    """获取模板上下文，包含用户信息"""
    user = get_current_user_from_request(request, db)
    context = {
        "request": request,
        "user": user,
        **extra
    }
    return context


@router.get("/favicon.ico")
def get_favicon():
    """返回网站图标"""
    favicon_path = os.path.join(_static_dir, "favicon.ico")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path, media_type="image/x-icon")
    return Response(status_code=204)


@router.get("/.well-known/{path:path}")
async def well_known(path: str):
    """忽略Chrome DevTools等well-known请求"""
    return Response(status_code=204)


@router.get("/static/{path:path}.map")
async def source_map(path: str):
    """忽略源映射文件请求"""
    return Response(status_code=204)


@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request, db: Session = Depends(get_db)):
    """登录页面"""
    context = get_template_context(request, db)
    return templates.TemplateResponse(request=request, name="login.html", context=context)


@router.get("/", response_class=HTMLResponse)
def get_home_template(request: Request, db: Session = Depends(get_db)):
    context = get_template_context(request, db)
    return templates.TemplateResponse(request=request, name="inventory.html", context=context)


@router.get("/inventory", response_class=HTMLResponse)
def get_inventory_template(request: Request, db: Session = Depends(get_db)):
    context = get_template_context(request, db)
    return templates.TemplateResponse(request=request, name="inventory.html", context=context)


@router.get("/component_details", response_class=HTMLResponse)
def get_component_details_template(request: Request, db: Session = Depends(get_db)):
    context = get_template_context(request, db)
    return templates.TemplateResponse(request=request, name="component_details.html", context=context)


@router.get("/projects", response_class=HTMLResponse)
def get_projects_template(request: Request, db: Session = Depends(get_db)):
    context = get_template_context(request, db)
    return templates.TemplateResponse(request=request, name="projects.html", context=context)


@router.get("/project_details", response_class=HTMLResponse)
def get_project_details_template(request: Request, project_id: int, db: Session = Depends(get_db)):
    context = get_template_context(request, db, project_id=project_id)
    return templates.TemplateResponse(request=request, name="project_details.html", context=context)


@router.get("/settings", response_class=HTMLResponse)
def get_settings_template(request: Request, db: Session = Depends(get_db)):
    context = get_template_context(request, db)
    return templates.TemplateResponse(request=request, name="settings.html", context=context)


@router.get("/lcsc", response_class=HTMLResponse)
def get_lcsc_page(request: Request, db: Session = Depends(get_db)):
    """LC查询页面"""
    context = get_template_context(request, db)
    return templates.TemplateResponse(request=request, name="lcsc.html", context=context)
