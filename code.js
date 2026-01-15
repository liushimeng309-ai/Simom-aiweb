// ====================
// 配置信息
// ====================
var CONFIG = {
  API_TOKEN: "YOUR_FIGMA_TOKEN_HERE", // 请替换为你的 Figma Personal Access Token
  LIBRARIES: [
    { name: "TDesign for mobile", fileKey: "jivYXTMTP3jEkeZXWbMh4J" }
  ],
  REQUEST_DELAY: 500,
  PAGE_SIZE: 30,  // UI懒加载每页显示的组件数量
  // 向量嵌入配置（可选，如果不需要向量搜索可以设为null）
  EMBEDDING_API: null, // 示例: { type: 'openai', apiKey: 'xxx', endpoint: 'https://api.openai.com/v1/embeddings' }
  USE_VECTOR_SEARCH: false, // 是否启用向量搜索（需要配置EMBEDDING_API）
  VECTOR_BATCH_SIZE: 10, // 批量计算向量时的批次大小
  VECTOR_DIMENSION: 384 // 向量维度（根据使用的embedding模型调整）
};

// ====================
// 全局状态
// ====================
var componentIndex = [];
var isLoading = false;
var selectedLibraryFileKey = null; // 当前选中的组件库 fileKey

// 向量缓存（延迟计算）
var vectorCache = {}; // key: componentId, value: { vector: [...], timestamp: number }
var vectorCalculationQueue = []; // 向量计算队列
var isCalculatingVectors = false; // 是否正在计算向量

