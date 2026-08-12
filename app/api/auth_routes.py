"""
认证 API 路由
提供登录/登出/获取当前用户/修改密码接口
"""

import logging
from fastapi import APIRouter, Depends, Response, Request, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db.database import get_db
from app.services.auth_service import authenticate_user, create_access_token, decode_token, get_password_hash, verify_password

logger = logging.getLogger("partshelf.auth.api")

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """登录"""
    user = authenticate_user(db, body.username, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_access_token({"sub": user.username, "uid": user.id})

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,  # 7 天
        samesite="lax"
    )

    return {"success": True, "username": user.username, "is_admin": user.is_admin}


@router.post("/logout")
def logout(response: Response):
    """登出"""
    response.delete_cookie("access_token")
    return {"success": True}


@router.get("/me")
def get_me(request: Request, db: Session = Depends(get_db)):
    """获取当前用户信息"""
    user = get_current_user_from_request(request, db)
    if not user:
        return {"authenticated": False}
    return {
        "authenticated": True,
        "username": user.username,
        "is_admin": user.is_admin
    }


@router.post("/change_password")
def change_password(body: ChangePasswordRequest, request: Request, db: Session = Depends(get_db)):
    """修改密码"""
    user = get_current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    # 验证旧密码
    if not verify_password(body.old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="旧密码错误")

    # 验证新密码
    if len(body.new_password) < 4:
        raise HTTPException(status_code=400, detail="新密码至少4位")

    # 更新密码
    user.hashed_password = get_password_hash(body.new_password)
    db.commit()

    logger.info("用户 %s 修改了密码", user.username)
    return {"success": True, "message": "密码修改成功"}


def get_current_user_from_request(request: Request, db: Session):
    """从请求中获取当前用户"""
    from app.models.user import User

    token = request.cookies.get("access_token")
    if not token:
        return None

    payload = decode_token(token)
    if not payload:
        return None

    username = payload.get("sub")
    if not username:
        return None

    return db.query(User).filter(User.username == username).first()
