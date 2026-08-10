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
const DEFAULT_BOM_UUID = 'B4CDDD24823706B049EA2218BB7552E6';

// 持久化浏览器会话状态
let _browser = null;
let _context = null;
let _page = null;
let _bomReady = false;
let _initPromise = null;

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

// ─────────────────────────────────────────────
// 持久化浏览器会话管理
// ─────────────────────────────────────────────

/**
 * 初始化持久化浏览器会话（单例）
 * @param {string} bomUuid - BOM 清单 UUID
 * @returns {Promise<boolean>} 是否初始化成功
 */
async function initPersistentSession(bomUuid = DEFAULT_BOM_UUID) {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      console.log('[persistent] Launching browser...');
      _browser = await chromium.launch({ headless: true });
      _context = await _browser.newContext();

      const cookies = loadCookies();
      if (cookies && cookies.length > 0) {
        await _context.addCookies(cookies);
        console.log('[persistent] Loaded', cookies.length, 'cookies');
      }

      _page = await _context.newPage();
      console.log('[persistent] Loading BOM page...');
      await _page.goto(
        `https://bom.szlcsc.com/member/bom-sheet.html?bomUuid=${bomUuid}`,
        { waitUntil: 'networkidle', timeout: 60000 },
      );

      const title = await _page.title();
      const content = await _page.content();
      if (title.includes('登录') || content.includes('扫码登录') || content.includes('qrcode')) {
        console.error('[persistent] Login required');
        _initPromise = null;
        return false;
      }

      _bomReady = true;
      console.log('[persistent] BOM page ready');

      const newCookies = await _context.cookies();
      saveCookies(newCookies);
      return true;
    } catch (e) {
      console.error('[persistent] Init failed:', e.message);
      _initPromise = null;
      return false;
    }
  })();

  return _initPromise;
}

/**
 * 确保会话可用，不可用则重新初始化
 */
async function ensureSession(bomUuid = DEFAULT_BOM_UUID) {
  if (_bomReady && _page && !_page.isClosed()) return true;
  _bomReady = false;
  _initPromise = null;
  if (_browser) {
    try { await _browser.close(); } catch (_) {}
    _browser = null; _context = null; _page = null;
  }
  return initPersistentSession(bomUuid);
}

/**
 * 通过 CSV 上传将物料添加到 BOM 再查询
 */
async function addAndQueryBomItem(lcCode, bomUuid = DEFAULT_BOM_UUID) {
  const { unlinkSync } = await import('fs');
  const tmpFile = join(process.cwd(), 'tmp_bom_upload.csv');
  writeFileSync(tmpFile, `Name,Quantity\n${lcCode},1`);

  try {
    const fileInput = _page.locator('input#file[type=file]');
    if ((await fileInput.count()) === 0) return { error: 'File input not found' };

    let newBomUuid = null;
    const onRequest = (req) => {
      if (req.url().includes('bom/match/finished/v2') && req.method() === 'POST') {
        const m = (req.postData() || '').match(/bsuuid=([A-F0-9]+)/i);
        if (m) newBomUuid = m[1];
      }
    };
    _page.on('request', onRequest);

    await fileInput.setInputFiles(tmpFile);
    await _page.waitForTimeout(10000);
    _page.off('request', onRequest);

    const targetUuid = newBomUuid && newBomUuid !== bomUuid ? newBomUuid : bomUuid;
    if (newBomUuid && newBomUuid !== bomUuid) {
      console.log('[persistent] New BOM created:', newBomUuid);
    }

    const result = await _page.evaluate(async ({ lcCode, bomUuid }) => {
      try {
        const resp = await fetch('https://bom.szlcsc.com/async/bom/match/finished/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `bsuuid=${bomUuid}&bomUuid=${bomUuid}&bomItemIdStr=&pageSource=sheet`,
        });
        const data = await resp.json();
        const items = data?.result?.bom?.bomItemList;
        if (!items) return null;
        const found = items.find(i => i.productCode === lcCode || i.firstProductCode === lcCode);
        if (!found?.frontProductVO) return null;
        const p = found.frontProductVO;
        return {
          lcCode: p.code || lcCode,
          productName: p.productName || '',
          productModel: p.productModel || '',
          brand: p.brand || '',
          pack: p.pack || '',
          price: p.price || '',
          stock: p.stock || 0,
          stockStatus: p.stockStatus || 'unknown',
          moq: p.moq || 1,
          params: p.remarkPrefix ? p.remarkPrefix.replace(/<\/br>/g, '; ') : '',
        };
      } catch (_) { return null; }
    }, { lcCode, bomUuid: targetUuid });

    return result || { error: 'Item not found after upload' };
  } finally {
    try { unlinkSync(tmpFile); } catch (_) {}
  }
}

/**
 * 使用持久化会话查询 LC 编号
 */