// ====================
// 工具函数
// ====================
function delay(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

function mergeObjects(target, source) {
  var result = {};
  var key;
  for (key in target) {
    if (target.hasOwnProperty(key)) {
      result[key] = target[key];
    }
  }
  for (key in source) {
    if (source.hasOwnProperty(key)) {
      result[key] = source[key];
    }
  }
  return result;
}

// 中文拼音首字母映射表（常用汉字）
var pinyinFirstLetterMap = {
  '阿': 'a', '啊': 'a', '爱': 'a', '安': 'a', '按': 'a',
  '八': 'b', '吧': 'b', '把': 'b', '白': 'b', '百': 'b', '班': 'b', '板': 'b', '帮': 'b', '包': 'b', '保': 'b', '报': 'b', '北': 'b', '被': 'b', '本': 'b', '比': 'b', '笔': 'b', '边': 'b', '变': 'b', '别': 'b', '表': 'b', '标': 'b', '并': 'b', '补': 'b', '不': 'b', '步': 'b', '部': 'b', '布': 'b',
  '才': 'c', '菜': 'c', '参': 'c', '草': 'c', '层': 'c', '曾': 'c', '查': 'c', '差': 'c', '产': 'c', '长': 'c', '常': 'c', '场': 'c', '唱': 'c', '超': 'c', '车': 'c', '成': 'c', '城': 'c', '程': 'c', '吃': 'c', '出': 'c', '初': 'c', '除': 'c', '处': 'c', '传': 'c', '窗': 'c', '床': 'c', '创': 'c', '春': 'c', '词': 'c', '次': 'c', '从': 'c', '村': 'c', '存': 'c', '错': 'c',
  '大': 'd', '打': 'd', '带': 'd', '待': 'd', '单': 'd', '但': 'd', '当': 'd', '导': 'd', '到': 'd', '道': 'd', '的': 'd', '得': 'd', '灯': 'd', '等': 'd', '低': 'd', '底': 'd', '地': 'd', '第': 'd', '点': 'd', '电': 'd', '店': 'd', '调': 'd', '掉': 'd', '丢': 'd', '东': 'd', '冬': 'd', '动': 'd', '都': 'd', '读': 'd', '独': 'd', '度': 'd', '短': 'd', '断': 'd', '段': 'd', '对': 'd', '多': 'd',
  '而': 'e', '儿': 'e', '二': 'e',
  '发': 'f', '法': 'f', '反': 'f', '饭': 'f', '方': 'f', '房': 'f', '放': 'f', '非': 'f', '飞': 'f', '分': 'f', '风': 'f', '封': 'f', '服': 'f', '浮': 'f', '符': 'f', '福': 'f', '副': 'f', '父': 'f', '负': 'f', '复': 'f', '富': 'f',
  '该': 'g', '改': 'g', '概': 'g', '干': 'g', '感': 'g', '敢': 'g', '刚': 'g', '钢': 'g', '高': 'g', '告': 'g', '歌': 'g', '格': 'g', '个': 'g', '各': 'g', '给': 'g', '根': 'g', '跟': 'g', '更': 'g', '工': 'g', '公': 'g', '共': 'g', '功': 'g', '够': 'g', '构': 'g', '古': 'g', '故': 'g', '顾': 'g', '固': 'g', '瓜': 'g', '关': 'g', '观': 'g', '管': 'g', '光': 'g', '广': 'g', '归': 'g', '规': 'g', '国': 'g', '果': 'g', '过': 'g',
  '还': 'h', '孩': 'h', '海': 'h', '害': 'h', '含': 'h', '汉': 'h', '好': 'h', '号': 'h', '喝': 'h', '和': 'h', '何': 'h', '河': 'h', '合': 'h', '黑': 'h', '很': 'h', '红': 'h', '后': 'h', '候': 'h', '呼': 'h', '互': 'h', '户': 'h', '护': 'h', '花': 'h', '华': 'h', '话': 'h', '画': 'h', '化': 'h', '坏': 'h', '欢': 'h', '环': 'h', '还': 'h', '换': 'h', '黄': 'h', '回': 'h', '会': 'h', '活': 'h', '火': 'h', '或': 'h', '货': 'h',
  '机': 'j', '基': 'j', '积': 'j', '及': 'j', '极': 'j', '几': 'j', '己': 'j', '记': 'j', '技': 'j', '计': 'j', '际': 'j', '继': 'j', '纪': 'j', '加': 'j', '家': 'j', '假': 'j', '价': 'j', '架': 'j', '间': 'j', '简': 'j', '见': 'j', '建': 'j', '件': 'j', '健': 'j', '江': 'j', '将': 'j', '讲': 'j', '交': 'j', '教': 'j', '较': 'j', '接': 'j', '节': 'j', '结': 'j', '解': 'j', '界': 'j', '借': 'j', '金': 'j', '今': 'j', '进': 'j', '近': 'j', '尽': 'j', '经': 'j', '京': 'j', '精': 'j', '景': 'j', '静': 'j', '究': 'j', '九': 'j', '久': 'j', '就': 'j', '旧': 'j', '举': 'j', '具': 'j', '据': 'j', '觉': 'j', '决': 'j', '绝': 'j',
  '开': 'k', '看': 'k', '考': 'k', '科': 'k', '可': 'k', '刻': 'k', '客': 'k', '课': 'k', '空': 'k', '口': 'k', '块': 'k', '快': 'k', '宽': 'k', '况': 'k',
  '拉': 'l', '来': 'l', '兰': 'l', '蓝': 'l', '老': 'l', '了': 'l', '类': 'l', '冷': 'l', '离': 'l', '里': 'l', '理': 'l', '李': 'l', '力': 'l', '历': 'l', '立': 'l', '利': 'l', '例': 'l', '连': 'l', '联': 'l', '脸': 'l', '练': 'l', '良': 'l', '两': 'l', '亮': 'l', '量': 'l', '料': 'l', '列': 'l', '林': 'l', '零': 'l', '领': 'l', '令': 'l', '另': 'l', '留': 'l', '流': 'l', '六': 'l', '龙': 'l', '楼': 'l', '路': 'l', '率': 'l', '绿': 'l', '论': 'l', '落': 'l',
  '妈': 'm', '马': 'm', '吗': 'm', '买': 'm', '卖': 'm', '满': 'm', '慢': 'm', '忙': 'm', '毛': 'm', '么': 'm', '没': 'm', '美': 'm', '每': 'm', '门': 'm', '们': 'm', '梦': 'm', '米': 'm', '面': 'm', '民': 'm', '名': 'm', '明': 'm', '命': 'm', '母': 'm', '目': 'm', '木': 'm',
  '拿': 'n', '哪': 'n', '那': 'n', '奶': 'n', '南': 'n', '难': 'n', '脑': 'n', '呢': 'n', '内': 'n', '能': 'n', '你': 'n', '年': 'n', '念': 'n', '娘': 'n', '鸟': 'n', '您': 'n', '牛': 'n', '农': 'n', '弄': 'n', '女': 'n', '暖': 'n',
  '哦': 'o', '欧': 'o',
  '怕': 'p', '拍': 'p', '排': 'p', '牌': 'p', '盘': 'p', '旁': 'p', '胖': 'p', '跑': 'p', '培': 'p', '朋': 'p', '片': 'p', '票': 'p', '品': 'p', '平': 'p', '评': 'p', '破': 'p', '普': 'p',
  '七': 'q', '期': 'q', '其': 'q', '奇': 'q', '齐': 'q', '起': 'q', '气': 'q', '汽': 'q', '千': 'q', '前': 'q', '钱': 'q', '墙': 'q', '强': 'q', '桥': 'q', '且': 'q', '切': 'q', '亲': 'q', '青': 'q', '轻': 'q', '清': 'q', '情': 'q', '请': 'q', '庆': 'q', '秋': 'q', '求': 'q', '区': 'q', '取': 'q', '去': 'q', '全': 'q', '权': 'q', '确': 'q', '群': 'q',
  '然': 'r', '让': 'r', '热': 'r', '人': 'r', '认': 'r', '任': 'r', '日': 'r', '容': 'r', '如': 'r', '入': 'r',
  '三': 's', '色': 's', '山': 's', '商': 's', '上': 's', '少': 's', '绍': 's', '社': 's', '身': 's', '深': 's', '什': 's', '神': 's', '生': 's', '声': 's', '胜': 's', '省': 's', '圣': 's', '师': 's', '十': 's', '时': 's', '识': 's', '实': 's', '食': 's', '使': 's', '始': 's', '士': 's', '世': 's', '市': 's', '事': 's', '试': 's', '是': 's', '式': 's', '室': 's', '视': 's', '收': 's', '手': 's', '首': 's', '受': 's', '书': 's', '舒': 's', '树': 's', '数': 's', '双': 's', '谁': 's', '水': 's', '说': 's', '思': 's', '司': 's', '四': 's', '送': 's', '速': 's', '苏': 's', '素': 's', '算': 's', '虽': 's', '随': 's', '岁': 's', '所': 's',
  '他': 't', '她': 't', '它': 't', '台': 't', '太': 't', '态': 't', '谈': 't', '特': 't', '疼': 't', '提': 't', '题': 't', '体': 't', '天': 't', '田': 't', '条': 't', '铁': 't', '听': 't', '停': 't', '通': 't', '同': 't', '头': 't', '图': 't', '土': 't', '团': 't', '推': 't', '脱': 't', '托': 't',
  '外': 'w', '完': 'w', '玩': 'w', '晚': 'w', '万': 'w', '王': 'w', '往': 'w', '网': 'w', '忘': 'w', '望': 'w', '危': 'w', '为': 'w', '位': 'w', '未': 'w', '味': 'w', '温': 'w', '文': 'w', '问': 'w', '我': 'w', '五': 'w', '午': 'w', '舞': 'w', '物': 'w', '务': 'w', '误': 'w',
  '西': 'x', '吸': 'x', '息': 'x', '希': 'x', '习': 'x', '洗': 'x', '喜': 'x', '系': 'x', '细': 'x', '下': 'x', '夏': 'x', '先': 'x', '鲜': 'x', '线': 'x', '现': 'x', '限': 'x', '县': 'x', '香': 'x', '乡': 'x', '相': 'x', '想': 'x', '向': 'x', '象': 'x', '像': 'x', '小': 'x', '笑': 'x', '校': 'x', '些': 'x', '鞋': 'x', '写': 'x', '谢': 'x', '新': 'x', '心': 'x', '信': 'x', '星': 'x', '行': 'x', '形': 'x', '醒': 'x', '姓': 'x', '兴': 'x', '幸': 'x', '性': 'x', '休': 'x', '修': 'x', '需': 'x', '须': 'x', '许': 'x', '选': 'x', '学': 'x', '雪': 'x', '血': 'x', '寻': 'x', '迅': 'x',
  '呀': 'y', '压': 'y', '牙': 'y', '眼': 'y', '演': 'y', '颜': 'y', '阳': 'y', '养': 'y', '样': 'y', '要': 'y', '药': 'y', '爷': 'y', '也': 'y', '业': 'y', '叶': 'y', '页': 'y', '夜': 'y', '一': 'y', '医': 'y', '衣': 'y', '依': 'y', '已': 'y', '以': 'y', '易': 'y', '意': 'y', '艺': 'y', '议': 'y', '亿': 'y', '因': 'y', '音': 'y', '银': 'y', '引': 'y', '印': 'y', '英': 'y', '应': 'y', '影': 'y', '映': 'y', '硬': 'y', '用': 'y', '优': 'y', '由': 'y', '油': 'y', '游': 'y', '友': 'y', '有': 'y', '又': 'y', '右': 'y', '鱼': 'y', '于': 'y', '与': 'y', '雨': 'y', '语': 'y', '育': 'y', '遇': 'y', '员': 'y', '元': 'y', '园': 'y', '原': 'y', '圆': 'y', '远': 'y', '院': 'y', '愿': 'y', '月': 'y', '越': 'y', '云': 'y', '运': 'y',
  '杂': 'z', '再': 'z', '在': 'z', '咱': 'z', '早': 'z', '造': 'z', '则': 'z', '怎': 'z', '增': 'z', '展': 'z', '站': 'z', '张': 'z', '章': 'z', '长': 'z', '掌': 'z', '找': 'z', '照': 'z', '者': 'z', '这': 'z', '着': 'z', '真': 'z', '整': 'z', '正': 'z', '证': 'z', '之': 'z', '只': 'z', '支': 'z', '知': 'z', '直': 'z', '值': 'z', '职': 'z', '址': 'z', '指': 'z', '纸': 'z', '至': 'z', '志': 'z', '制': 'z', '质': 'z', '治': 'z', '中': 'z', '钟': 'z', '种': 'z', '重': 'z', '周': 'z', '州': 'z', '主': 'z', '住': 'z', '注': 'z', '助': 'z', '专': 'z', '转': 'z', '状': 'z', '准': 'z', '桌': 'z', '资': 'z', '字': 'z', '自': 'z', '总': 'z', '走': 'z', '组': 'z', '足': 'z', '嘴': 'z', '最': 'z', '左': 'z', '作': 'z', '座': 'z', '做': 'z'
};

// 获取中文字符的拼音首字母
function getChinesePinyinFirstLetter(char) {
  return pinyinFirstLetterMap[char] || '';
}

// 提取文本的首字母（支持中英文混合）
// 按分隔符（/, _, -, 空格等）分割，提取每个部分的首字母
function extractInitials(text) {
  if (!text || text.length === 0) {
    return '';
  }
  
  var normalized = text.toLowerCase();
  // 按常见分隔符分割：/, _, -, 空格
  var parts = normalized.split(/[/_\-\s]+/).filter(function(part) {
    return part.length > 0;
  });
  
  var initials = [];
  var i, j;
  
  for (i = 0; i < parts.length; i++) {
    var part = parts[i];
    var firstChar = '';
    
    // 找到第一个有效字符（字母、中文或数字）
    for (j = 0; j < part.length; j++) {
      var char = part[j];
      var code = char.charCodeAt(0);
      
      // 英文字母
      if (code >= 97 && code <= 122) {
        firstChar = char;
        break;
      }
      // 中文字符
      else if (code >= 0x4e00 && code <= 0x9fa5) {
        var pinyin = getChinesePinyinFirstLetter(char);
        if (pinyin) {
          firstChar = pinyin;
          break;
        }
      }
      // 数字
      else if (code >= 48 && code <= 57) {
        firstChar = char;
        break;
      }
    }
    
    if (firstChar) {
      initials.push(firstChar);
    }
  }
  
  return initials.join('');
}


// ====================
// Figma API 调用
// ====================
function fetchFromFigmaAPI(endpoint) {
  return fetch('https://api.figma.com/v1' + endpoint, {
    method: 'GET',
    headers: {
      'X-Figma-Token': CONFIG.API_TOKEN
    }
  }).then(function(response) {
    if (!response.ok) {
      return response.text().then(function(errorText) {
        var errorMsg = 'Figma API Error: ' + response.status;
        try {
          var errorObj = JSON.parse(errorText);
          if (errorObj.err) {
            errorMsg += ' - ' + errorObj.err;
          }
          if (response.status === 403) {
            errorMsg += '\n请检查 API Token 是否有效，以及是否有权限访问该文件。';
          }
        } catch (e) {
          errorMsg += ' - ' + errorText;
        }
        throw new Error(errorMsg);
      });
    }
    return response.json();
  });
}

// 获取文件中的所有组件
function fetchFileComponents(fileKey) {
  return fetchFromFigmaAPI('/files/' + fileKey + '/components').then(function(data) {
    // 调试：检查返回的数据结构
    console.log('API Response for file ' + fileKey + ':', JSON.stringify(data, null, 2));
    
    // 检查不同的数据结构
    if (data.meta && data.meta.components) {
      // 标准结构：{ meta: { components: [...] } }
      return data.meta.components;
    } else if (data.components) {
      // 可能的结构：{ components: [...] }
      return data.components;
    } else if (Array.isArray(data)) {
      // 直接返回数组
      return data;
    }
    
    // 如果没有找到组件，返回空数组并打印警告
    console.warn('未找到组件数据，返回的数据结构：', Object.keys(data));
    return [];
  });
}

// 获取组件缩略图
function fetchComponentThumbnails(fileKey, nodeIds) {
  if (nodeIds.length === 0) {
    return Promise.resolve({});
  }
  
  var idsParam = nodeIds.join(',');
  // 提高缩略图分辨率：从0.5改为2.0，获得更清晰的图片
  return fetchFromFigmaAPI('/images/' + fileKey + '?ids=' + idsParam + '&format=png&scale=2.0').then(function(data) {
    return data.images || {};
  });
}

// ====================
// 组件库加载
// ====================
function loadAllLibraries() {
  isLoading = true;
  componentIndex = [];
  
  // 先获取所有组件库的总组件数量
  var totalComponentsCount = 0;
  var componentCountPromises = [];
  
  for (var i = 0; i < CONFIG.LIBRARIES.length; i++) {
    var lib = CONFIG.LIBRARIES[i];
    componentCountPromises.push(
      fetchFileComponents(lib.fileKey)
        .then(function(comps) {
          return comps.length;
        })
        .catch(function() {
          return 0;
        })
    );
  }
  
  Promise.all(componentCountPromises)
    .then(function(counts) {
      totalComponentsCount = counts.reduce(function(sum, count) {
        return sum + count;
      }, 0);
      
      // 开始加载
      figma.ui.postMessage({ 
        type: 'loading-start', 
        message: '正在加载组件库...',
        totalComponents: totalComponentsCount
      });
      
      loadNextLibrary(0);
    })
    .catch(function(error) {
      // 如果获取总数失败，仍然继续加载
      totalComponentsCount = 0;
      figma.ui.postMessage({ 
        type: 'loading-start', 
        message: '正在加载组件库...',
        totalComponents: 0
      });
      loadNextLibrary(0);
    });
  
  function loadNextLibrary(libraryIndex) {
    if (libraryIndex >= CONFIG.LIBRARIES.length) {
      // 默认选择第一个组件库
      if (CONFIG.LIBRARIES.length > 0 && !selectedLibraryFileKey) {
        selectedLibraryFileKey = CONFIG.LIBRARIES[0].fileKey;
      }
      
      figma.ui.postMessage({ 
        type: 'loading-complete', 
        message: '加载完成，共 ' + componentIndex.length + ' 个组件',
        totalComponents: componentIndex.length,
        loadedCount: componentIndex.length
      });
      
      // 发送组件库列表给 UI
      figma.ui.postMessage({
        type: 'libraries-loaded',
        libraries: CONFIG.LIBRARIES,
        selectedLibrary: selectedLibraryFileKey
      });
      
      isLoading = false;
      return Promise.resolve();
    }
    
    var library = CONFIG.LIBRARIES[libraryIndex];
    
    figma.ui.postMessage({ 
      type: 'loading-progress', 
      message: '正在加载: ' + library.name,
      loadedCount: componentIndex.length,
      totalComponents: totalComponentsCount
    });
    
    var components = [];
    var thumbnails = {};
    
    return fetchFileComponents(library.fileKey)
      .then(function(comps) {
        components = comps;
        
        // 调试：打印获取到的组件数量
        console.log('获取到组件数量:', components.length);
        if (components.length > 0) {
          console.log('第一个组件示例:', JSON.stringify(components[0], null, 2));
        }
        
        if (components.length === 0) {
          figma.ui.postMessage({ 
            type: 'loading-progress', 
            message: library.name + ': 未找到已发布的组件。提示：需要在 Figma 中将组件"发布到团队库"才能通过 API 访问。',
            loadedCount: componentIndex.length,
            totalComponents: totalComponentsCount
          });
        }
        
        return delay(CONFIG.REQUEST_DELAY);
      })
      .then(function() {
        var nodeIds = components.map(function(c) { return c.node_id; });
        
        if (nodeIds.length === 0) {
          return Promise.resolve({});
        }
        
        // 分批获取缩略图
        var batches = [];
        for (var i = 0; i < nodeIds.length; i += 100) {
          batches.push(nodeIds.slice(i, i + 100));
        }
        
        var batchIndex = 0;
        function fetchNextBatch() {
          if (batchIndex >= batches.length) {
            return Promise.resolve();
          }
          
          var batchIds = batches[batchIndex];

          return fetchComponentThumbnails(library.fileKey, batchIds)
            .then(function(batchThumbnails) {
              thumbnails = mergeObjects(thumbnails, batchThumbnails);
              
              // 更新进度：显示已处理多少缩略图
              var processedThumbnails = (batchIndex + 1) * Math.min(100, nodeIds.length);
              figma.ui.postMessage({ 
                type: 'loading-progress', 
                message: '正在加载缩略图: ' + library.name + ' (' + processedThumbnails + '/' + nodeIds.length + ')',
                loadedCount: componentIndex.length,
                totalComponents: totalComponentsCount
              });
              
              return delay(CONFIG.REQUEST_DELAY);
            })
            .then(function() {
              batchIndex++;
              return fetchNextBatch();
            });
        }
        
        return fetchNextBatch();
      })
      .then(function() {
        // 构建索引
        for (var i = 0; i < components.length; i++) {
          var component = components[i];
          
          // 加载时只存储基本信息，不计算向量（延迟计算）
          componentIndex.push({
            id: library.fileKey + ':' + component.node_id,
            name: component.name,
            description: component.description || '',
            libraryName: library.name,
            fileKey: library.fileKey,
            nodeId: component.node_id,
            key: component.key,
            thumbnail: thumbnails[component.node_id] || null
            // 注意：不在这里存储向量，延迟计算
          });
        }
        
        // 更新加载进度
        if (components.length > 0) {
          figma.ui.postMessage({ 
            type: 'loading-progress', 
            message: '已完成 ' + library.name,
            loadedCount: componentIndex.length,
            totalComponents: totalComponentsCount
          });
        } else {
          figma.ui.postMessage({ 
            type: 'loading-progress', 
            message: library.name + ': 未找到已发布的组件。请在 Figma 中将组件发布到团队库后重试。',
            loadedCount: componentIndex.length,
            totalComponents: totalComponentsCount
          });
        }
        
        libraryIndex++;
        return loadNextLibrary(libraryIndex);
      })
      .catch(function(error) {
        figma.ui.postMessage({ 
          type: 'loading-error', 
          message: '加载失败: ' + error.message,
          loadedCount: componentIndex.length,
          totalComponents: totalComponentsCount
        });
        isLoading = false;
      });
  }
  
  return loadNextLibrary();
}

// ====================
// 向量计算（延迟计算）
// ====================

// 计算文本向量（调用embedding API）
function calculateTextEmbedding(text) {
  if (!CONFIG.EMBEDDING_API || !CONFIG.USE_VECTOR_SEARCH) {
    return Promise.resolve(null);
  }
  
  var api = CONFIG.EMBEDDING_API;
  
  // OpenAI API
  if (api.type === 'openai') {
    return fetch(api.endpoint || 'https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + api.apiKey
      },
      body: JSON.stringify({
        input: text,
        model: api.model || 'text-embedding-3-small'
      })
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Embedding API error: ' + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      return data.data && data.data[0] ? data.data[0].embedding : null;
    })
    .catch(function(error) {
      console.error('向量计算失败:', error);
      return null;
    });
  }
  
  // 自定义API（需要返回 { embedding: [...] } 格式）
  if (api.type === 'custom') {
    return fetch(api.endpoint, {
      method: 'POST',
      headers: api.headers || { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text
      })
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Embedding API error: ' + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      return data.embedding || data.vector || null;
    })
    .catch(function(error) {
      console.error('向量计算失败:', error);
      return null;
    });
  }
  
  return Promise.resolve(null);
}

