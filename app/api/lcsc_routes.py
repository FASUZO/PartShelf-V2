"""
LCSC 查询 API 路由
提供立创商城零件查询接口
"""

import logging
from fastapi import APIRouter, HTTPException, Query
from app.services.lcsc_service import query_lcsc_part, query_lcsc_list, check_cookies

logger = logging.getLogger("partshelf.api.lcsc")
router = APIRouter()


@router.get("/query/{lc_code}")
async def query_part(lc_code: str, bom_uuid: str = Query(None)):
    """
    查询 LCSC 零件信息
    
    Args:
        lc_code: LC 编号，如 C192666
        bom_uuid: BOM 清单 UUID（可选）
    """
    if not lc_code.startswith('C') or not lc_code[1:].isdigit():
        raise HTTPException(status_code=400, detail="Invalid LC code format")
    
    result = query_lcsc_part(lc_code, bom_uuid)

    if result is None:
        raise HTTPException(status_code=404, detail=f"LCSC查询失败: {lc_code} 未找到或LCSC服务不可用(需安装Node.js)")
    
    return result


@router.get("/list")
async def list_parts(bom_uuid: str = Query(None)):
    """
    查询 BOM 清单所有物料
    
    Args:
        bom_uuid: BOM 清单 UUID（可选）
    """
    items = query_lcsc_list(bom_uuid)
    return {"count": len(items), "items": items}


@router.get("/cookies")
async def get_cookie_status():
    """检查 cookie 状态"""
    return check_cookies()


@router.post("/cookies/refresh")
async def refresh_cookies():
    """刷新 Cookie"""
    try:
        import subprocess
        import os
        scraper = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "lcsc-playwright-scraper.mjs")
        result = subprocess.run(
            ["node", scraper, "refresh"],
            capture_output=True, text=True, timeout=60,
            cwd=os.path.dirname(scraper), encoding='utf-8', errors='replace'
        )
        if result.returncode == 0:
            return {"success": True, "message": "Cookie刷新成功"}
        return {"success": False, "message": result.stderr or "刷新失败"}
    except FileNotFoundError:
        return {"success": False, "message": "Node.js未安装，LCSC功能不可用"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.post("/cookies/qrcode")
async def get_qr_code():
    """获取登录二维码"""
    try:
        import subprocess
        import os
        scraper = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "lcsc-playwright-scraper.mjs")
        result = subprocess.run(
            ["node", scraper, "qrcode"],
            capture_output=True, text=True, timeout=30,
            cwd=os.path.dirname(scraper), encoding='utf-8', errors='replace'
        )
        if result.returncode == 0:
            import json
            data = json.loads(result.stdout[result.stdout.find('{'):])
            return data
        return {"success": False, "message": result.stderr or "获取二维码失败"}
    except FileNotFoundError:
        return {"success": False, "message": "Node.js未安装，LCSC功能不可用"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.get("/cookies/status")
async def get_login_status():
    """检查登录状态"""
    try:
        import subprocess
        import os
        scraper = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "lcsc-playwright-scraper.mjs")
        result = subprocess.run(
            ["node", scraper, "status"],
            capture_output=True, text=True, timeout=10,
            cwd=os.path.dirname(scraper), encoding='utf-8', errors='replace'
        )
        if result.returncode == 0:
            import json
            data = json.loads(result.stdout[result.stdout.find('{'):])
            return data
        return {"logged_in": False}
    except FileNotFoundError:
        return {"logged_in": False, "message": "Node.js未安装"}
    except Exception as e:
        return {"logged_in": False}