async function queryByLcCodePersistent(lcCode, bomUuid = DEFAULT_BOM_UUID) {
  const ready = await ensureSession(bomUuid);
  if (!ready) return { error: 'Session not ready, login required' };

  try {
    const result = await _page.evaluate(async ({ lcCode, bomUuid }) => {
      try {
        const resp = await fetch('https://bom.szlcsc.com/async/bom/match/finished/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `bsuuid=${bomUuid}&bomUuid=${bomUuid}&bomItemIdStr=&pageSource=sheet`,
        });
        const data = await resp.json();
        const items = data?.result?.bom?.bomItemList;
        if (!items) return null;
        const found = items.find(i => i.productCode === lcCode || i.firstProductCode === lcCode);
        if (found?.frontProductVO) {
          const p = found.frontProductVO;
          return {
            lcCode: p.code || lcCode,
            productName: p.productName || '',
            productModel: p.productModel || '',
            brand: p.brand || '',
            pack: p.pack || '',
            price: p.price || '',
            stock: p.stock || 0,
            stockStatus: p.stockStatus || 'unknown',
            moq: p.moq || 1,
            params: p.remarkPrefix ? p.remarkPrefix.replace(/<\/br>/g, '; ') : '',
          };
        }
        return { notInBom: true };
      } catch (e) { return { error: e.message }; }
    }, { lcCode, bomUuid });

    if (result?.notInBom) {
      console.log(`[persistent] ${lcCode} not in BOM, uploading CSV...`);
      return await addAndQueryBomItem(lcCode, bomUuid);
    }
    return result;
  } catch (e) {
    console.error('[persistent] Query error:', e.message);
    _bomReady = false;
    return { error: e.message };
  }
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
  const defaultBomUuid = bomUuid || 'B4CDDD24823706B049EA2218BB7552E6';
  
  try {
    const page = await context.newPage();
    
    // 访问 BOM 页面建立会话
    await page.goto(`https://bom.szlcsc.com/member/bom-sheet.html?bomUuid=${defaultBomUuid}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 检查是否需要登录
    const title = await page.title();
    const content = await page.content();
    if (title.includes('登录') || content.includes('扫码登录') || content.includes('qrcode')) {
      console.error('需要登录，请先扫码登录并保存 cookie');
      const cookies = await context.cookies();
      saveCookies(cookies);
      return null;
    }

    // 先尝试直接搜索产品
    let result = await page.evaluate(async ({ lcCode, bomUuid }) => {
      // 方法1: 使用 BOM finished/v2 API（正确的格式）
      try {
        const searchResp = await fetch('https://bom.szlcsc.com/async/bom/match/finished/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `bsuuid=${bomUuid}&bomUuid=${bomUuid}&bomItemIdStr=&pageSource=sheet`,
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
    }, { lcCode, bomUuid: defaultBomUuid });

    // 如果没找到，通过上传CSV添加到BOM再查询
    if (!result) {
      console.log(`LC code ${lcCode} not found in BOM, uploading CSV to add...`);
      
      // 创建临时CSV文件
      const { writeFileSync, unlinkSync } = await import('fs');
      const { join } = await import('path');
      const tmpFile = join(process.cwd(), 'tmp_bom_upload.csv');
      writeFileSync(tmpFile, `Name,Quantity\n${lcCode},1`);
      
      // 上传CSV文件
      const fileInput = await page.locator('input#file[type=file]');
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(tmpFile);
        
        // 监听页面跳转获取新BOM UUID
        let newBomUuid = null;
        page.on('request', request => {
          const url = request.url();
          if (url.includes('bom/match/finished/v2') && request.method() === 'POST') {
            const body = request.postData() || '';
            const match = body.match(/bsuuid=([A-F0-9]+)/i);
            if (match) newBomUuid = match[1];
          }
        });
        
        // 等待上传处理和页面跳转
        await page.waitForTimeout(10000);
        
        // 如果获取到了新BOM UUID，用它查询
        if (newBomUuid && newBomUuid !== defaultBomUuid) {
          console.log(`New BOM created: ${newBomUuid}`);
          result = await page.evaluate(async ({ lcCode, bomUuid }) => {
            try {
              const searchResp = await fetch('https://bom.szlcsc.com/async/bom/match/finished/v2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `bsuuid=${bomUuid}&bomUuid=${bomUuid}&bomItemIdStr=&pageSource=sheet`,
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
              console.log('Query new BOM failed:', e.message);
            }
            return null;
          }, { lcCode, bomUuid: newBomUuid });
        }
      }
      
      // 清理临时文件
      try { unlinkSync(tmpFile); } catch(e) {}
    }

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
async function startServer(port = 3001) {
  // 启动时预初始化浏览器会话
  initPersistentSession().catch(e => {
    console.error('[server] Pre-init failed:', e.message);
  });

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const path = url.pathname;
    const params = Object.fromEntries(url.searchParams);

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
      switch (path) {
        case '/health':
          res.writeHead(200);
          res.end(JSON.stringify({
            status: _bomReady ? 'ready' : 'initializing',
            browserAlive: !!_browser,
          }));
          break;

        case '/query':
          if (!params.lcCode) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing lcCode parameter' }));
            return;
          }
          const qResult = await queryByLcCodePersistent(params.lcCode, params.bomUuid);
          res.writeHead(200);
          res.end(JSON.stringify(qResult || { error: 'Query failed' }));
          break;

        case '/list': {
          const ready = await ensureSession(params.bomUuid || DEFAULT_BOM_UUID);
          if (!ready) {
            res.writeHead(503);
            res.end(JSON.stringify({ error: 'Session not ready' }));
            return;
          }
          const bomId = params.bomUuid || DEFAULT_BOM_UUID;
          const items = await _page.evaluate(async (bomUuid) => {
            const resp = await fetch(`https://bom.szlcsc.com/async/bom/match/page?bomUuid=${bomUuid}`);
            const data = await resp.json();
            if (!data?.result?.bom?.bomItemList) return [];
            return data.result.bom.bomItemList.map(item => {
              const p = item.frontProductVO || {};
              return {
                lcCode: p.code || item.productCode,
                productName: p.productName || item.firstModel,
                productModel: p.productModel || item.firstModel,
                brand: p.brand || item.firstBrand,
                pack: p.pack || item.firstPack,
                price: p.price, stock: p.stock, stockStatus: p.stockStatus,
                moq: p.moq, quantity: item.quantity,
              };
            });
          }, bomId);
          res.writeHead(200);
          res.end(JSON.stringify({ count: items.length, items }));
          break;
        }

        case '/cookies': {
          const ck = loadCookies();
          res.writeHead(200);
          res.end(JSON.stringify({ exists: !!ck, count: ck ? ck.length : 0 }));
          break;
        }

        case '/shutdown':
          res.writeHead(200);
          res.end(JSON.stringify({ message: 'Shutting down' }));
          if (_browser) { try { await _browser.close(); } catch (_) {} }
          process.exit(0);
          break;

        default:
          res.writeHead(404);
          res.end(JSON.stringify({
            error: 'Not found',
            endpoints: [
              'GET /health',
              'GET /query?lcCode=<LC编号>&bomUuid=<可选>',
              'GET /list?bomUuid=<可选>',
              'GET /cookies',
              'POST /shutdown',
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
    console.log(`  GET  /health`);
    console.log(`  GET  /query?lcCode=C192666`);
    console.log(`  GET  /list`);
    console.log(`  GET  /cookies`);
    console.log(`  POST /shutdown`);
  });
}

/**
 * 获取登录二维码
 * @returns {Promise<object>} 包含二维码图片 base64 或 URL
 */
async function getQrCode() {
  const browser = await chromium.launch({
    headless: true,

  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 访问登录页面
    await page.goto('https://bom.szlcsc.com/member/bom-list.html', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 检查是否已登录 - 通过页面内容判断
    const url = page.url();
    const content = await page.content();
    const hasQrCode = content.includes('qr') || content.includes('qrcode') || content.includes('二维码');
    const isLoginUrl = url.includes('login') || url.includes('passport');
    
    // 如果页面有二维码或跳转到了登录页，说明未登录
    if (hasQrCode || isLoginUrl) {
      // 未登录，继续获取二维码
    } else {
      // 可能已登录，保存cookie
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

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  try {
    await context.addCookies(cookies);
    const page = await context.newPage();
    await page.goto('https://bom.szlcsc.com/member/bom-list.html', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 检查页面是否包含登录相关的元素或URL
    const url = page.url();
    const title = await page.title();
    const content = await page.content();
    
    // 判断是否已登录：页面不包含登录相关内容
    const isLoginPage = url.includes('login') || 
                        title.includes('登录') || 
                        title.includes('Login') ||
                        content.includes('扫码登录') ||
                        content.includes('请登录') ||
                        content.includes('qrcode') ||
                        content.includes('二维码');
    
    const isLoggedIn = !isLoginPage;

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
  initPersistentSession,
  ensureSession,
  queryByLcCodePersistent,
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

    case 'cookies':
      (async () => {
        const cookies = loadCookies();
        if (cookies && cookies.length > 0) {
          console.log(JSON.stringify({ status: 'ok', message: `已加载 ${cookies.length} 个Cookie` }));
        } else {
          console.log(JSON.stringify({ status: 'error', message: '未找到Cookie，请先登录' }));
        }
      })();
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
      startServer(parseInt(param) || 3001);
      break;

    default:
      console.log(`
LCSC Playwright Scraper (Persistent Mode)

用法:
  node lcsc-playwright-scraper.mjs login [bomUuid]    # 扫码登录并保存 cookie
  node lcsc-playwright-scraper.mjs query <LC编号>     # 查询指定 LC 编号数据
  node lcsc-playwright-scraper.mjs list [bomUuid]     # 列出 BOM 清单所有物料
  node lcsc-playwright-scraper.mjs qrcode             # 获取登录二维码
  node lcsc-playwright-scraper.mjs status             # 检查登录状态
  node lcsc-playwright-scraper.mjs refresh            # 刷新Cookie
  node lcsc-playwright-scraper.mjs serve [port]       # 启动持久化 HTTP 服务器 (默认 3001)

示例:
  node lcsc-playwright-scraper.mjs serve              # 启动持久化服务器 (端口 3001)
  node lcsc-playwright-scraper.mjs query C192666
  node lcsc-playwright-scraper.mjs login
      `);
  }
}