// 批量计算组件向量（仅计算需要的组件）
function batchCalculateComponentVectors(components, queryVector) {
  if (!CONFIG.USE_VECTOR_SEARCH || !queryVector) {
    return Promise.resolve([]);
  }
  
  var promises = [];
  var componentsToCalculate = [];
  
  // 筛选需要计算的组件（缓存中没有的）
  for (var i = 0; i < components.length; i++) {
    var component = components[i];
    var componentId = component.id;
    
    // 检查缓存
    if (vectorCache[componentId]) {
      continue; // 已有缓存，跳过
    }
    
    componentsToCalculate.push(component);
  }
  
  // 如果没有需要计算的组件，直接返回
  if (componentsToCalculate.length === 0) {
    return Promise.resolve([]);
  }
  
  // 批量计算向量（分批处理，避免API限制）
  var batches = [];
  for (var i = 0; i < componentsToCalculate.length; i += CONFIG.VECTOR_BATCH_SIZE) {
    batches.push(componentsToCalculate.slice(i, i + CONFIG.VECTOR_BATCH_SIZE));
  }
  
  var batchIndex = 0;
  
  function calculateNextBatch() {
    if (batchIndex >= batches.length) {
      return Promise.resolve();
    }
    
    var batch = batches[batchIndex];
    var batchPromises = [];
    
    // 为批次中的每个组件计算向量
    for (var j = 0; j < batch.length; j++) {
      var component = batch[j];
      var text = (component.name + ' ' + (component.description || '')).trim();
      
      var promise = calculateTextEmbedding(text)
        .then(function(result) {
          return { component: component, vector: result };
        })
        .then(function(result) {
          if (result.vector) {
            // 存入缓存
            vectorCache[result.component.id] = {
              vector: result.vector,
              timestamp: Date.now()
            };
          }
          return result;
        });
      
      batchPromises.push(promise);
    }
    
    return Promise.all(batchPromises)
      .then(function() {
        batchIndex++;
        return delay(100); // 批次间延迟，避免API限流
      })
      .then(calculateNextBatch);
  }
  
  return calculateNextBatch();
}

