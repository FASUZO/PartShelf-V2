"""
认证服务模块
提供密码哈希、JWT 创建/验证、默认用户种子
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

logger = logging.getLogger("partshelf.auth")

# 配置
SECRET_KEY = os.getenv("SECRET_KEY", "partshelf-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 天

# 密码哈希
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """获取密码哈希"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建 JWT token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """解码 JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def authenticate_user(db: Session, username: str, password: str):
    """验证用户名密码"""
    from app.models.user import User
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def seed_default_user(db: Session):
    """种子数据：创建默认管理员账号"""
    from app.models.user import User

    existing = db.query(User).filter(User.username == "suzo").first()
    if existing:
        return

    default_user = User(
        username="suzo",
        hashed_password=get_password_hash("suzo"),
        is_admin=True
    )
    db.add(default_user)
    db.commit()
    logger.info("默认管理员账号已创建: suzo")
