// ====================
// 配置
// ====================
const CONFIG = {
  DATA_URL: './data/today.json', // 数据文件路径
  SITE_ORDER: ['material', 'microsoft', 'google', 'figma', 'anthropic', 'openai', 'metaai', 'googleai', 'github', 'aws', 'adobe', 'mapbox'], // 站点显示顺序
};

// ====================
// 工具函数
// ====================

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 计算相对时间
function getRelativeTime(dateString) {
  if (!dateString) return '';
  
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
    return formatDate(dateString);
  }
}

// ====================
// 渲染函数
// ====================

// 渲染新闻项（参考 momoyu.cc 的简洁风格）
function renderNewsItem(item, index) {
  const publishedTime = item.publishedAtRelative || getRelativeTime(item.publishedAt);
  const tags = item.tags && Array.isArray(item.tags) ? item.tags : [];
  const tagsHtml = tags.length > 0 
    ? `<div class="news-tags">${tags.map(tag => `<span class="news-tag">${escapeHtml(tag)}</span>`).join('')}</div>`
    : '';

  const url = escapeHtml(item.url);
  return `
    <article class="news-item" data-url="${url}" role="button" tabindex="0" aria-label="查看 ${escapeHtml(item.title)}">
      <div class="news-content">
        <div class="news-header">
          <span class="news-number">${index + 1}.</span>
          <h3 class="news-title">${escapeHtml(item.title)}</h3>
          ${publishedTime ? `<span class="news-published-time">${publishedTime}</span>` : ''}
        </div>
        ${tagsHtml}
      </div>
    </article>
  `;
}

// 渲染站点卡片
function renderSiteCard(site) {
  const hasItems = site.items && site.items.length > 0;
  
  let contentHtml = '';
  
  if (hasItems) {
    const newsItemsHtml = site.items
      .map((item, index) => renderNewsItem(item, index))
      .join('');
    contentHtml = `<div class="news-list">${newsItemsHtml}</div>`;
  } else {
    contentHtml = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p class="empty-state-message">暂无可用的 AI 设计内容</p>
        <a href="${escapeHtml(site.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="empty-state-link">
          访问 ${escapeHtml(site.sourceName)}
        </a>
      </div>
    `;
  }

  const updatedTime = site.updatedAtRelative || getRelativeTime(site.updatedAt);

  return `
    <div class="site-card">
      <div class="site-card-header">
        <h2 class="site-card-title">${escapeHtml(site.sourceName)}</h2>
        ${updatedTime ? `<span class="site-updated-time">${updatedTime}</span>` : ''}
      </div>
      ${contentHtml}
    </div>
  `;
}

// 渲染所有站点卡片
function renderSiteCards(data) {
  console.log('开始渲染站点卡片，数据:', data);
  const container = document.getElementById('siteCardsContainer');
  
  if (!container) {
    console.error('找不到容器元素 siteCardsContainer');
    return;
  }
  
  if (!data || !data.sites || data.sites.length === 0) {
    console.warn('数据为空或格式不正确');
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p class="empty-state-message">暂无数据，请稍后再试</p>
      </div>
    `;
    return;
  }

  console.log(`找到 ${data.sites.length} 个站点，开始渲染...`);

  // 按固定顺序排序站点
  const sortedSites = CONFIG.SITE_ORDER
    .map(source => data.sites.find(site => site.source === source))
    .filter(Boolean);

  console.log(`排序后 ${sortedSites.length} 个站点`);

  const cardsHtml = sortedSites.map(site => renderSiteCard(site)).join('');
  container.innerHTML = cardsHtml;

  console.log('站点卡片渲染完成');

  // 添加点击和触摸事件监听器（移动端优化）
  const newsItems = container.querySelectorAll('.news-item');
  newsItems.forEach(item => {
    const url = item.getAttribute('data-url');
    if (!url) return;
    
    // 统一的打开链接函数
    const openLink = (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(url, '_blank');
    };
    
    // 点击事件（桌面端和移动端都支持）
    item.addEventListener('click', openLink);
    
    // 触摸事件（移动端优化，减少延迟）
    let touchStartTime = 0;
    item.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      item.style.opacity = '0.7';
    }, { passive: true });
    
    item.addEventListener('touchend', (e) => {
      const touchDuration = Date.now() - touchStartTime;
      item.style.opacity = '1';
      
      // 如果触摸时间小于 300ms，认为是点击而不是滑动
      if (touchDuration < 300) {
        e.preventDefault();
        openLink(e);
      }
    });
    
    item.addEventListener('touchcancel', () => {
      item.style.opacity = '1';
    }, { passive: true });
  });

  // 更新日期显示
  if (data.date) {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
      dateElement.textContent = data.date;
      console.log('日期已更新:', data.date);
    }
  }
}

