# 部署指南

## 快速开始

### 1. 本地预览

使用 Python 启动本地服务器：

```bash
python3 -m http.server 8000
```

或使用 Node.js：

```bash
npx serve
```

然后访问 `http://localhost:8000`

### 2. 部署到静态托管服务

#### Vercel

1. 安装 Vercel CLI：
   ```bash
   npm i -g vercel
   ```

2. 在项目根目录运行：
   ```bash
   vercel
   ```

3. 配置 GitHub Actions 自动抓取（见下方）

#### Netlify

1. 在 Netlify 上创建新站点
2. 连接 GitHub 仓库
3. 构建设置：
   - 构建命令：留空（静态站点）
   - 发布目录：`/`
4. 配置 GitHub Actions 自动抓取（见下方）

#### GitHub Pages

1. 在仓库设置中启用 GitHub Pages
2. 选择分支和目录（通常选择 `main` 分支的 `/` 目录）
3. 配置 GitHub Actions 自动抓取（见下方）

### 3. 配置自动抓取

#### 使用 GitHub Actions（推荐）

1. 确保 `.github/workflows/crawl.yml` 文件已存在
2. 在 GitHub 仓库的 Settings > Actions 中启用 Actions
3. 脚本会在每天 0 点 UTC（北京时间 8 点）自动运行
4. 抓取完成后会自动提交 `data/today.json` 到仓库

#### 手动配置定时任务

如果使用其他托管服务，可以使用以下方式：

1. **Cloudflare Workers Cron**：
   - 创建 Cloudflare Worker
   - 配置 Cron Trigger（`0 0 * * *`）
   - 在 Worker 中运行抓取脚本

2. **服务器 Cron Job**：
   ```bash
   # 编辑 crontab
   crontab -e
   
   # 添加以下行（每天 0 点运行）
   0 0 * * * cd /path/to/project/scripts && node crawler.js
   ```

### 4. 配置抓取脚本

**重要**：当前抓取脚本提供了基础框架，但需要根据各网站的实际 HTML 结构实现解析逻辑。

1. 安装依赖：
   ```bash
   cd scripts
   npm install
   ```

2. 实现各站点的抓取逻辑：
   - 编辑 `scripts/crawler.js`
   - 在每个 `fetchFrom*` 函数中实现实际的 HTML 解析
   - 推荐使用 `cheerio` 库解析 HTML

3. 测试抓取脚本：
   ```bash
   cd scripts
   npm run crawl
   ```

### 5. 数据结构

抓取脚本需要生成符合以下格式的 JSON：

```json
{
  "date": "2026-01-15",
  "sites": [
    {
      "source": "material",
      "sourceName": "Material Design",
      "sourceUrl": "https://m3.material.io/",
      "updatedAt": "2026-01-15T00:05:00Z",
      "updatedAtRelative": "24分钟前",
      "items": [
        {
          "id": "material-001",
          "title": "文章标题",
          "url": "https://example.com/article",
          "thumbnail": "https://example.com/image.jpg",
          "summary": "文章摘要",
          "tags": ["AI", "Design"],
          "publishedAt": "2026-01-14T14:00:00Z",
          "publishedAtRelative": "10小时前"
        }
      ]
    }
  ]
}
```

## 注意事项

1. **遵守网站条款**：
   - 请遵守各网站的 robots.txt 和使用条款
   - 不要过于频繁地请求

2. **错误处理**：
   - 脚本已包含基本错误处理
   - 即使某个站点抓取失败，也会继续处理其他站点

3. **数据更新**：
   - 确保 `data/today.json` 文件可以被前端访问
   - 如果使用 CORS，可能需要配置跨域策略

4. **性能优化**：
   - 考虑缓存缩略图
   - 压缩 JSON 文件大小（可选）

## 故障排除

### 前端无法加载数据

1. 检查 `data/today.json` 是否存在
2. 检查 JSON 格式是否正确
3. 检查浏览器控制台的错误信息
4. 检查服务器是否正确配置了 JSON 文件的 MIME 类型

### 抓取脚本失败

1. 检查网络连接
2. 检查网站是否可访问
3. 检查 HTML 结构是否发生变化
4. 查看脚本输出的错误信息

### GitHub Actions 未运行

1. 检查 Actions 是否已启用
2. 检查 workflow 文件语法是否正确
3. 查看 Actions 运行日志
