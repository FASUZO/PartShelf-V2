"""
LCSC 查询 API 路由
提供立创商城零件查询接口
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from app.services.lcsc_service import query_lcsc_part, query_lcsc_list, check_cookies
from app.api.deps import get_current_user_required

logger = logging.getLogger("partshelf.api.lcsc")
router = APIRouter()


@router.get("/query/{lc_code}")
async def query_part(lc_code: str, bom_uuid: str = Query(None), user=Depends(get_current_user_required)):
    """查询 LCSC 零件信息"""
    if not lc_code.startswith('C') or not lc_code[1:].isdigit():
        raise HTTPException(status_code=400, detail="Invalid LC code format")
    result = query_lcsc_part(lc_code, bom_uuid)
    if result is None:
        raise HTTPException(status_code=404, detail="LCSC查询失败: %s 未找到或LCSC服务不可用" % lc_code)
    return result


@router.get("/list")
async def list_parts(bom_uuid: str = Query(None), user=Depends(get_current_user_required)):
    """查询 BOM 清单所有物料"""
    items = query_lcsc_list(bom_uuid)
    return {"count": len(items), "items": items}


@router.get("/cookies")
async def get_cookie_status(user=Depends(get_current_user_required)):
    """检查 cookie 状态"""
    return check_cookies()


@router.get("/cookies/validate")
async def validate_cookies(user=Depends(get_current_user_required)):
    """验证 Cookie 是否有效"""
    try:
        from app.services.lcsc_service import _http_get
        result = _http_get("/cookies/validate", timeout=30.0)
        if result:
            return result
        return {"valid": False, "message": "LCSC服务不可用"}
    except Exception as e:
        return {"valid": False, "message": str(e)}


@router.post("/cookies/clear")
async def clear_cookies(user=Depends(get_current_user_required)):
    """清除无效的 Cookie"""
    try:
        from app.services.lcsc_service import _http_get
        result = _http_get("/cookies/clear", timeout=10.0)
        if result:
            return result
        return {"success": False, "message": "LCSC服务不可用"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.get("/debug/screenshot")
async def get_debug_screenshot(user=Depends(get_current_user_required)):
    """获取浏览器截图（调试用）"""
    try:
        from app.services.lcsc_service import _http_get
        result = _http_get("/screenshot", timeout=15.0)
        if result:
            return result
        return {"success": False, "error": "LCSC服务不可用"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/cookies/refresh")
async def refresh_cookies(user=Depends(get_current_user_required)):
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
async def get_qr_code(user=Depends(get_current_user_required)):
    """获取登录二维码"""
    try:
        from app.services.lcsc_service import _http_get
        result = _http_get("/qrcode", timeout=60.0)
        if result:
            return result
        return {"success": False, "message": "LCSC服务不可用"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.get("/cookies/status")
async def get_login_status(user=Depends(get_current_user_required)):
    """检查登录状态"""
    try:
        from app.services.lcsc_service import _http_get
        qr_result = _http_get("/cookies/check_qr_login", timeout=5.0)
        if qr_result and qr_result.get("logged_in"):
            return qr_result

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


@router.get("/preload/status")
async def get_preload_status():
    """获取 LC 预加载状态（无需鉴权，前端轮询用）"""
    from app.services.lcsc_service import get_preload_status
    return get_preload_status()


@router.post("/preload/start")
async def start_preload(user=Depends(get_current_user_required)):
    """启动 LC 预加载"""
    import threading
    from app.services.lcsc_service import preload_inventory_lc_codes, get_preload_status
    status = get_preload_status()
    if status["running"]:
        return {"message": "预加载已在运行中", "status": status}
    threading.Thread(target=preload_inventory_lc_codes, daemon=True).start()
    return {"message": "预加载已启动"}


@router.get("/cache/info")
async def get_cache_info(user=Depends(get_current_user_required)):
    """获取 LC 缓存信息"""
    import os
    from app.services.lcsc_service import _cache, _CACHE_FILE
    cache_size = 0
    if os.path.exists(_CACHE_FILE):
        cache_size = os.path.getsize(_CACHE_FILE)
    return {
        "entries": len(_cache),
        "file": _CACHE_FILE,
        "size_bytes": cache_size,
        "size_kb": round(cache_size / 1024, 1),
    }


@router.post("/cache/clear")
async def clear_cache(user=Depends(get_current_user_required)):
    """清空 LC 缓存"""
    from app.services.lcsc_service import clear_lcsc_cache
    result = clear_lcsc_cache()
    return result


@router.post("/cache/compact")
async def compact_cache(user=Depends(get_current_user_required)):
    """整理 LC 缓存（去除无效条目）"""
    from app.services.lcsc_service import _cache, _save_cache
    before = len(_cache)
    to_remove = [k for k, v in _cache.items() if not v or "error" in (v or {})]
    for k in to_remove:
        del _cache[k]
    _save_cache()
    return {"message": "整理完成: 移除 %d 个无效条目" % len(to_remove), "before": before, "after": len(_cache)}
