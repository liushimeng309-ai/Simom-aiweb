# 每日 AI 设计情报

每天 0 点自动从官方设计站点抓取最新 AI 相关内容，并以站点大卡片平铺的形式展示。

## 数据来源

- [Material Design](https://m3.material.io/)
- [Microsoft Design](https://microsoft.design/)
- [Google Design](https://design.google/)
- [Figma](https://www.figma.com)

## 项目结构

```
.
├── index.html          # 主页面
├── styles.css          # 样式文件
├── app.js              # 前端脚本
├── data/
│   └── today.json      # 当天数据（由抓取脚本生成）
├── scripts/
│   └── crawler.js      # 抓取脚本
└── README.md           # 项目说明
```

## 数据格式

### today.json 结构

```json
{
  "date": "YYYY-MM-DD",
  "sites": [
    {
      "source": "material|microsoft|google|figma",
      "sourceName": "站点名称",
      "sourceUrl": "原站点URL",
      "updatedAt": "ISO 8601 时间",
      "updatedAtRelative": "相对时间文本",
      "items": [
        {
          "id": "唯一ID",
          "title": "标题",
          "url": "原文链接",
          "thumbnail": "缩略图URL",
          "summary": "摘要",
          "tags": ["标签1", "标签2"],
          "publishedAt": "ISO 8601 时间",
          "publishedAtRelative": "相对时间文本"
        }
      ]
    }
  ]
}
```

## 部署说明

### 静态部署

1. 将项目文件上传到静态托管服务（如 GitHub Pages、Vercel、Netlify）
2. 确保 `data/today.json` 文件可以被访问
3. 配置抓取脚本定时任务（见下方）

### 抓取脚本部署

#### 方式一：GitHub Actions（推荐）

1. 在项目根目录创建 `.github/workflows/crawl.yml`
2. 配置每天 0 点（UTC）运行抓取脚本
3. 脚本执行后提交 `data/today.json` 到仓库

#### 方式二：Cloudflare Workers Cron

1. 创建 Cloudflare Worker
2. 配置 Cron Trigger（`0 0 * * *` 每天 0 点）
3. 运行抓取脚本并保存到 Cloudflare KV 或 R2

#### 方式三：Vercel Cron

1. 在 `vercel.json` 中配置 Cron Job
2. 创建 API 路由执行抓取脚本
3. 将结果保存到 Vercel 存储或外部存储

## 开发

### 本地预览

**重要**：请不要直接双击打开 `index.html` 文件，因为浏览器会阻止加载本地 JSON 文件（CORS 限制）。

1. 启动本地服务器（推荐使用 Python）：
   ```bash
   # 方式一：使用启动脚本（推荐）
   bash start-server.sh
   # 或
   ./start-server.sh
   
   # 方式二：直接使用 Python 3
   python3 -m http.server 8000
   
   # 方式三：使用 Node.js
   npx serve
   ```

2. 在浏览器中访问 `http://localhost:8000`

3. 如果看到"数据加载失败"的提示，请检查：
   - 确保使用 `http://localhost:8000` 访问，而不是 `file://` 路径
   - 检查浏览器控制台（F12）的错误信息
   - 确认 `data/today.json` 文件存在且格式正确

### 更新数据

手动运行抓取脚本：
```bash
node scripts/crawler.js
```

## 注意事项

- 请遵守各网站的 robots.txt 和使用条款
- 抓取频率不要过高，避免给服务器造成压力
- 数据仅用于学习和导航，版权归原网站所有
