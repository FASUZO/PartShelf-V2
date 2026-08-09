/**
 * LCSC Playwright Scraper
 * 使用 playwright 无头浏览器查询立创商城 BOM 数据
 * 支持 cookie 持久化，避免重复扫码登录
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createServer } from 'http';

const COOKIES_FILE = join(process.cwd(), 'lcsc-cookies.json');
const BOM_API_BASE = 'https://bom.szlcsc.com/async/bom/match/page';

/**
 * 加载保存的 cookie
 */
function loadCookies() {
  if (!existsSync(COOKIES_FILE)) {
    return null;
  }
  try {
    const data = JSON.parse(readFileSync(COOKIES_FILE, 'utf-8'));
    return data.cookies || [];
  } catch (e) {
    console.error('Failed to load cookies:', e.message);
    return null;
  }
}

/**
 * 保存 cookie 到文件
 */
function saveCookies(cookies) {
  const data = { cookies };
  writeFileSync(COOKIES_FILE, JSON.stringify(data, null, 2));
  console.log('Cookies saved to', COOKIES_FILE);
}

/**
 * 启动浏览器并加载 cookie
 */
async function launchBrowser(headless = true) {
  const browser = await chromium.launch({
    headless,
    channel: 'msedge', // 使用本机 Edge
  });

  const context = await browser.newContext();
  
  // 加载保存的 cookie
  const cookies = loadCookies();
  if (cookies && cookies.length > 0) {
    await context.addCookies(cookies);
    console.log('Loaded', cookies.length, 'cookies');
  }

  return { browser, context };
}

/**
 * 通过立创 BOM API 查询指定 LC 编号的产品数据
 * @param {string} lcCode - LC 编号，如 "C192666"
 * @param {string} bomUuid - BOM 清单 UUID（可选）
 * @param {boolean} headless - 是否无头模式
 * @returns {Promise<object|null>} 产品数据或 null
 */
async function queryByLcCode(lcCode, bomUuid = null, headless = true) {
  const { browser, context } = await launchBrowser(headless);
  
  try {
    const page = await context.newPage();
    
    // 访问 BOM 页面建立会话
    await page.goto(`https://bom.szlcsc.com/member/bom-list.html`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 检查是否需要登录
    const title = await page.title();
    if (title.includes('登录')) {
      console.error('需要登录，请先扫码登录并保存 cookie');
      const cookies = await context.cookies();
      saveCookies(cookies);
      return null;
    }

    // 先尝试直接搜索产品
    const result = await page.evaluate(async (lcCode) => {
      // 方法1: 使用产品搜索 API
      try {
        const searchResp = await fetch(`https://bom.szlcsc.com/async/bom/match/finished/v2`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ searchText: lcCode }),
        });
        const searchData = await searchResp.json();
        
        if (searchData.result && searchData.result.bom && searchData.result.bom.bomItemList) {
          const found = searchData.result.bom.bomItemList.find(
            i => i.productCode === lcCode || i.firstProductCode === lcCode
          );
          if (found && found.frontProductVO) {
            const product = found.frontProductVO;
            return {
              lcCode: product.code || lcCode,
              productName: product.productName || '',
              productModel: product.productModel || '',
              brand: product.brand || '',
              pack: product.pack || '',
              price: product.price || '',
              stock: product.stock || 0,
              stockStatus: product.stockStatus || 'unknown',
              moq: product.moq || 1,
              params: product.remarkPrefix?.replace(/<\/br>/g, '; ') || '',
            };
          }
        }
      } catch (e) {
        console.log('Search API failed:', e.message);
      }

      // 方法2: 从 BOM 列表查找
      try {
        const listResp = await fetch('https://bom.szlcsc.com/async/bom/match/list');
        const listData = await listResp.json();
        
        if (listData.result && listData.result.length > 0) {
          for (const bom of listData.result) {
            try {
              const bomResp = await fetch(`https://bom.szlcsc.com/async/bom/match/page?bomUuid=${bom.uuid}`);
              const bomData = await bomResp.json();
              if (bomData.result && bomData.result.bom && bomData.result.bom.bomItemList) {
                const found = bomData.result.bom.bomItemList.find(
                  i => i.productCode === lcCode || i.firstProductCode === lcCode
                );
                if (found && found.frontProductVO) {
                  const product = found.frontProductVO;
                  return {
                    lcCode: product.code || lcCode,
                    productName: product.productName || '',
                    productModel: product.productModel || '',
                    brand: product.brand || '',
                    pack: product.pack || '',
                    price: product.price || '',
                    stock: product.stock || 0,
                    stockStatus: product.stockStatus || 'unknown',
                    moq: product.moq || 1,
                    params: product.remarkPrefix?.replace(/<\/br>/g, '; ') || '',
                  };
                }
              }
            } catch (e) {
              continue;
            }
          }
        }
      } catch (e) {
        console.log('BOM list failed:', e.message);
      }

      return null;
    }, lcCode);

    // 保存更新的 cookie
    const cookies = await context.cookies();
    saveCookies(cookies);

    return result;
  } catch (e) {
    console.error('Query failed:', e.message);
    return null;
  } finally {
    await browser.close();
  }
}

