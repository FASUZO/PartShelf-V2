import sys
import os

# 获取当前文件所在目录的父目录（即项目根目录）
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.dirname(project_root))

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.api import inventory_api_routes, web_routes, project_api_routes, config_api_routes
from db.database import engine, Base
import uvicorn

Base.metadata.create_all(bind=engine)

# Seed default config data (idempotent)
from db.database import SessionLocal
from app.services.config_seed import seed_default_config


def migrate_database(db):
    """数据库迁移（幂等）"""
    from sqlalchemy import text, inspect

    # parts 表新增列
    cols = {c[1] for c in db.execute(text("PRAGMA table_info(parts)")).fetchall()}
    if 'category_id' not in cols:
        db.execute(text("ALTER TABLE parts ADD COLUMN category_id INTEGER"))
    if 'subcategory_id' not in cols:
        db.execute(text("ALTER TABLE parts ADD COLUMN subcategory_id INTEGER"))
    if 'part_number' not in cols:
        db.execute(text("ALTER TABLE parts ADD COLUMN part_number VARCHAR(32)"))

    # subcategories 表新增 letter 列
    sub_cols = {c[1] for c in db.execute(text("PRAGMA table_info(subcategories)")).fetchall()}
    if 'letter' not in sub_cols:
        db.execute(text("ALTER TABLE subcategories ADD COLUMN letter VARCHAR(1)"))

    # part_id_sequences 表（如果不存在则创建）
    inspector = inspect(engine)
    if 'part_id_sequences' not in inspector.get_table_names():
        db.execute(text("CREATE TABLE part_id_sequences (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL, subcategory_id INTEGER, next_seq INTEGER NOT NULL DEFAULT 1)"))

    # system_config 表（如果不存在则创建）
    if 'system_config' not in inspector.get_table_names():
        db.execute(text("CREATE TABLE system_config (id INTEGER PRIMARY KEY AUTOINCREMENT, key VARCHAR(64) UNIQUE NOT NULL, value TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"))

    db.commit()


with SessionLocal() as _db:
    migrate_database(_db)
    seed_default_config(_db)

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(web_routes.router, tags=["Web Pages"])
app.include_router(inventory_api_routes.router, prefix="/api/inventory")
app.include_router(project_api_routes.router, prefix="/api/project")
app.include_router(config_api_routes.router, prefix="/api/config", tags=["Config"])

# 新增：允许通过 python app/main.py 直接启动
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
