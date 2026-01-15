/**
 * AI 设计资讯抓取脚本
 * 每天 0 点自动抓取 4 个官方设计网站的最新 AI 相关内容
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ====================
// 配置
// ====================
const CONFIG = {
  OUTPUT_PATH: path.join(__dirname, '../data/today.json'),
  AI_KEYWORDS: [
    'AI', 'Artificial Intelligence', 'Machine Learning',
    '人工智能', 'Copilot', 'Gemini', '生成式', 'ChatGPT',
    'Assistant', 'Agent', 'Auto', 'Smart'
  ],
  MAX_ITEMS_PER_SITE: 10,
  REQUEST_DELAY: 1000, // 请求延迟（毫秒）
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// ====================
// 工具函数
// ====================

// HTTP 请求封装
function fetch(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7'
      }
    };

    client.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 检查文本是否包含 AI 关键词
function isAIRelated(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return CONFIG.AI_KEYWORDS.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
}

// 计算相对时间
function getRelativeTime(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return '刚刚';
    } else if (diffMins < 60) {
      return `${diffMins}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    return '';
  }
}

// 格式化日期
function formatDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ====================
// 站点抓取器（基础框架）
// ====================

/**
 * Material Design 抓取器
 * 注意：实际实现需要根据 m3.material.io 的实际HTML结构调整
 */
async function fetchFromMaterial() {
  try {
    const url = 'https://m3.material.io/';
    const html = await fetch(url);
    
    // TODO: 使用 cheerio 或其他 HTML 解析库解析页面
    // 这里提供一个基础框架，实际需要根据网站结构调整
    const items = [];
    
    // 示例：假设找到了文章列表
    // 需要解析 HTML，提取文章链接、标题、缩略图等信息
    
    // 优先过滤 AI 相关内容
    const aiItems = items.filter(item => 
      isAIRelated(item.title) || isAIRelated(item.summary)
    );
    
    // 如果 AI 相关条目不足 10 条，补充最近的其他条目
    let resultItems = [...aiItems];
    if (resultItems.length < CONFIG.MAX_ITEMS_PER_SITE) {
      const otherItems = items.filter(item => 
        !isAIRelated(item.title) && !isAIRelated(item.summary)
      );
      resultItems = [...aiItems, ...otherItems];
    }
    
    // 按时间排序，取前 10 条
    return resultItems
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
      .slice(0, CONFIG.MAX_ITEMS_PER_SITE);
      
  } catch (error) {
    console.error('Material Design 抓取失败:', error.message);
    return [];
  }
}

/**
 * Microsoft Design 抓取器
 */
async function fetchFromMicrosoftDesign() {
  try {
    const url = 'https://microsoft.design/';
    const html = await fetch(url);
    
    // TODO: 解析 microsoft.design 的文章列表
    const items = [];
    
    // 优先过滤 AI 相关内容
    const aiItems = items.filter(item => 
      isAIRelated(item.title) || isAIRelated(item.summary)
    );
    
    // 如果 AI 相关条目不足 10 条，补充最近的其他条目
    let resultItems = [...aiItems];
    if (resultItems.length < CONFIG.MAX_ITEMS_PER_SITE) {
      const otherItems = items.filter(item => 
        !isAIRelated(item.title) && !isAIRelated(item.summary)
      );
      resultItems = [...aiItems, ...otherItems];
    }
    
    // 按时间排序，取前 10 条
    return resultItems
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
      .slice(0, CONFIG.MAX_ITEMS_PER_SITE);
      
  } catch (error) {
    console.error('Microsoft Design 抓取失败:', error.message);
    return [];
  }
}

/**
 * Google Design 抓取器
 */
async function fetchFromGoogleDesign() {
  try {
    const url = 'https://design.google/';
    const html = await fetch(url);
    
    // TODO: 解析 design.google 的文章列表
    const items = [];
    
    // 优先过滤 AI 相关内容
    const aiItems = items.filter(item => 
      isAIRelated(item.title) || isAIRelated(item.summary)
    );
    
    // 如果 AI 相关条目不足 10 条，补充最近的其他条目
    let resultItems = [...aiItems];
    if (resultItems.length < CONFIG.MAX_ITEMS_PER_SITE) {
      const otherItems = items.filter(item => 
        !isAIRelated(item.title) && !isAIRelated(item.summary)
      );
      resultItems = [...aiItems, ...otherItems];
    }
    
    // 按时间排序，取前 10 条
    return resultItems
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
      .slice(0, CONFIG.MAX_ITEMS_PER_SITE);
      
  } catch (error) {
    console.error('Google Design 抓取失败:', error.message);
    return [];
  }
}

