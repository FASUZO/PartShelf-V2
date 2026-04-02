# PartShelf V2 - 电子元器件库存管理系统

一个现代化的电子元器件库存管理系统，具有智能批量导入、一键出库、库存历史记录等功能，采用模块化架构设计，易于维护和扩展。

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ 功能特性

### 📦 库存管理
- ✅ 添加、编辑和删除电子元件
- ✅ 实时库存数量跟踪
- ✅ 按类型、封装、制造商分类管理
- ✅ 库存预警（低库存提示）
- ✅ 单件入库/出库操作

### 📊 批量操作
- ✅ CSV/Excel 批量导入
- ✅ 一键批量出库（智能匹配）
- ✅ 批量入库功能
- ✅ 数据导出（CSV/Excel）
- ✅ 智能零件匹配算法

### 📝 历史记录
- ✅ 完整的库存操作历史
- ✅ 操作类型追踪（入库/出库/调整）
- ✅ 数量变化记录
- ✅ 操作备注支持
- ✅ 历史数据分页查询

### 🔍 高级筛选
- ✅ 多条件组合搜索
- ✅ 可筛选字段搜索（制造商/封装/类型）
- ✅ 表头排序功能
- ✅ 分页显示
- ✅ 快速搜索

### 🎨 用户界面
- ✅ 响应式设计
- ✅ 现代化 UI（Bootstrap 5）
- ✅ 流畅动画效果
- ✅ 实时操作反馈
- ✅ 模块化前端架构

## 🛠️ 技术栈

### 后端
- **Python 3.8+** - 编程语言
- **FastAPI** - 高性能 Web 框架
- **SQLAlchemy** - ORM 数据库操作
- **SQLite** - 轻量级数据库
- **Pydantic** - 数据验证

### 前端
- **HTML5/CSS3** - 页面结构和样式
- **JavaScript (ES6+)** - 交互逻辑
- **Bootstrap 5** - UI 框架
- **Font Awesome** - 图标库
- **模块化架构** - 8个功能模块

### 数据处理
- **pandas** - 数据处理和分析
- **openpyxl** - Excel 文件处理
- **python-multipart** - 文件上传支持

## 📁 项目结构

```
PartShelf-V2/
├── app/                      # 应用主目录
│   ├── api/                  # API 路由
│   │   ├── inventory_api_routes.py   # 库存管理API
│   │   ├── project_api_routes.py     # 项目管理API
│   │   └── web_routes.py             # Web页面路由
│   ├── crud/                 # 数据库操作层
│   ├── models/               # 数据模型
│   ├── schemas/              # Pydantic 数据验证
│   ├── services/             # 业务逻辑层
│   └── main.py               # 应用入口
├── db/                       # 数据库
│   ├── database.py           # 数据库配置
│   └── partshelf.db          # SQLite 数据库文件
├── static/                   # 静态资源
│   ├── css/                  # 样式文件
│   │   ├── bootstrap.css     # Bootstrap 样式
│   │   └── custom.css        # 自定义样式
│   ├── js/                   # JavaScript 文件
│   │   ├── inventory/        # 库存管理模块（8个模块）
│   │   │   ├── utils.js              # 工具函数
│   │   │   ├── cache.js              # 数据缓存
│   │   │   ├── filter.js             # 筛选搜索
│   │   │   ├── table.js              # 表格排序
│   │   │   ├── stock-operations.js   # 库存操作
│   │   │   ├── batch-operations.js   # 批量操作
│   │   │   ├── history.js            # 历史记录
│   │   │   └── main.js               # 主入口
│   │   ├── bootstrap.bundle.js
│   │   ├── projects.js
│   │   └── project_details.js
│   └── favicon.ico
├── templates/                # HTML 模板
│   ├── inventory.html        # 库存管理页面
│   ├── projects.html         # 项目管理页面
│   ├── project_details.html  # 项目详情页面
│   └── component_details.html # 元件详情页面
├── Dockerfile                # Docker 构建文件
├── docker-compose.yml        # Docker 编排
├── requirements.txt          # Python 依赖
└── .env                      # 环境变量配置
```

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

