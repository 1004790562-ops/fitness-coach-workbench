/*
 * 健身教练工作台 · 云同步后端（零依赖，仅用 Node 内置模块）
 *
 * 作用：把工作台数据存在服务器上的 data.json，所有设备访问同一网址即共享同一份数据。
 * 部署后：前端把 localStorage 改为调用本后端的 /api/data 即可实现真·跨设备同步。
 *
 * 启动：
 *   node server.js            # 默认端口 3000
 *   PORT=8080 node server.js  # 自定义端口
 *
 * 前端接入（二选一）：
 *   1) 最简：保持前端 localStorage，用「导出/导入」手动迁移（当前默认）。
 *   2) 真同步：把 index.html 中 save()/load() 改为 fetch('/api/data')。
 *      可搜索本文件末尾的「前端对接示例」照抄。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml', '.ico':'image/x-icon' };

// 初始化数据文件（首次用前端默认数据）
if (!fs.existsSync(DATA_FILE)) {
  const seed = { videos: [], plan: { name: '训练计划', groups: [] }, logs: [] };
  fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
}

function send(res, code, body, type='application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // ---- 数据 API ----
  if (url.pathname === '/api/data') {
    if (req.method === 'GET') {
      return send(res, 200, fs.readFileSync(DATA_FILE, 'utf8'), 'application/json; charset=utf-8');
    }
    if (req.method === 'POST') {
      let raw = '';
      req.on('data', c => raw += c);
      req.on('end', () => {
        try {
          const obj = JSON.parse(raw);
          fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2));
          return send(res, 200, { ok: true });
        } catch (e) {
          return send(res, 400, { ok: false, error: 'invalid json' });
        }
      });
      return;
    }
  }

  // ---- 静态文件 ----
  let filePath = path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!filePath.startsWith(ROOT)) return send(res, 403, { error: 'forbidden' });
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, { error: 'not found' });
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, MIME[ext] || 'application/octet-stream');
  });
});

server.listen(PORT, () => console.log(`健身教练工作台已启动: http://localhost:${PORT}`));

/*
 * 前端对接示例（替换 index.html 的 save()/load()）：
 *
 * async function load(){
 *   try{ const r=await fetch('/api/data'); const d=await r.json();
 *        if(d&&d.videos) return d; }catch(e){}
 *   return JSON.parse(JSON.stringify(DEFAULT_DATA));
 * }
 * async function save(){ await fetch('/api/data',{method:'POST',
 *   headers:{'Content-Type':'application/json'},body:JSON.stringify(DATA)}); }
 * 并去掉 localStorage 相关调用即可。
 */
