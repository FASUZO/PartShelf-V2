import sys
import os

# 获取当前文件所在目录的父目录（即项目根目录）
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.dirname(project_root))

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.api import inventory_api_routes, web_routes, project_api_routes
from db.database import engine, Base
import uvicorn  # 新增这行导入

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(web_routes.router, tags=["Web Pages"])
app.include_router(inventory_api_routes.router,prefix="/api/inventory")
app.include_router(project_api_routes.router,prefix="/api/project")

# 新增：允许通过 python app/main.py 直接启动
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)