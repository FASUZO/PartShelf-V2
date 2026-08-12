"""
LCSC 查询服务
通过持久化 HTTP 服务查询立创商城 BOM 数据，支持本地缓存加速
"""

import subprocess
import json
import os
import logging
import time
from typing import Optional, Dict, Any, List

logger = logging.getLogger("partshelf.lcsc")

SCRAPER_SCRIPT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "lcsc-playwright-scraper.mjs",
)
SCRAPER_PORT = 3001
SCRAPER_BASE_URL = f"http://localhost:{SCRAPER_PORT}"
_scraper_process = None

# 本地缓存：LC 编号 → 查询结果
_cache: Dict[str, Dict[str, Any]] = {}
_CACHE_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "db", "lcsc_cache.json",
)


def _load_cache():
    """从文件加载缓存"""
    global _cache
    try:
        if os.path.exists(_CACHE_FILE):
            with open(_CACHE_FILE, "r", encoding="utf-8") as f:
                _cache = json.load(f)
            logger.info("Loaded %d cached LCSC entries", len(_cache))
    except Exception as e:
        logger.warning("Failed to load LCSC cache: %s", e)
        _cache = {}


def _save_cache():
    """保存缓存到文件"""
    try:
        os.makedirs(os.path.dirname(_CACHE_FILE), exist_ok=True)
        with open(_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning("Failed to save LCSC cache: %s", e)


# 启动时加载缓存
_load_cache()


def _http_get(path: str, params: dict = None, timeout: float = 30.0) -> Optional[dict]:
    """向 scraper HTTP 服务发 GET 请求"""
    try:
        import httpx
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            resp = client.get(f"{SCRAPER_BASE_URL}{path}", params=params)
            if resp.status_code == 200:
                return resp.json()
            logger.warning("LCSC HTTP %s returned %d", path, resp.status_code)
    except Exception as e:
        logger.debug("LCSC HTTP %s failed: %s", path, e)
    return None


def start_scraper_server() -> bool:
    """启动 LCSC scraper HTTP 服务（如果未运行）"""
    global _scraper_process

    health = _http_get("/health", timeout=3.0)
    if health:
        logger.info("LCSC scraper server already running")
        return True

    # 检查 node 是否可用
    try:
        subprocess.run(["node", "--version"], capture_output=True, timeout=5)
    except FileNotFoundError:
        logger.warning("Node.js not found, LCSC query feature disabled. Install Node.js to enable.")
        return False
    except Exception as e:
        logger.warning("Node.js check failed: %s, LCSC query feature disabled", e)
        return False

    try:
        logger.info("Starting LCSC scraper server on port %d...", SCRAPER_PORT)
        # 不捕获输出，让 Node.js 日志直接出现在 Docker 日志中
        _scraper_process = subprocess.Popen(
            ["node", SCRAPER_SCRIPT, "serve", str(SCRAPER_PORT)],
            cwd=os.path.dirname(SCRAPER_SCRIPT),
        )

        for i in range(30):
            time.sleep(1)
            health = _http_get("/health", timeout=3.0)
            if health:
                logger.info("LCSC scraper server started (PID: %d), health: %s", _scraper_process.pid, health)
                return True
            # 每5秒记录一次等待状态
            if i % 5 == 4:
                logger.info("Waiting for LCSC scraper server... (%ds)", i + 1)

        logger.warning("LCSC scraper server failed to start within 30s")
        return False
    except Exception as e:
        logger.warning("Failed to start LCSC scraper server: %s", e)
        return False


def stop_scraper_server():
    """停止 LCSC scraper HTTP 服务"""
    global _scraper_process
    if _scraper_process:
        try:
            _http_get("/shutdown", timeout=5.0)
        except Exception:
            pass
        try:
            _scraper_process.terminate()
        except Exception:
            pass
        _scraper_process = None
        logger.info("LCSC scraper server stopped")


def query_lcsc_part(lc_code: str, bom_uuid: str = None) -> Optional[Dict[str, Any]]:
    """
    查询 LCSC 零件信息（带本地缓存）

    Args:
        lc_code: LC 编号，如 "C192666"
        bom_uuid: BOM 清单 UUID（可选）

    Returns:
        零件信息字典或 None
    """
    # 1. 检查本地缓存
    if lc_code in _cache:
        logger.debug("LCSC cache hit: %s", lc_code)
        return _cache[lc_code]

    # 2. 通过 HTTP 服务查询
    params = {"lcCode": lc_code}
    if bom_uuid:
        params["bomUuid"] = bom_uuid

    data = _http_get("/query", params=params)
    if data is not None:
        if "error" in data:
            logger.error("LCSC query error: %s (lc_code=%s)", data["error"], lc_code)
            # 检查是否是登录问题，尝试获取更多诊断信息
            if "login" in data["error"].lower() or "session" in data["error"].lower():
                try:
                    health = _http_get("/health", timeout=3.0)
                    logger.error("LCSC health: %s", health)
                except:
                    pass
            return None
        # 缓存结果
        _cache[lc_code] = data
        _save_cache()
        return data

    # 3. 降级到 subprocess 模式
    logger.warning("HTTP query failed, falling back to subprocess")
    result = _query_lcsc_part_subprocess(lc_code, bom_uuid)
    if result:
        _cache[lc_code] = result
        _save_cache()
    return result


def _query_lcsc_part_subprocess(lc_code: str, bom_uuid: str = None) -> Optional[Dict[str, Any]]:
    """subprocess 降级查询"""
    try:
        cmd = ["node", SCRAPER_SCRIPT, "query", lc_code]
        if bom_uuid:
            cmd.append(bom_uuid)

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
            cwd=os.path.dirname(SCRAPER_SCRIPT),
            encoding="utf-8",
            errors="replace",
        )

        if result.returncode != 0:
            logger.error("LCSC subprocess query failed: %s", result.stderr)
            return None

        output = result.stdout
        json_start = output.find("{")
        if json_start == -1:
            return None

        data = json.loads(output[json_start:])
        if "error" in data:
            return None
        return data
    except FileNotFoundError:
        logger.warning("Node.js not installed, LCSC query unavailable")
        return None
    except Exception as e:
        logger.error("LCSC subprocess query exception: %s", e)
        return None