/**
 * 查询 BOM 清单中所有物料
 * @param {string} bomUuid - BOM 清单 UUID
 * @param {boolean} headless - 是否无头模式
 * @returns {Promise<object[]>} 物料列表
 */
async function queryAllItems(bomUuid = 'B4CDDD24823706B049EA2218BB7552E6', headless = true) {
  const { browser, context } = await launchBrowser(headless);
  
  try {
    const page = await context.newPage();
    
    await page.goto(`https://bom.szlcsc.com/member/bom-sheet.html?bomUuid=${bomUuid}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const title = await page.title();
    if (title.includes('登录')) {
      console.error('需要登录，请先扫码登录并保存 cookie');
      return [];
    }

    const result = await page.evaluate(async (bomUuid) => {
      const resp = await fetch(`https://bom.szlcsc.com/async/bom/match/page?bomUuid=${bomUuid}`);
      const data = await resp.json();
      
      if (!data.result || !data.result.bom || !data.result.bom.bomItemList) {
        return [];
      }

      return data.result.bom.bomItemList.map(item => {
        const product = item.frontProductVO || {};
        return {
          lcCode: product.code || item.productCode,
          productName: product.productName || item.firstModel,
          productModel: product.productModel || item.firstModel,
          brand: product.brand || item.firstBrand,
          pack: product.pack || item.firstPack,
          price: product.price,
          stock: product.stock,
          stockStatus: product.stockStatus,
          deliveryDate: product.deliveryDate,
          moq: product.moq,
          quantity: item.quantity,
          matchType: item.matchType,
        };
      });
    }, bomUuid);

    const cookies = await context.cookies();
    saveCookies(cookies);

    return result;
  } catch (e) {
    console.error('Query failed:', e.message);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * 扫码登录并保存 cookie
 * @param {string} bomUuid - BOM 清单 UUID
 */
async function loginAndSaveCookies(bomUuid = 'B4CDDD24823706B049EA2218BB7552E6') {
  const browser = await chromium.launch({
    headless: false, // 必须有头模式才能扫码
    channel: 'msedge',
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('请扫码登录立创商城...');
  await page.goto(`https://bom.szlcsc.com/member/bom-sheet.html?bomUuid=${bomUuid}`, {
    timeout: 120000, // 2 分钟超时
  });

  // 等待页面跳转到 BOM 页面（表示登录成功）
  await page.waitForFunction(() => {
    return document.title.includes('BOM') || document.title.includes('配单');
  }, { timeout: 120000 });

  console.log('登录成功！');
  
  // 保存 cookie
  const cookies = await context.cookies();
  saveCookies(cookies);

  await browser.close();
  return true;
}

/**
 * 启动 HTTP 服务器，提供 REST API
 * @param {number} port - 端口号，默认 3000
 */
async function startServer(port = 3000) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const path = url.pathname;
    const params = Object.fromEntries(url.searchParams);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      let result;

      switch (path) {
        case '/query':
          if (!params.lcCode) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing lcCode parameter' }));
            return;
          }
          result = await queryByLcCode(params.lcCode, params.bomUuid, true);
          res.writeHead(200);
          res.end(JSON.stringify(result || { error: 'Query failed' }));
          break;

        case '/list':
          const items = await queryAllItems(params.bomUuid, true);
          res.writeHead(200);
          res.end(JSON.stringify({ count: items.length, items }));
          break;

        case '/cookies':
          const cookies = loadCookies();
          res.writeHead(200);
          res.end(JSON.stringify({ 
            exists: !!cookies, 
            count: cookies ? cookies.length : 0,
            file: COOKIES_FILE 
          }));
          break;

        default:
          res.writeHead(404);
          res.end(JSON.stringify({ 
            error: 'Not found',
            endpoints: [
              'GET /query?lcCode=<LC编号>&bomUuid=<可选>',
              'GET /list?bomUuid=<可选>',
              'GET /cookies',
            ]
          }));
      }
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  });

  server.listen(port, () => {
    console.log(`LCSC Scraper API running at http://localhost:${port}`);
    console.log(`Endpoints:`);
    console.log(`  GET /query?lcCode=C192666`);
    console.log(`  GET /list`);
    console.log(`  GET /cookies`);
  });
}

/**
 * 获取登录二维码
 * @returns {Promise<object>} 包含二维码图片 base64 或 URL
 */
