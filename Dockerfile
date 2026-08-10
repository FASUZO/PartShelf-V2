FROM python:3.11-slim

# 安装 Node.js 20.x (Playwright 要求 >= 20)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 安装 Playwright 浏览器依赖
RUN npx playwright install-deps chromium && \
    npx playwright install chromium

# 设置工作目录
WORKDIR /app

# 配置pip使用国内镜像源
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制 package.json 并安装 Node.js 依赖
COPY package.json .
RUN npm install --production

# 复制应用代码
COPY . .

# 创建数据目录
RUN mkdir -p /app/data /app/db

# 创建空的 cookies 文件（如果不存在）
RUN touch /app/data/lcsc-cookies.json && echo '{"cookies":[]}' > /app/data/lcsc-cookies.json

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]