// 计算余弦相似度
function cosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return 0;
  }
  
  var dotProduct = 0;
  var norm1 = 0;
  var norm2 = 0;
  
  for (var i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);
  
  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }
  
  return dotProduct / (norm1 * norm2);
}

// ====================
// 搜索功能（关键词搜索 + 向量搜索混合）
// ====================
function searchComponents(query, searchType) {
  // searchType: 'keyword' | 'vector' | 'hybrid' | 'image'
  searchType = searchType || 'keyword';
  
  if (componentIndex.length === 0) {
    return Promise.resolve([]);
  }
  
  if (!query || (typeof query === 'string' && query.trim().length === 0)) {
    return Promise.resolve([]);
  }
  
  // 如果没有选中组件库，返回空结果
  if (!selectedLibraryFileKey) {
    return Promise.resolve([]);
  }
  
  // 关键词搜索逻辑（原有逻辑）
  function performKeywordSearch(queryText) {
    var normalizedQuery = queryText.toLowerCase().trim();
    var queryLetters = normalizedQuery.replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
    
    if (!queryLetters || queryLetters.length === 0) {
      return [];
    }
    
    var queryInitials = extractInitials(queryText);
    var results = [];
    var i;
    
    // 遍历所有组件，只搜索选中组件库的组件
    for (i = 0; i < componentIndex.length; i++) {
      var component = componentIndex[i];
      
      if (component.fileKey !== selectedLibraryFileKey) {
        continue;
      }
      
      var componentName = (component.name || '').toLowerCase();
      if (componentName.length === 0) {
        continue;
      }
      
      var componentLetters = componentName.replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
      if (componentLetters.length === 0) {
        continue;
      }
      
      var matchStartIndex = componentLetters.indexOf(queryLetters);
      var score = 0;
      var isPrefixMatch = false;
      var matchType = '';
      // matchedLength用于渐进式排序：匹配的字符长度越长，优先级越高
      var matchedLength = 0;
      
      if (matchStartIndex !== -1) {
        // 直接字符匹配成功
        isPrefixMatch = matchStartIndex === 0;
        matchType = 'direct';
        // 直接匹配时，matchedLength就是查询字符的实际长度
        matchedLength = queryLetters.length;
        
        if (isPrefixMatch) {
          score = 1.0;
          var lengthRatio = queryLetters.length / componentLetters.length;
          score = score * (0.7 + lengthRatio * 0.3);
        } else {
          score = 0.8;
          var positionRatio = 1 - (matchStartIndex / componentLetters.length);
          score = score * (0.6 + positionRatio * 0.4);
          var lengthRatio = queryLetters.length / componentLetters.length;
          score = score * (0.6 + lengthRatio * 0.4);
        }
      } else if (queryInitials && queryInitials.length > 0) {
        // 直接匹配失败，尝试首字母匹配
        var componentInitials = extractInitials(component.name || '');
        
        if (componentInitials && componentInitials.length > 0) {
          var initialsMatchIndex = componentInitials.indexOf(queryInitials);
          
          if (initialsMatchIndex !== -1) {
            isPrefixMatch = initialsMatchIndex === 0;
            matchStartIndex = initialsMatchIndex;
            matchType = 'initials';
            // 首字母匹配时，matchedLength使用queryInitials.length（匹配的首字母序列长度）
            // 例如：输入"ite"时，如果匹配首字母"ite"，matchedLength=3
            // 输入"it"时，如果匹配首字母"it"，matchedLength=2
            // 这样输入"ite"的匹配会排在输入"it"的匹配前面
            matchedLength = queryInitials.length;
            
            if (isPrefixMatch) {
              score = 0.9;
              var lengthRatio = queryInitials.length / componentInitials.length;
              score = score * (0.6 + lengthRatio * 0.4);
            } else {
              score = 0.4;
              var positionRatio = 1 - (initialsMatchIndex / componentInitials.length);
              score = score * (0.5 + positionRatio * 0.5);
              var lengthRatio = queryInitials.length / componentInitials.length;
              score = score * (0.5 + lengthRatio * 0.5);
            }
          } else {
            continue; // 两种匹配方式都失败
          }
        } else {
          continue; // 无法提取首字母
        }
      } else {
        continue; // 无法匹配
      }
      
      results.push({
        id: component.id,
        name: component.name,
        description: component.description,
        libraryName: component.libraryName,
        fileKey: component.fileKey,
        nodeId: component.nodeId,
        key: component.key,
        thumbnail: component.thumbnail,
        keywordScore: score,
        isPrefixMatch: isPrefixMatch,
        matchIndex: matchStartIndex,
        matchType: matchType,
        matchedLength: matchedLength
      });
    }
    
    return results;
  }
  
  // 如果是纯关键词搜索或不启用向量搜索，直接返回关键词搜索结果
  if (searchType === 'keyword' || !CONFIG.USE_VECTOR_SEARCH) {
    var keywordResults = performKeywordSearch(query);
    
    // 渐进式排序：第一步按匹配字符长度降序，第二步按字母顺序升序
    keywordResults.sort(function(a, b) {
      // 第一步：按匹配字符长度降序排序（匹配字符越长，优先级越高）
      var lenA = a.matchedLength || 0;
      var lenB = b.matchedLength || 0;
      
      if (lenB !== lenA) {
        return lenB - lenA;
      }
      
      // 第二步：同匹配长度时，按组件名称完整字母顺序升序排序（A-Z/a-z）
      var nameA = (a.name || '').toLowerCase();
      var nameB = (b.name || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
    
    return Promise.resolve(keywordResults);
  }
  
  // 向量搜索或混合搜索
  var startTime = Date.now();
  
  // 先获取关键词搜索结果（用于混合搜索）
  var keywordResults = searchType === 'hybrid' ? performKeywordSearch(query) : [];
  
  // 计算查询向量
  return calculateTextEmbedding(query)
    .then(function(queryVector) {
      if (!queryVector) {
        // 向量计算失败，回退到关键词搜索
        keywordResults.sort(function(a, b) {
          if (b.matchedLength !== a.matchedLength) {
            return b.matchedLength - a.matchedLength;
          }
          var nameA = (a.name || '').toLowerCase();
          var nameB = (b.name || '').toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });
        return keywordResults;
      }
      
      // 获取当前页的组件（用于批量计算向量）
      var currentPageComponents = [];
      for (var i = 0; i < componentIndex.length; i++) {
        var component = componentIndex[i];
        if (component.fileKey === selectedLibraryFileKey) {
          currentPageComponents.push(component);
        }
      }
      
      // 限制批量计算的范围（只计算前100个组件，避免延迟过高）
      var componentsToProcess = currentPageComponents.slice(0, 100);
      
      // 批量计算组件向量（延迟计算）
      return batchCalculateComponentVectors(componentsToProcess, queryVector)
        .then(function() {
          // 计算向量相似度
          var vectorResults = [];
          
          for (var i = 0; i < componentsToProcess.length; i++) {
            var component = componentsToProcess[i];
            var cached = vectorCache[component.id];
            
            if (!cached || !cached.vector) {
              continue; // 向量计算失败或未计算
            }
            
            var similarity = cosineSimilarity(queryVector, cached.vector);
            
            if (similarity > 0.3) { // 相似度阈值，可调整
              vectorResults.push({
                id: component.id,
                name: component.name,
                description: component.description,
                libraryName: component.libraryName,
                fileKey: component.fileKey,
                nodeId: component.nodeId,
                key: component.key,
                thumbnail: component.thumbnail,
                vectorScore: similarity,
                keywordScore: 0,
                matchedLength: 0
              });
            }
          }
          
          // 混合搜索结果
          if (searchType === 'hybrid') {
            // 合并关键词和向量结果
            var resultMap = {};
            
            // 添加关键词结果
            for (var i = 0; i < keywordResults.length; i++) {
              var r = keywordResults[i];
              resultMap[r.id] = r;
            }
            
            // 合并向量结果（如果关键词结果中没有）
            for (var i = 0; i < vectorResults.length; i++) {
              var r = vectorResults[i];
              if (resultMap[r.id]) {
                // 组合分数：关键词分数 * 0.6 + 向量分数 * 0.4
                resultMap[r.id].vectorScore = r.vectorScore;
                resultMap[r.id].combinedScore = (resultMap[r.id].keywordScore * 0.6) + (r.vectorScore * 0.4);
              } else {
                resultMap[r.id] = r;
                resultMap[r.id].combinedScore = r.vectorScore;
              }
            }
            
            var combinedResults = [];
            for (var id in resultMap) {
              combinedResults.push(resultMap[id]);
            }
            
            // 按组合分数排序
            combinedResults.sort(function(a, b) {
              var scoreA = a.combinedScore || a.keywordScore || a.vectorScore || 0;
              var scoreB = b.combinedScore || b.keywordScore || b.vectorScore || 0;
              
              if (Math.abs(scoreB - scoreA) > 0.01) {
                return scoreB - scoreA;
              }
              
              var nameA = (a.name || '').toLowerCase();
              var nameB = (b.name || '').toLowerCase();
              if (nameA < nameB) return -1;
              if (nameA > nameB) return 1;
              return 0;
            });
            
            return combinedResults;
          } else {
            // 纯向量搜索，按相似度排序
            vectorResults.sort(function(a, b) {
              if (b.vectorScore !== a.vectorScore) {
                return b.vectorScore - a.vectorScore;
              }
              var nameA = (a.name || '').toLowerCase();
              var nameB = (b.name || '').toLowerCase();
              if (nameA < nameB) return -1;
              if (nameA > nameB) return 1;
              return 0;
            });
            
            return vectorResults;
          }
        });
    })
    .then(function(results) {
      var elapsed = Date.now() - startTime;
      console.log('搜索耗时:', elapsed, 'ms');
      
      // 确保延迟不超过500ms（如果超过，记录警告但继续返回结果）
      if (elapsed > 500) {
        console.warn('搜索延迟超过500ms:', elapsed, 'ms');
      }
      
      return results;
    })
    .catch(function(error) {
      console.error('搜索错误:', error);
      // 出错时回退到关键词搜索
      keywordResults.sort(function(a, b) {
        if (b.matchedLength !== a.matchedLength) {
          return b.matchedLength - a.matchedLength;
        }
        var nameA = (a.name || '').toLowerCase();
        var nameB = (b.name || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });
      return keywordResults;
    });
}

// ====================
// 插入组件
// ====================
function insertComponent(componentKey) {
  return figma.importComponentByKeyAsync(componentKey)
    .then(function(component) {
      if (component) {
        var instance = component.createInstance();
        var viewport = figma.viewport.center;
        instance.x = viewport.x - instance.width / 2;
        instance.y = viewport.y - instance.height / 2;
        figma.currentPage.selection = [instance];
        figma.viewport.scrollAndZoomIntoView([instance]);
        
        figma.ui.postMessage({ 
          type: 'insert-success', 
          message: '已插入组件: ' + component.name
        });
      }
    })
    .catch(function(error) {
      figma.ui.postMessage({ 
        type: 'insert-error', 
        message: '插入失败: ' + error.message
      });
    });
}

// ====================
// 消息处理
// ====================
figma.ui.onmessage = function(msg) {
  switch (msg.type) {
    case 'init':
      // 初始化时加载所有组件库
      loadAllLibraries();
      break;
      
    case 'select-library':
      // 切换选中的组件库
      var targetLibrary = msg.libraryFileKey;
      if (targetLibrary) {
        selectedLibraryFileKey = targetLibrary;
        
        // 如果当前有搜索查询，重新搜索
        if (msg.query) {
          searchComponents(msg.query, 'keyword')
            .then(function(results) {
              figma.ui.postMessage({ 
                type: 'search-results', 
                results: results 
              });
            })
            .catch(function(error) {
              figma.ui.postMessage({ 
                type: 'search-error', 
                message: '搜索失败: ' + error.message 
              });
            });
        } else {
          // 清空搜索结果
          figma.ui.postMessage({ 
            type: 'search-results', 
            results: [] 
          });
        }
      }
      break;
      
    case 'search':
      var searchType = msg.searchType || 'keyword'; // 'keyword' | 'vector' | 'hybrid' | 'image'
      searchComponents(msg.query, searchType)
        .then(function(results) {
          figma.ui.postMessage({ 
            type: 'search-results', 
            results: results 
          });
        })
        .catch(function(error) {
          figma.ui.postMessage({ 
            type: 'search-error', 
            message: '搜索失败: ' + error.message 
          });
        });
      break;
      
    case 'insert':
      insertComponent(msg.componentKey);
      break;
      
    case 'close':
figma.closePlugin();
      break;
  }
};

// ====================
// 启动插件
// ====================
figma.showUI(__html__, { 
  width: 600, 
  height: 600,
  themeColors: true
});
