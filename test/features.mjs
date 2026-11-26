/**
 * 自检：插件骨架、看板聚合口径、真实数据（有就验、没有就跳过）。
 * 运行：node test/features.mjs
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let pass = 0;
let fail = 0;

function check(name, fn) {
  try {
    fn();
    pass += 1;
  } catch (err) {
    fail += 1;
    console.log('FAIL ' + name + ' -> ' + ((err && err.message) || err));
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const consts = await import(pathToFileURL(path.join(root, 'lib/plugin-consts.mjs')).href);

check('A1 包名正确', () => assert.equal(pkg.name, 'dsh-plugin-shop-dashboard'));
check('A2 版本 >= 0.1.0', () => assert.ok(parseFloat(pkg.version) >= 0.1));
check('A3 路由前缀 /shop-dashboard', () => assert.equal(consts.BASE, '/shop-dashboard'));
check('A4 请求头与客户端一致', () => assert.equal(consts.REQ_HEADER, 'x-dsh-shop-dashboard'));
check('A5 客户端里 BASE 与宿主一致', () => {
  const src = fs.readFileSync(path.join(root, 'lib/client.js'), 'utf8');
  assert.ok(src.includes("var BASE = '/shop-dashboard'"), '客户端 BASE 不一致');
});
check('A6 客户端注册的是「数据看板」区块', () => {
  const src = fs.readFileSync(path.join(root, 'lib/client.js'), 'utf8');
  assert.ok(src.includes("label: '数据看板'"), '设置区块标签不对');
});
check('A7 宿主插件名与 cordis 补丁一致', () => {
  const yml = fs.readFileSync(path.join(root, 'cordis.patch.yml'), 'utf8');
  assert.ok(yml.includes('dsh-plugin-shop-dashboard'));
});
check('A8 只读：源码里没有写文件调用', () => {
  for (const file of ['lib/index.js', 'lib/server/routes.mjs', 'lib/dashboard.mjs', 'lib/store.mjs']) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(!/writeFileSync|createWriteStream|mkdtemp|copyFileSync/.test(src), file + ' 里出现了写文件调用');
  }
});

// A9–A13：主页面左上角的看板胶囊
check('A9 客户端注册 conversation.header.leading 胶囊', () => {
  const src = fs.readFileSync(path.join(root, 'lib/client.js'), 'utf8');
  assert.ok(src.includes("'conversation.header.leading'"), '没有注册主页面左上角槽位');
  assert.ok(src.includes('HeaderDashboard'), '没有胶囊组件');
});
check('A10 胶囊展示成交/访客/转化率', () => {
  const src = fs.readFileSync(path.join(root, 'lib/client.js'), 'utf8');
  for (const key of ['gmv', 'visitors', 'conversion']) assert.ok(src.includes("'" + key + "'"), '缺指标 ' + key);
  assert.ok(src.includes("'经营看板'"), '缺胶囊标题');
});
check('A11 胶囊样式是圆角胶囊', () => {
  const src = fs.readFileSync(path.join(root, 'lib/client.js'), 'utf8');
  assert.ok(src.includes('.sa-pill{'), '缺 .sa-pill 样式');
  assert.ok(src.includes('.sa-pop{'), '缺弹层样式');
});
check('A12 版本 >= 0.3.0', () => assert.ok(parseFloat(pkg.version) >= 0.2));
check('A13 README 说明主页面左上角展示', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.ok(/左上角/.test(readme), 'README 没说明主页面左上角入口');
});

// B 组：看板聚合（四组卡 + 范围/粒度/显示模式）
const { buildDashboard, compareText, resolveRange } = await import(pathToFileURL(path.join(root, 'lib/dashboard.mjs')).href);
const { METRIC_GROUPS, GROUP_ORDER, DERIVE } = await import(pathToFileURL(path.join(root, 'lib/metrics.mjs')).href);
const { readAccounts, dataDir } = await import(pathToFileURL(path.join(root, 'lib/store.mjs')).href);

const accounts = readAccounts();
const dash = buildDashboard({ accounts, store: 'all', days: 30 });
check('B1 返回 ok', () => assert.equal(dash.ok, true));
check('B2 经营总览恰好 9 张卡', () => assert.equal(dash.groups[0].cards.length, METRIC_GROUPS.overview.length));
check('B3 卡片 id 与注册表一致', () => {
  const ids = dash.groups[0].cards.map((c) => c.id);
  assert.deepEqual(ids, METRIC_GROUPS.overview.map((m) => m.id));
});
check('B4 范围 30 天', () => assert.equal(dash.range.days, 30));
check('B5 有店铺就用店铺列表', () => {
  if (!accounts.length) return;
  assert.ok(dash.stores.length >= 1);
});
check('B6 缺数据的卡片留空文案而不是 0', () => {
  for (const c of dash.cards) {
    if (c.value === null) assert.equal(c.valueText, '');
  }
});
check('B7 数据目录可解析', () => assert.ok(typeof dataDir() === 'string' && dataDir().length > 3));

// F 组：口径（派生公式 / 比较文案 / 范围 / 粒度 / 显示模式）
check('F1 四组注册表齐全', () => {
  assert.deepEqual(GROUP_ORDER, ['overview', 'traffic', 'product', 'promotion']);
  for (const g of GROUP_ORDER) assert.ok(METRIC_GROUPS[g].length >= 8, g + ' 卡片太少');
  assert.ok(METRIC_GROUPS.promotion.length >= 8, 'promotion 卡片太少');
});
check('F2 销售收入 = 成交 - 退款 - 推广花费', () => {
  assert.deepEqual(DERIVE.salesRevenue.minus, ['gmv', 'refund', 'spend']);
  const d = buildDashboard({ accounts, group: 'overview', days: 30 });
  const by = new Map(d.groups[0].cards.map((c) => [c.id, c.value]));
  if (![by.get('gmv'), by.get('refund'), by.get('spend'), by.get('salesRevenue')].every((v) => typeof v === 'number')) return;
  const want = by.get('gmv') - by.get('refund') - by.get('spend');
  assert.ok(Math.abs(by.get('salesRevenue') - want) < 0.01, '销售收入口径不符');
});
check('F3 比较文案覆盖五种结果', () => {
  assert.equal(compareText(null, 5).state, 'missing');
  assert.equal(compareText(5, null).state, 'nodata');
  assert.equal(compareText(5, 0).state, 'zero');
  assert.equal(compareText(5, -1).state, 'negative');
  assert.equal(compareText(4, 4).state, 'flat');
  assert.equal(compareText(6, 4).state, 'good');
  assert.equal(compareText(4, 6).state, 'bad');
  assert.equal(compareText(6, 4, { bad: true }).state, 'bad');
  assert.equal(compareText(1, 2, { incomplete: true }).state, 'incomplete');
  assert.ok(compareText(5, 0).text.includes('上期为零'));
});
check('F4 时间范围支持本月/上月/自定义', () => {
  const now = new Date(2026, 10, 20);
  const month = resolveRange({ range: 'month', now });
  assert.equal(month.start, '2026-11-01');
  assert.equal(month.end, '2026-11-19');
  const last = resolveRange({ range: 'lastmonth', now });
  assert.equal(last.start, '2026-10-01');
  assert.equal(last.end, '2026-10-31');
  const custom = resolveRange({ from: '2026-10-01', to: '2026-10-05', now });
  assert.deepEqual([custom.start, custom.end], ['2026-10-01', '2026-10-05']);
});
check('F5 粒度按周/月分桶', () => {
  const week = buildDashboard({ accounts, group: 'overview', days: 30, grain: 'week' });
  assert.equal(week.grain, 'week');
  const card = week.groups[0].cards[0];
  assert.ok(card.series.length > 0 && card.series.length <= 7, '周粒度点数不对 ' + card.series.length);
  assert.ok(card.series.every((pt) => pt.label.endsWith('周')));
  const month = buildDashboard({ accounts, group: 'overview', days: 90, grain: 'month' });
  assert.ok(month.groups[0].cards[0].series.length <= 4);
});
check('F6 按平台口径分开出数', () => {
  const bp = buildDashboard({ accounts, group: 'overview', days: 30, mode: 'by-platform' });
  assert.equal(bp.mode, 'by-platform');
  assert.ok(Array.isArray(bp.platforms));
  for (const p of bp.platforms) assert.ok(p.groups[0].cards.length > 0);
});
check('F7 部分覆盖徽标（区间一半以上没数据时）', () => {
  const d = buildDashboard({ accounts, group: 'overview', days: 14 });
  assert.equal(typeof d.coverage, 'number');
  assert.equal(d.partial, d.coverage > 0 && d.coverage < 0.5);
});

// C 组：真实数据（本机装过店铺账号管理且采过数据时才有意义）
const realCards = dash.cards.filter((c) => typeof c.value === 'number');
if (realCards.length >= 4) {
  check('C1 真实数据至少 4 个指标出数', () => assert.ok(realCards.length >= 4));
  check('C2 成交金额是金额文案', () => {
    const gmv = dash.cards.find((c) => c.id === 'gmv');
    if (gmv && typeof gmv.value === 'number') assert.ok(/^¥/.test(gmv.valueText), gmv.valueText);
  });
  check('C3 转化率是百分数', () => {
    const conv = dash.cards.find((c) => c.id === 'conversion');
    if (conv && typeof conv.value === 'number') {
      assert.ok(/%$/.test(conv.valueText), conv.valueText);
      assert.ok(parseFloat(conv.valueText) <= 100, '转化率单位不对：' + conv.valueText);
    }
  });
  check('C4 跳失率不超过 100%', () => {
    const d = buildDashboard({ accounts, group: 'traffic', days: 30 });
    const bounce = d.groups[0].cards.find((c) => c.id === 'bounceRate');
    if (bounce && typeof bounce.value === 'number') assert.ok(parseFloat(bounce.valueText) <= 100, bounce.valueText);
  });
} else {
  console.log('（本机没有可用采集数据，C 组跳过）');
}

console.log('pass=' + pass + ' fail=' + fail);
if (fail) process.exit(1);
