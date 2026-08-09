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
 * 使用 https://bom.szlcsc.com/async/bom/match/finished/v2 接口
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

    // 使用 BOM 搜索 API 查询产品
    const result = await page.evaluate(async (lcCode) => {
      // 使用 BOM 搜索 API
      const searchUrl = `https://bom.szlcsc.com/async/bom/match/finished/v2`;
      const resp = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchText: lcCode,
          bomUuid: '',
          matchType: 'perfect',
        }),
      });
      
      const data = await resp.json();
      
      // 查找匹配的产品
      if (data.result && data.result.length > 0) {
        const product = data.result[0];
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

      // 如果搜索 API 没有结果，尝试从 BOM 列表查找
      const listResp = await fetch(`https://bom.szlcsc.com/async/bom/match/list`);
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

// ES Module export
export {
  queryByLcCode,
  queryAllItems,
  loginAndSaveCookies,
  loadCookies,
  saveCookies,
  startServer,
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
          if (result.error) {
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
  node lcsc-playwright-scraper.mjs serve [port]       # 启动 HTTP 服务器

示例:
  node lcsc-playwright-scraper.mjs login
  node lcsc-playwright-scraper.mjs query C192666
  node lcsc-playwright-scraper.mjs list
  node lcsc-playwright-scraper.mjs serve 3000
      `);
  }
}