// ====================
// 数据加载
// ====================

async function loadData() {
  const container = document.getElementById('siteCardsContainer');
  
  if (!container) {
    console.error('找不到容器元素 siteCardsContainer');
    return;
  }
  
  console.log('开始加载数据，URL:', CONFIG.DATA_URL);
  
  try {
    const response = await fetch(CONFIG.DATA_URL);
    
    console.log('响应状态:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('数据加载成功:', data);
    
    // 验证数据格式
    if (!data || !data.sites || !Array.isArray(data.sites)) {
      throw new Error('数据格式不正确：缺少 sites 数组');
    }
    
    console.log(`找到 ${data.sites.length} 个站点`);
    renderSiteCards(data);
  } catch (error) {
    console.error('加载数据失败:', error);
    console.error('错误堆栈:', error.stack);
    
    // 检查是否是 CORS 问题
    const isCorsError = error.message.includes('CORS') || 
                       error.message.includes('Failed to fetch') ||
                       error.message.includes('NetworkError') ||
                       error.name === 'TypeError';
    
    let errorMessage = '数据加载失败，请稍后再试';
    let errorDetail = error.message;
    
    if (isCorsError && error.message.includes('fetch')) {
      errorMessage = '无法加载数据文件（CORS 限制）';
      errorDetail = '请使用本地服务器访问，而不是直接打开 HTML 文件。\n启动方法：python3 -m http.server 8000\n然后访问：http://localhost:8000';
    }
    
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <p class="empty-state-message">${escapeHtml(errorMessage)}</p>
        <p class="empty-state-message" style="font-size: 12px; margin-top: 8px; white-space: pre-line;">${escapeHtml(errorDetail)}</p>
        <p class="empty-state-message" style="font-size: 11px; margin-top: 4px; color: #9ca3af;">请打开浏览器控制台（F12）查看详细错误信息</p>
      </div>
    `;
  }
}

// ====================
// Back to Top 功能
// ====================

function initBackToTop() {
  const backToTopBtn = document.getElementById('backToTop');
  
  if (!backToTopBtn) return;

  function toggleBackToTop() {
    if (window.pageYOffset > 300) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', toggleBackToTop);
  
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  // 支持键盘操作
  backToTopBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  });
}

// ====================
// 键盘导航支持
// ====================

function initKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    // 为新闻项添加键盘支持
    const newsItems = document.querySelectorAll('.news-item');
    newsItems.forEach(item => {
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const url = item.getAttribute('onclick');
          if (url) {
            const match = url.match(/window\.open\('([^']+)'/);
            if (match) {
              window.open(match[1], '_blank');
            }
          }
        }
      });
    });
  });
}

// ====================
// 初始化
// ====================

document.addEventListener('DOMContentLoaded', () => {
  console.log('页面加载完成，开始初始化...');
  
  // 设置当前日期
  const today = formatDate(new Date().toISOString());
  const dateElement = document.getElementById('currentDate');
  if (dateElement && !dateElement.textContent) {
    dateElement.textContent = today;
    console.log('日期已设置:', today);
  }

  // 加载数据
  console.log('准备加载数据...');
  loadData();

  // 初始化 Back to Top
  initBackToTop();

  // 初始化键盘导航
  initKeyboardNavigation();
  
  console.log('初始化完成');
});

// 如果 DOM 已经加载完成，立即执行
if (document.readyState === 'loading') {
  // DOM 还在加载中，等待 DOMContentLoaded 事件
  console.log('等待 DOM 加载...');
} else {
  // DOM 已经加载完成，立即执行
  console.log('DOM 已加载，立即执行初始化');
  const today = formatDate(new Date().toISOString());
  const dateElement = document.getElementById('currentDate');
  if (dateElement && !dateElement.textContent) {
    dateElement.textContent = today;
  }
  loadData();
  initBackToTop();
  initKeyboardNavigation();
}
