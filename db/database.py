"""
数据库配置模块
提供数据库连接、会话管理和基础配置
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 数据库配置
class DatabaseConfig:
    """数据库配置类"""
    
    # 默认数据库URL（开发环境）
    DEFAULT_DATABASE_URL = "sqlite:///./db/partshelf.db"
    
    # 获取数据库URL
    @staticmethod
    def get_database_url():
        """从环境变量获取数据库URL，如果没有则使用默认值"""
        return os.getenv("DATABASE_URL", DatabaseConfig.DEFAULT_DATABASE_URL)
    
    # 数据库连接参数
    @staticmethod
    def get_engine_kwargs():
        """获取数据库引擎参数"""
        return {
            "echo": True,  # 是否显示SQL语句（开发环境开启）
            "pool_pre_ping": True,  # 连接池预检查
            "pool_recycle": 3600,  # 连接回收时间（秒）
            "connect_args": {"check_same_thread": False},  # SQLite连接参数
        }

# 创建数据库引擎
SQLALCHEMY_DATABASE_URL = DatabaseConfig.get_database_url()
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    **DatabaseConfig.get_engine_kwargs()
)

# 创建会话工厂
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine
)

# 声明式基类
Base = declarative_base()

def get_db():
    """
    获取数据库会话的依赖函数
    使用方式：
        db = next(get_db())
    或使用FastAPI的Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """创建所有数据库表"""
    Base.metadata.create_all(bind=engine)

def drop_tables():
    """删除所有数据库表（谨慎使用）"""
    Base.metadata.drop_all(bind=engine)

def get_table_names():
    """获取所有表名"""
    from sqlalchemy import inspect
    inspector = inspect(engine)
    return inspector.get_table_names()
