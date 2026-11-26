/**
 * 看板路由：`GET /shop-dashboard/dashboard`。
 * 只认本插件界面发来的请求；查询参数：
 *   store=all|<账号 id>
 *   range=month|lastmonth             （本月 / 上月）
 *   days=7|14|30|60|90                （近 N 天，默认 7）
 *   from/to=YYYY-MM-DD                （自定义区间，优先于 days/range）
 *   group=overview|traffic|product|promotion|all（默认 overview）
 *   grain=day|week|month              （走势粒度，默认 day）
 *   mode=combined|by-platform         （合并口径 / 按平台分开）
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
      range: String(q.get('range') || ''),
      days: Number(q.get('days')) || 7,
      from: String(q.get('from') || ''),
      to: String(q.get('to') || ''),
      group: String(q.get('group') || 'overview').trim() || 'overview',
      grain: String(q.get('grain') || 'day').trim() || 'day',
      mode: String(q.get('mode') || 'combined').trim() || 'combined',
    });
    return sendJson(res, 200, {
      ...payload,
      source: { dataDir: dataDir(), collectionRoot: collectionRoot() },
    });
  }

  return sendJson(res, 404, { ok: false, error: 'not found' });
}
