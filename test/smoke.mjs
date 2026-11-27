/**
 * 客户端冒烟测试：用桩 React / document / fetch 把 lib/client.js 跑起来，
 * 依次渲染「设置 → 数据看板」面板与主页面左上角胶囊，确认不抛错、结构齐全。
 *
 * 不依赖真实宿主：任何渲染期异常（hooks 顺序、未定义变量、样式拼串）都会在这里炸出来。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const src = fs.readFileSync(path.join(root, 'lib', 'client.js'), 'utf8');

const SAMPLE = {
  generatedAt: '2026-11-27T02:00:00.000Z',
  partial: false,
  stores: [
    { id: 'acc_taobao_mw05dt23d7jw', name: '韩品兰坊', platform: 'taobao' },
    { id: 'acc_pdd_jsilbt', name: '吸音隔热教授', platform: 'pdd' },
  ],
  range: { start: '2026-11-20', end: '2026-11-26', days: 7, label: '2026-11-20 — 2026-11-26' },
  groups: [
    {
      id: 'overview',
      label: '经营总览',
      cards: [
        {
          id: 'gmv', label: '成交金额', group: 'overview', type: 'money', tone: 'primary', bad: false,
          trend: true, value: 1557.72, prev: 1200, valueText: '¥1557.72', deltaText: '较上期 +29.8%',
          deltaState: 'good', up: true, partial: false, hint: '区间相加',
          series: [{ key: '2026-11-20', label: '11-20', value: 200 }, { key: '2026-11-21', label: '11-21', value: 320 }],
        },
        {
          id: 'salesRevenue', label: '销售收入', group: 'overview', type: 'money', tone: 'primary', bad: false,
          trend: true, value: 1040.67, prev: null, valueText: '¥1040.67', deltaText: '首期缺失',
          deltaState: 'nodata', up: null, partial: false, hint: '成交金额 − 退款金额 − 推广花费',
          series: [{ key: '2026-11-20', label: '11-20', value: 140 }],
        },
      ],
    },
  ],
  coverage: { days: 7, withData: 5, missing: 2 },
  notes: ['拼多多近 7 天没有采集数据'],
};

function makeReact() {
  const React = {
    createElement(tag, props, ...children) {
      return { tag, props: props || {}, children: children.filter((c) => c !== null && c !== undefined && c !== false) };
    },
    useState(init) { return [init, function () {}]; },
    useEffect(fn) { fn(); },
  };
  return React;
}

const nodes = [];
const registry = [];
const documentStub = {
  head: { appendChild(node) { nodes.push(node); } },
  getElementById() { return null; },
  createElement(tag) { return { tag, set textContent(v) { this._t = v; }, get textContent() { return this._t; } }; },
  body: { dataset: {} },
};

let loaded = null;
const windowStub = {
  __ModuleLoader__: {
    load({ id, factory }) {
      loaded = { id, mod: factory((name) => {
        if (name === 'react') return makeReact();
        throw new Error('unexpected require: ' + name);
      }) };
    },
  },
};

const fetchStub = async (url) => {
  if (String(url).indexOf('/shop-dashboard/') < 0) throw new Error('unexpected url ' + url);
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => SAMPLE,
    text: async () => JSON.stringify(SAMPLE),
  };
};

const sandbox = {
  window: windowStub,
  document: documentStub,
  fetch: fetchStub,
  console,
  setTimeout,
  clearTimeout,
  Date,
  Math,
  JSON,
  Number,
  String,
  Object,
  Array,
  Error,
  Promise,
  Blob: function Blob() {},
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} },
};
sandbox.globalThis = sandbox;
sandbox.self = windowStub;
windowStub.document = documentStub;
windowStub.fetch = fetchStub;

vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'lib/client.js' });

if (!loaded) throw new Error('client.js 没有通过 __ModuleLoader__.load 注册模块');
const mod = loaded.mod;

const ctx = {
  slots: {
    inject(name, fn) {
      const reg = fn();
      if (reg && reg.component) registry.push({ name, component: reg.component });
    },
    register(spec, component) { return { spec, component }; },
  },
};

mod.apply(ctx);
if (nodes.length === 0) throw new Error('injectCss 没有插入样式');
const css = nodes[0].textContent || '';
if (css.indexOf('.sa-toolbar') < 0) throw new Error('样式缺少 .sa-toolbar');

const names = registry.map((r) => r.name).sort();
const want = ['conversation.header.leading', 'settings.section'];
for (const n of want) {
  if (!names.includes(n)) throw new Error('没有注册槽位 ' + n + '（已注册：' + names.join(',') + '）');
}

function flatten(node, out) {
  if (!node) return out;
  if (Array.isArray(node)) { node.forEach((n) => flatten(n, out)); return out; }
  if (typeof node !== 'object') { out.push(String(node)); return out; }
  if (typeof node.tag === 'function') {
    // 组件元素：用桩 React 的 createElement 直接渲染它，把内部结构摊平。
    flatten(node.tag(node.props || {}), out);
    return out;
  }
  out.push('<' + node.tag + '>');
  if (node.props && node.props.className) out.push('.' + node.props.className);
  (node.children || []).forEach((c) => flatten(c, out));
  return out;
}

let rendered = 0;
for (const r of registry) {
  const tree = r.component();
  const flat = flatten(tree, []).join(' ');
  if (!flat) throw new Error('槽位 ' + r.name + ' 渲染为空');
  if (r.name === 'settings.section' && flat.indexOf('.sa-dash') < 0) throw new Error('设置页面板没有渲染');
  if (r.name === 'conversation.header.leading' && flat.indexOf('.sa-pill') < 0) throw new Error('胶囊没有渲染');
  rendered += 1;
}

console.log('smoke=ok slots=' + names.join(',') + ' rendered=' + rendered + ' cssBytes=' + css.length);
