/**
 * dsh-plugin-shop-dashboard —— 「店铺数据看板」独立插件。
 *
 * 一句话：不重新采集，把「店铺账号管理」插件已经采到的成品工作簿（`采集数据_*.xlsx`）
 * 聚合成一张经营看板（成交金额 / 退款金额 / 推广花费 / 销售收入 / 客单价 / 访客数 /
 * 支付买家数 / 成交转化率），带每期对比与每天走势。
 *
 * 本插件是**只读**的：只解析数据目录里的 `accounts.json` 与 `collection/`，不写任何文件。
 */
import { BASE, REQ_HEADER } from './plugin-consts.mjs';
import { handleRequest } from './server/routes.mjs';

export const name = 'dsh-plugin-shop-dashboard';

export const inject = ['webServer'];

export function apply(ctx) {
  const webServer = ctx.webServer;
  if (!webServer || typeof webServer.register !== 'function') {
    return () => {};
  }
  const disposeRoute = webServer.register({
    kind: 'prefix',
    path: BASE,
    handler: (req, res) => {
      handleRequest(req, res, { reqHeader: REQ_HEADER }).catch((err) => {
        try {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: String((err && err.message) || err) }));
        } catch {
          /* 已经回过了 */
        }
      });
    },
  });
  const log = ctx && typeof ctx.logger === 'object' && ctx.logger ? ctx.logger : null;
  if (log && typeof log.info === 'function') log.info(`已挂载 ${BASE}`);
  return () => {
    if (typeof disposeRoute === 'function') disposeRoute();
  };
}
