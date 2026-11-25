/**
 * 看板路由：`GET /shop-dashboard/dashboard`（别名 `/`）。
 *
 * 只认本插件界面发来的请求（自定义请求头）；查询参数与店铺账号插件的看板一致：
 *   store=all|<账号 id>、days=7|30、from/to=YYYY-MM-DD（可选）。
 */
import { buildDashboard } from '../dashboard.mjs';
import { collectionRoot, dataDir, readAccounts } from '../store.mjs';
import { BASE } from '../plugin-consts.mjs';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

export async function handleRequest(req, res, opts = {}) {
  const reqHeader = opts.reqHeader || 'x-dsh-shop-dashboard';
  const headers = req.headers || {};
  if (String(headers[reqHeader] || '') !== '1') {
    return sendJson(res, 403, { ok: false, error: 'forbidden' });
  }

  const url = new URL(req.url || '/', 'http://127.0.0.1');
  let p = url.pathname;
  if (p.startsWith(BASE)) p = p.slice(BASE.length);
  p = p.replace(/\/+$/, '') || '/';

  if (p === '/dashboard' || p === '/') {
    const q = url.searchParams;
    const accounts = readAccounts();
    const payload = buildDashboard({
      accounts,
      store: String(q.get('store') || 'all').trim() || 'all',
      days: Number(q.get('days')) || 7,
      from: String(q.get('from') || ''),
      to: String(q.get('to') || ''),
    });
    return sendJson(res, 200, {
      ...payload,
      source: { dataDir: dataDir(), collectionRoot: collectionRoot() },
    });
  }

  return sendJson(res, 404, { ok: false, error: 'not found' });
}