def query_lcsc_list(bom_uuid: str = None) -> List[Dict[str, Any]]:
    """查询 BOM 清单所有物料"""
    params = {}
    if bom_uuid:
        params["bomUuid"] = bom_uuid

    data = _http_get("/list", params=params)
    if data is not None:
        return data.get("items", [])

    return []


def check_cookies() -> Dict[str, Any]:
    """检查 cookie 状态"""
    data = _http_get("/cookies", timeout=5.0)
    if data is not None:
        return {
            "status": "ok",
            "exists": data.get("exists", False),
            "count": data.get("count", 0),
            "sessionReady": data.get("sessionReady", False),
        }
    return {"status": "error", "exists": False, "count": 0, "sessionReady": False, "message": "Scraper server not running"}


def clear_lcsc_cache() -> Dict[str, Any]:
    """清空 LCSC 查询缓存"""
    global _cache
    count = len(_cache)
    _cache = {}
    _save_cache()
    return {"message": f"Cleared {count} cached entries", "cleared": count}


# 预加载状态
_preload_status = {
    "running": False,
    "total": 0,
    "done": 0,
    "cached": 0,
    "queried": 0,
    "failed": 0,
    "current": "",
}


def get_preload_status() -> Dict[str, Any]:
    """获取预加载状态"""
    return dict(_preload_status)


def preload_inventory_lc_codes():
    """预加载所有库存 LC 编号到缓存（后台线程运行，批量查询优化）"""
    global _preload_status

    if _preload_status["running"]:
        return

    _preload_status["running"] = True
    _preload_status["done"] = 0
    _preload_status["cached"] = 0
    _preload_status["queried"] = 0
    _preload_status["failed"] = 0

    try:
        from db.database import SessionLocal
        from sqlalchemy import text

        db = SessionLocal()
        try:
            rows = db.execute(text(
                "SELECT DISTINCT lc_number FROM parts "
                "WHERE lc_number IS NOT NULL AND lc_number != '' AND lc_number LIKE 'C%'"
            )).fetchall()
            lc_codes = [r[0] for r in rows]
        finally:
            db.close()

        # 过滤出未缓存的编号
        uncached = [c for c in lc_codes if c not in _cache]
        _preload_status["total"] = len(lc_codes)
        _preload_status["cached"] = len(lc_codes) - len(uncached)
        _preload_status["done"] = _preload_status["cached"]

        if not uncached:
            logger.info("All %d LC codes already cached", len(lc_codes))
            return

        logger.info("Preloading %d LC codes (%d cached, %d to query)...",
                     len(lc_codes), _preload_status["cached"], len(uncached))

        # 批量查询（每批 20 个）
        BATCH_SIZE = 20
        for i in range(0, len(uncached), BATCH_SIZE):
            batch = uncached[i:i + BATCH_SIZE]
            _preload_status["current"] = batch[0] + '~' + batch[-1]

            try:
                import httpx
                with httpx.Client(timeout=120.0) as client:
                    resp = client.post(
                        f"{SCRAPER_BASE_URL}/batch_query",
                        json={"lcCodes": batch},
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        batch_results = data.get("results", {})
                        batch_errors = data.get("errors", [])

                        # 缓存结果
                        for code, result in batch_results.items():
                            if result and "error" not in result:
                                _cache[code] = result
                                _preload_status["queried"] += 1
                            else:
                                _preload_status["failed"] += 1

                        _preload_status["failed"] += len(batch_errors)
                        _save_cache()

                        logger.info("Batch %d/%d: %d found, %d errors",
                                     i // BATCH_SIZE + 1,
                                     (len(uncached) + BATCH_SIZE - 1) // BATCH_SIZE,
                                     len(batch_results), len(batch_errors))
                    else:
                        logger.warning("Batch query HTTP error: %d", resp.status_code)
                        _preload_status["failed"] += len(batch)
            except Exception as e:
                logger.warning("Batch query failed: %s", e)
                _preload_status["failed"] += len(batch)

            _preload_status["done"] = _preload_status["cached"] + min(i + BATCH_SIZE, len(uncached))

        logger.info("Preload complete: %d total, %d cached, %d queried, %d failed",
                     _preload_status["total"], _preload_status["cached"],
                     _preload_status["queried"], _preload_status["failed"])
    except Exception as e:
        logger.error("Preload failed: %s", e)
    finally:
        _preload_status["running"] = False
        _preload_status["current"] = ""
