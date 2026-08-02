"""
API 认证依赖
提供 get_current_user_required 依赖函数
"""

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from db.database import get_db
from app.api.auth_routes import get_current_user_from_request


async def get_current_user_required(request: Request, db: Session = Depends(get_db)):
    """获取当前登录用户，未登录则返回 401"""
    user = get_current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")
    return user