async function getQrCode() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 访问登录页面
    await page.goto('https://bom.szlcsc.com/member/bom-list.html', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 检查是否已登录
    const title = await page.title();
    if (!title.includes('登录')) {
      // 已登录
      const cookies = await context.cookies();
      saveCookies(cookies);
      await browser.close();
      return { success: true, message: '已登录', logged_in: true };
    }

    // 等待二维码加载
    await page.waitForTimeout(5000);

    // 截图二维码区域 - 使用正确的选择器
    let qrImageBase64 = null;
    try {
      const qrElement = await page.locator('img.qr').first();
      const buffer = await qrElement.screenshot();
      qrImageBase64 = buffer.toString('base64');
    } catch (e) {
      // 如果找不到二维码元素，截取整个页面
      console.log('QR element not found, capturing page');
      const buffer = await page.screenshot();
      qrImageBase64 = buffer.toString('base64');
    }

    await browser.close();
    return {
      success: true,
      qrcode_base64: qrImageBase64,
      message: '请扫描二维码登录'
    };
  } catch (e) {
    await browser.close();
    return { success: false, message: e.message };
  }
}

/**
 * 检查登录状态
 * @returns {Promise<object>} 登录状态
 */
async function checkLoginStatus() {
  const cookies = loadCookies();
  if (!cookies || cookies.length === 0) {
    return { logged_in: false, message: '无Cookie' };
  }

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext();

  try {
    await context.addCookies(cookies);
    const page = await context.newPage();
    await page.goto('https://bom.szlcsc.com/member/bom-list.html', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const title = await page.title();
    const isLoggedIn = !title.includes('登录');

    // 保存更新的 cookie
    const newCookies = await context.cookies();
    saveCookies(newCookies);

    await browser.close();
    return { logged_in: isLoggedIn, message: isLoggedIn ? '已登录' : '未登录' };
  } catch (e) {
    await browser.close();
    return { logged_in: false, message: e.message };
  }
}

/**
 * 刷新Cookie
 * @returns {Promise<object>} 刷新结果
 */
async function refreshCookies() {
  const status = await checkLoginStatus();
  return {
    success: status.logged_in,
    message: status.message
  };
}

// ES Module export
export {
  queryByLcCode,
  queryAllItems,
  loginAndSaveCookies,
  loadCookies,
  saveCookies,
  startServer,
  getQrCode,
  checkLoginStatus,
  refreshCookies,
};

// 命令行直接运行
if (process.argv[1] && process.argv[1].endsWith('lcsc-playwright-scraper.mjs')) {
  const command = process.argv[2];
  const param = process.argv[3];

  switch (command) {
    case 'login':
      loginAndSaveCookies(param)
        .then(success => console.log(success ? '登录完成' : '登录失败'))
        .catch(e => console.error('Error:', e.message));
      break;

    case 'query':
      if (!param) {
        console.error('用法: node lcsc-playwright-scraper.mjs query <LC编号>');
        process.exit(1);
      }
      queryByLcCode(param, undefined, true)
        .then(result => {
          if (!result) {
            console.error('Error: 查询返回空结果');
          } else if (result.error) {
            console.error('Error:', result.error);
          } else {
            console.log(JSON.stringify(result, null, 2));
          }
        })
        .catch(e => console.error('Error:', e.message));
      break;

    case 'list':
      queryAllItems(param, true)
        .then(items => {
          console.log(`Found ${items.length} items:`);
          items.forEach(item => {
            console.log(`- ${item.lcCode}: ${item.productModel} (${item.brand}) - ${item.stockStatus === 'now' ? '现货' : '期货'}`);
          });
        })
        .catch(e => console.error('Error:', e.message));
      break;

    case 'qrcode':
      getQrCode()
        .then(result => console.log(JSON.stringify(result)))
        .catch(e => console.error(JSON.stringify({ success: false, message: e.message })));
      break;

    case 'status':
      checkLoginStatus()
        .then(result => console.log(JSON.stringify(result)))
        .catch(e => console.error(JSON.stringify({ logged_in: false, message: e.message })));
      break;

    case 'refresh':
      refreshCookies()
        .then(result => console.log(JSON.stringify(result)))
        .catch(e => console.error(JSON.stringify({ success: false, message: e.message })));
      break;

    case 'serve':
      startServer(parseInt(param) || 3000);
      break;

    default:
      console.log(`
LCSC Playwright Scraper

用法:
  node lcsc-playwright-scraper.mjs login [bomUuid]    # 扫码登录并保存 cookie
  node lcsc-playwright-scraper.mjs query <LC编号>     # 查询指定 LC 编号数据
  node lcsc-playwright-scraper.mjs list [bomUuid]     # 列出 BOM 清单所有物料
  node lcsc-playwright-scraper.mjs qrcode             # 获取登录二维码
  node lcsc-playwright-scraper.mjs status             # 检查登录状态
  node lcsc-playwright-scraper.mjs refresh            # 刷新Cookie
  node lcsc-playwright-scraper.mjs serve [port]       # 启动 HTTP 服务器

示例:
  node lcsc-playwright-scraper.mjs login
  node lcsc-playwright-scraper.mjs query C192666
  node lcsc-playwright-scraper.mjs list
  node lcsc-playwright-scraper.mjs qrcode
  node lcsc-playwright-scraper.mjs serve 3000
      `);
  }
}
