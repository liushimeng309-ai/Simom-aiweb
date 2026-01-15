#!/bin/bash

# 启动本地服务器用于预览网站
# 使用方法：bash start-server.sh 或 ./start-server.sh

PORT=${1:-8000}

echo "🚀 启动本地服务器..."
echo "📂 项目目录: $(pwd)"
echo "🌐 访问地址: http://localhost:${PORT}"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

# 检查 Python 3
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
# 检查 Python 2
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer $PORT
else
    echo "❌ 错误：未找到 Python，请安装 Python 3"
    exit 1
fi