/**
 * Figma 抓取器
 */
async function fetchFromFigma() {
  try {
    const url = 'https://www.figma.com/blog/';
    const html = await fetch(url);
    
    // TODO: 解析 figma.com/blog 的文章列表
    const items = [];
    
    // 优先过滤 AI 相关内容
    const aiItems = items.filter(item => 
      isAIRelated(item.title) || isAIRelated(item.summary)
    );
    
    // 如果 AI 相关条目不足 10 条，补充最近的其他条目
    let resultItems = [...aiItems];
    if (resultItems.length < CONFIG.MAX_ITEMS_PER_SITE) {
      const otherItems = items.filter(item => 
        !isAIRelated(item.title) && !isAIRelated(item.summary)
      );
      resultItems = [...aiItems, ...otherItems];
    }
    
    // 按时间排序，取前 10 条
    return resultItems
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
      .slice(0, CONFIG.MAX_ITEMS_PER_SITE);
      
  } catch (error) {
    console.error('Figma 抓取失败:', error.message);
    return [];
  }
}

// ====================
// 数据处理
// ====================

/**
 * 将抓取的新闻项转换为标准格式
 */
function normalizeNewsItem(item, source, sourceName, index) {
  return {
    id: `${source}-${String(index + 1).padStart(3, '0')}`,
    title: item.title || '',
    url: item.url || '',
    thumbnail: item.thumbnail || '',
    summary: item.summary || '',
    tags: item.tags || [],
    publishedAt: item.publishedAt || new Date().toISOString(),
    publishedAtRelative: getRelativeTime(item.publishedAt)
  };
}

/**
 * 包装站点数据
 */
function wrapSiteSource(source, sourceName, sourceUrl, items) {
  const now = new Date();
  return {
    source,
    sourceName,
    sourceUrl,
    updatedAt: now.toISOString(),
    updatedAtRelative: '刚刚',
    items: items.map((item, index) => 
      normalizeNewsItem(item, source, sourceName, index)
    )
  };
}

// ====================
// 主函数
// ====================

async function main() {
  console.log('开始抓取 AI 设计资讯...\n');

  const results = {
    date: formatDate(),
    sites: []
  };

  // 抓取各个站点
  const siteConfigs = [
    {
      source: 'material',
      sourceName: 'Material Design',
      sourceUrl: 'https://m3.material.io/',
      fetcher: fetchFromMaterial
    },
    {
      source: 'microsoft',
      sourceName: 'Microsoft Design',
      sourceUrl: 'https://microsoft.design/',
      fetcher: fetchFromMicrosoftDesign
    },
    {
      source: 'google',
      sourceName: 'Google Design',
      sourceUrl: 'https://design.google/',
      fetcher: fetchFromGoogleDesign
    },
    {
      source: 'figma',
      sourceName: 'Figma',
      sourceUrl: 'https://www.figma.com',
      fetcher: fetchFromFigma
    }
  ];

  for (const config of siteConfigs) {
    console.log(`正在抓取 ${config.sourceName}...`);
    try {
      const items = await config.fetcher();
      const siteData = wrapSiteSource(
        config.source,
        config.sourceName,
        config.sourceUrl,
        items
      );
      results.sites.push(siteData);
      console.log(`  ✓ 成功抓取 ${items.length} 条 AI 相关新闻\n`);
      
      // 请求延迟，避免过于频繁
      await delay(CONFIG.REQUEST_DELAY);
    } catch (error) {
      console.error(`  ✗ 抓取失败: ${error.message}\n`);
      // 即使失败也添加空站点数据，前端会显示友好提示
      results.sites.push(wrapSiteSource(
        config.source,
        config.sourceName,
        config.sourceUrl,
        []
      ));
    }
  }

  // 确保输出目录存在
  const outputDir = path.dirname(CONFIG.OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 保存 JSON 文件
  fs.writeFileSync(
    CONFIG.OUTPUT_PATH,
    JSON.stringify(results, null, 2),
    'utf8'
  );

  console.log(`\n抓取完成！数据已保存到: ${CONFIG.OUTPUT_PATH}`);
  console.log(`共抓取 ${results.sites.length} 个站点`);
  const totalItems = results.sites.reduce((sum, site) => sum + site.items.length, 0);
  console.log(`共 ${totalItems} 条 AI 相关新闻`);
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  fetchFromMaterial,
  fetchFromMicrosoftDesign,
  fetchFromGoogleDesign,
  fetchFromFigma,
  main
};