详见下方 [Docker 部署教程](#-docker-部署教程)

### 方式二：本地开发环境

#### 1. 环境要求
- Python 3.8 或更高版本
- pip 包管理器

#### 2. 安装步骤

```bash
# 克隆项目
git clone <repository-url>
cd PartShelf-V2

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动应用
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

访问 http://localhost:8000 查看应用

## 🐳 Docker 部署教程

### 前置要求

- 安装 [Docker](https://docs.docker.com/get-docker/)
- 安装 [Docker Compose](https://docs.docker.com/compose/install/)（Docker Desktop 已包含）

### 方式一：使用 Docker Compose（推荐）

#### 1. 配置环境变量

创建或编辑 `.env` 文件：

```bash
# 应用配置
APP_HOST=0.0.0.0
APP_PORT=8000

# 数据库配置
DATABASE_URL=sqlite:///./db/partshelf.db
```

#### 2. 构建并启动容器

```bash
# 构建并启动（后台运行）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看运行状态
docker-compose ps
```

#### 3. 访问应用

打开浏览器访问：http://localhost:8000

#### 4. 常用命令

```bash
# 停止容器
docker-compose down

# 重启容器
docker-compose restart

# 查看日志
docker-compose logs -f

# 进入容器
docker-compose exec app bash

# 重新构建并启动
docker-compose up -d --build

# 停止并删除容器、网络
docker-compose down -v
```

### 方式二：使用 Dockerfile 手动构建

#### 1. 构建镜像

```bash
# 构建 Docker 镜像
docker build -t partshelf-v2 .

# 查看镜像
docker images
```

#### 2. 运行容器

```bash
# 创建数据持久化目录
mkdir -p ./data/db

# 运行容器
docker run -d \
  --name partshelf \
  -p 8000:8000 \
  -v $(pwd)/data/db:/app/db \
  -e DATABASE_URL=sqlite:///./db/partshelf.db \
  partshelf-v2
```

**Windows PowerShell 版本：**

```powershell
# 创建数据持久化目录
New-Item -ItemType Directory -Force -Path .\data\db

# 运行容器
docker run -d `
  --name partshelf `
  -p 8000:8000 `
  -v ${PWD}\data\db:/app/db `
  -e DATABASE_URL=sqlite:///./db/partshelf.db `
  partshelf-v2
```

#### 3. 管理容器

```bash
# 查看运行状态
docker ps

# 查看日志
docker logs -f partshelf

# 停止容器
docker stop partshelf

# 启动容器
docker start partshelf

# 删除容器
docker rm -f partshelf

# 进入容器
docker exec -it partshelf bash
```

### 数据持久化

数据持久化非常重要，否则容器删除后数据会丢失。

#### 使用 Docker Compose（已配置）

`docker-compose.yml` 已配置数据卷：

```yaml
volumes:
  - ./db:/app/db
```

数据库文件会保存在宿主机的 `./db` 目录。

#### 使用 Docker 命令

```bash
# 挂载数据库目录
docker run -d \
  -p 8000:8000 \
  -v $(pwd)/db:/app/db \
  partshelf-v2
```

### 生产环境部署

#### 1. 使用 Nginx 反向代理

创建 `nginx.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

更新 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./db:/app/db
    environment:
      - DATABASE_URL=sqlite:///./db/partshelf.db
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - app
    restart: unless-stopped
```

#### 2. 使用 HTTPS（Let's Encrypt）

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

#### 3. 性能优化

更新 `docker-compose.yml`：

```yaml
services:
  app:
    build: .
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    # ... 其他配置
```

### 故障排查

#### 1. 查看容器日志

```bash
docker-compose logs -f
docker logs partshelf
```

#### 2. 数据库问题

```bash
# 进入容器
docker-compose exec app bash

# 检查数据库文件
ls -la db/

# 检查数据库权限
chmod 666 db/partshelf.db
```

#### 3. 端口冲突

```bash
# 查看端口占用
# Windows:
netstat -ano | findstr :8000

# Linux/Mac:
lsof -i :8000

# 修改端口
docker-compose.yml 中修改 ports: "8001:8000"
```

#### 4. 重新初始化数据库

```bash
# 停止容器
docker-compose down

# 备份数据库
cp db/partshelf.db db/partshelf.db.backup

# 删除数据库
cp db/partshelf.db db/partshelf.db.backup

# 重启容器
docker-compose up -d
```

## 📖 使用说明

### 基本操作

1. **浏览库存** - 访问主页查看所有电子元件
2. **添加元件** - 点击"添加零件"按钮录入新元件
3. **批量导入** - 通过 CSV/Excel 文件批量导入
4. **搜索筛选** - 使用搜索框和高级筛选查找元件
5. **库存操作** - 点击入库/出库按钮调整库存

### 批量出库流程

1. 准备 CSV 文件（包含 Name 和 Quantity 列）
2. 点击"一键出库"上传文件
3. 系统自动匹配库存
4. 确认匹配结果
5. 执行批量出库

### 库存历史查询

1. 点击"使用历史"菜单
2. 可按操作类型筛选
3. 查看所有库存变更记录

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 贡献步骤

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 代码规范

- Python: 遵循 PEP 8 规范
- JavaScript: 使用模块化架构
- 注释: 所有函数添加中文注释
- 提交: 使用清晰的提交信息

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 📮 联系方式

- 项目问题: [GitHub Issues](https://github.com/FASUZO/PartShelf-V2/issues)
- 邮件联系: fasuzo@qq.com

## 🙏 致谢

感谢以下开源项目：

- [FastAPI](https://fastapi.tiangolo.com/)
- [Bootstrap](https://getbootstrap.com/)
- [SQLAlchemy](https://www.sqlalchemy.org/)
- [Font Awesome](https://fontawesome.com/)

---

⭐ 如果这个项目对您有帮助，请给个 Star！

