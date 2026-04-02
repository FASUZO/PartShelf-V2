FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY requirements.txt .

# 安装依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建数据目录
RUN mkdir -p /app/data

# 设置启动脚本可执行权限
RUN chmod +x start.sh

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["./start.sh"]