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

// B 组：看板聚合（用真实数据目录；没有就是空看板但也必须是 8 张卡）
const { buildDashboard } = await import(pathToFileURL(path.join(root, 'lib/dashboard.mjs')).href);
const { readAccounts, dataDir } = await import(pathToFileURL(path.join(root, 'lib/store.mjs')).href);

const accounts = readAccounts();
const dash = buildDashboard({ accounts, store: 'all', days: 30 });
check('B1 返回 ok', () => assert.equal(dash.ok, true));
check('B2 恰好 8 张卡', () => assert.equal(dash.cards.length, 8));
check('B3 卡片 key 固定', () => {
  const keys = dash.cards.map((c) => c.key);
  assert.deepEqual(keys, ['gmv', 'refund', 'adCost', 'income', 'aov', 'visitors', 'buyers', 'convRate']);
});
check('B4 范围 30 天', () => assert.equal(dash.range.days, 30));
check('B5 有店铺就用店铺列表', () => {
  if (!accounts.length) return;
  assert.ok(dash.stores.length >= 1);
});
check('B6 缺数据的卡片给占位而不是 0', () => {
  for (const c of dash.cards) {
    if (c.complete) assert.ok(c.valueText && c.valueText !== 'undefined');
    else assert.equal(c.valueText, '');
  }
});
check('B7 数据目录可解析', () => assert.ok(typeof dataDir() === 'string' && dataDir().length > 3));

// C 组：真实数据（本机装过店铺账号管理且采过数据时才有意义）
const realCards = dash.cards.filter((c) => c.complete);
if (realCards.length >= 4) {
  check('C1 真实数据至少 4 个指标出数', () => assert.ok(realCards.length >= 4));
  check('C2 成交金额是金额文案', () => {
    const gmv = dash.cards.find((c) => c.key === 'gmv');
    if (gmv.complete) assert.ok(/^¥/.test(gmv.valueText), gmv.valueText);
  });
  check('C3 转化率是百分数', () => {
    const conv = dash.cards.find((c) => c.key === 'convRate');
    if (conv.complete) assert.ok(/%$/.test(conv.valueText), conv.valueText);
  });
} else {
  console.log('（本机没有可用采集数据，C 组跳过）');
}

console.log(`\ndsh-plugin-shop-dashboard: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
