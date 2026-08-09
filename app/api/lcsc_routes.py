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
        raise HTTPException(status_code=404, detail=f"Part {lc_code} not found or query failed")
    
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
