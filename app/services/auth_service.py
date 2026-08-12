"""
认证服务模块
提供密码哈希、JWT 创建/验证、默认用户种子
"""

import os
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from sqlalchemy.orm import Session

logger = logging.getLogger("partshelf.auth")

# 配置：SECRET_KEY 优先读环境变量，未设置则随机生成（每次重启失效，生产环境必须设置）
SECRET_KEY = os.getenv("SECRET_KEY") or secrets.token_hex(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 天

if not os.getenv("SECRET_KEY"):
    logger.warning("SECRET_KEY 未设置，使用随机密钥（重启后 token 失效）。生产环境请设置 SECRET_KEY 环境变量。")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码（bcrypt）"""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        # 兼容旧 SHA256 哈希：验证后自动升级
        return False


def get_password_hash(password: str) -> str:
    """获取密码哈希（bcrypt）"""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def is_legacy_hash(hashed_password: str) -> bool:
    """判断是否为旧 SHA256 哈希（非 bcrypt）"""
    return not hashed_password.startswith("$2")


def verify_legacy_password(plain_password: str, hashed_password: str) -> bool:
    """验证旧 SHA256 哈希"""
    import hashlib
    legacy_hash = hashlib.sha256(f"partshelf-salt-2024{plain_password}".encode()).hexdigest()
    return legacy_hash == hashed_password


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建 JWT token（PyJWT）"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """解码 JWT token（PyJWT）"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def authenticate_user(db: Session, username: str, password: str):
    """验证用户名密码（支持旧哈希自动升级）"""
    from app.models.user import User
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None

    # 优先用 bcrypt 验证
    if verify_password(password, user.hashed_password):
        return user

    # 兼容旧 SHA256 哈希
    if is_legacy_hash(user.hashed_password) and verify_legacy_password(password, user.hashed_password):
        # 自动升级为 bcrypt
        user.hashed_password = get_password_hash(password)
        db.commit()
        logger.info("用户 %s 密码已自动升级为 bcrypt", username)
        return user

    return None


def seed_default_user(db: Session):
    """种子数据：创建默认管理员账号"""
    from app.models.user import User

    existing = db.query(User).filter(User.username == "suzo").first()
    if existing:
        # 如果是旧哈希，升级为 bcrypt
        if is_legacy_hash(existing.hashed_password):
            existing.hashed_password = get_password_hash("suzo")
            db.commit()
            logger.info("默认管理员密码已升级为 bcrypt")
        return

    default_user = User(
        username="suzo",
        hashed_password=get_password_hash("suzo"),
        is_admin=True
    )
    db.add(default_user)
    db.commit()
    logger.info("默认管理员账号已创建: suzo")
