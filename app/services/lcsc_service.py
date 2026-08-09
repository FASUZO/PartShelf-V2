"""
LCSC 查询服务
通过 Node.js playwright 脚本查询立创商城 BOM 数据
"""

import subprocess
import json
import os
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger("partshelf.lcsc")

# scraper 脚本路径
SCRAPER_SCRIPT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "lcsc-playwright-scraper.mjs")


def query_lcsc_part(lc_code: str, bom_uuid: str = None) -> Optional[Dict[str, Any]]:
    """
    查询 LCSC 零件信息
    
    Args:
        lc_code: LC 编号，如 "C192666"
        bom_uuid: BOM 清单 UUID（可选）
    
    Returns:
        零件信息字典或 None
    """
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
            encoding='utf-8',
            errors='replace'
        )
        
        if result.returncode != 0:
            logger.error(f"LCSC query failed: {result.stderr}")
            return None
        
        # 解析 JSON 输出（跳过前面的日志行）
        output = result.stdout
        # 找到 JSON 开始的位置
        json_start = output.find('{')
        if json_start == -1:
            logger.error(f"No JSON found in output: {output}")
            return None
        
        json_str = output[json_start:]
        data = json.loads(json_str)
        
        if "error" in data:
            logger.error(f"LCSC query error: {data['error']}")
            return None
        
        return data
    except subprocess.TimeoutExpired:
        logger.error("LCSC query timeout")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LCSC response: {e}")
        return None
    except Exception as e:
        logger.error(f"LCSC query exception: {e}")
        return None


def query_lcsc_list(bom_uuid: str = None) -> List[Dict[str, Any]]:
    """
    查询 BOM 清单所有物料
    
    Args:
        bom_uuid: BOM 清单 UUID（可选）
    
    Returns:
        物料列表
    """
    try:
        cmd = ["node", SCRAPER_SCRIPT, "list"]
        if bom_uuid:
            cmd.append(bom_uuid)
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            cwd=os.path.dirname(SCRAPER_SCRIPT),
            encoding='utf-8',
            errors='replace'
        )
        
        if result.returncode != 0:
            logger.error(f"LCSC list failed: {result.stderr}")
            return []
        
        # 从输出中提取数量信息
        output = result.stdout
        if "Found" in output and "items:" in output:
            # 解析列表输出
            items = []
            lines = output.split('\n')
            for line in lines:
                if line.startswith('- '):
                    # 解析格式: - C192666: TJ-S1608SW6TGLC7K-A5 (TOGIALED(统佳)) - 现货
                    parts = line[2:].split(': ', 1)
                    if len(parts) == 2:
                        lc_code = parts[0]
                        rest = parts[1]
                        model_brand_status = rest.split(' (', 1)
                        if len(model_brand_status) == 2:
                            model = model_brand_status[0]
                            brand_status = model_brand_status[1].split(') - ', 1)
                            if len(brand_status) == 2:
                                brand = brand_status[0]
                                status = brand_status[1]
                                items.append({
                                    "lcCode": lc_code,
                                    "productModel": model,
                                    "brand": brand,
                                    "stockStatus": "now" if "现货" in status else "future"
                                })
            return items
        
        return []
    except Exception as e:
        logger.error(f"LCSC list exception: {e}")
        return []


def check_cookies() -> Dict[str, Any]:
    """
    检查 cookie 状态
    
    Returns:
        cookie 状态信息
    """
    try:
        result = subprocess.run(
            ["node", SCRAPER_SCRIPT, "cookies"],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=os.path.dirname(SCRAPER_SCRIPT),
            encoding='utf-8',
            errors='replace'
        )
        
        if result.returncode == 0:
            return {"status": "ok", "message": result.stdout.strip()}
        else:
            return {"status": "error", "message": result.stderr}
    except Exception as e:
        return {"status": "error", "message": str(e)}
