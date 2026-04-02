# PartShelf 部署指南

## 项目概述
PartShelf 是一个零件库存管理系统，支持Excel导入、库存管理和项目管理功能。

## 清理后的项目结构
```
PartShelf-main/
├── .env                    # 环境配置文件
├── LICENSE                 # 许可证文件
├── README.md              # 项目说明
├── DEPLOYMENT.md          # 部署指南（本文件）
├── app/                   # 应用主目录
│   ├── __init__.py
│   ├── api/               # API路由
│   ├── crud/              # 数据库操作
│   ├── main.py            # 主应用入口
│   ├── models/            # 数据模型
│   ├── schemas/           # Pydantic模式
│   └── services/          # 业务逻辑服务
├── db/                    # 数据库配置
│   ├── __init__.py
│   └── database.py        # 数据库连接
├── init_database.py       # 数据库初始化脚本
├── requirements.txt       # Python依赖
├── static/                # 静态资源
│   ├── css/
│   ├── favicon.ico
│   └── js/
├── templates/             # HTML模板
│   ├── component_details.html
│   ├── inventory.html
│   └── projects.html
└── test.db               # SQLite数据库文件
```

## 部署步骤

### 1. 环境准备
确保系统已安装 Python 3.8+ 和 pip。

### 2. 安装依赖

#### 方法一：使用虚拟环境（推荐）
```bash
# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

#### 方法二：Docker部署

##### 方式一：使用docker-compose（推荐用于生产环境）

1. **启动服务**（后台长久运行）：
   ```bash
   docker-compose up -d
   ```

2. **查看服务状态**：
   ```bash
   docker-compose ps
   ```

3. **查看日志**：
   ```bash
   docker-compose logs -f
   ```

4. **停止服务**：
   ```bash
   docker-compose down
   ```

##### 方式二：直接使用docker命令

1. **构建镜像**：
   ```bash
   docker build -t partshelf .
   ```

2. **运行容器（后台运行）**：
   ```bash
   docker run -d --name partshelf -p 1999:8000 partshelf
   ```

3. **查看容器状态**：
   ```bash
   docker ps
   ```

4. **查看容器日志**：
   ```bash
   docker logs -f partshelf
   ```

5. **停止容器**：
   ```bash
   docker stop partshelf
   ```

#### 方法三：直接安装（不推荐，可能破坏系统）
```bash
pip install --break-system-packages -r requirements.txt
```

### 3. 数据库初始化
```bash
python init_database.py
```
此命令会创建所有必要的数据库表。

### 4. 启动应用
```bash
python -m app.main
```
或直接运行：
```bash
python app/main.py
```

### 5. 访问应用
应用启动后，在浏览器中访问：
- http://localhost:8000 (默认端口)

## 功能特性
- ✅ Excel文件导入零件数据
- ✅ 库存管理功能
- ✅ 项目管理功能
- ✅ 制造商、封装、类型管理
- ✅ 响应式Web界面

## 环境配置
在 `.env` 文件中配置环境变量（如果需要）：
- 数据库连接
- 端口设置
- 其他应用配置

## 注意事项
- 项目已清理所有测试和调试文件
- 数据库已重置为干净状态
- 所有缓存文件已删除
- 只保留生产环境必要的文件