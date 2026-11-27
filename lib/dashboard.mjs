// 数据看板：把「已经采集到的工作簿」聚合成看板卡片。
//
// 设计原则（对齐 Accio 看板的口径做法）：
// 1. 不重新采集 —— 只看本地已有产物（每个店铺最近若干作业的成品工作簿）。
// 2. 指标定义集中在 lib/metrics.mjs（四组卡 + 派生公式 + bad 方向），这里只做取数与聚合。
// 3. 比率一律按分子/分母重算，不平均各店比率；存量类（动销商品数/商品数）取末值。
// 4. 算不出来就给占位文案（数据不完整/上期为零/上期为负数/与上期持平），不显示 0。
// 5. 销售收入 = 成交金额 − 退款金额 − 推广花费（与上游 salesRevenue 一致）。

import fs from 'node:fs';
import path from 'node:path';
import { readTableFile } from './sheet-read.mjs';
import { collectionDirOf } from './collection-dir.mjs';
import { fmtDay, parseDay } from './datastore.mjs';
import { METRIC_GROUPS, GROUP_LABELS, GROUP_ORDER, DERIVE } from './metrics.mjs';

const JOB_PREFIX = 'job_';

// 维度列：这些列的值不是「全部/不限/整体」时，那一行是明细行，不能进店铺级汇总。
const DIM_COLUMNS = ['载体类型', '投放时段', '终端类型', '售卖类型', '自营/合作', '账号/渠道', '抖音号', '流量来源'];
const DIM_TOTAL = {
  载体类型: ['全部', '不限'],
  投放时段: ['不限', '全部'],
  终端类型: ['整体', '全部'],
  售卖类型: ['全部', '整体'],
  '自营/合作': ['自营', '全部', '整体'],
};

// 商品/场景维度：出现即说明是明细表。商品明细表在「商品供给」组里可以用（按 日期+商品 去重），
// 其余组（店铺级）遇到这类表整张弃用，避免把同一份数据重复多算。
const DETAIL_COLUMNS = ['商品ID', '商品名称', '场景ID', '场景名字', '人群名称', '来源名称', '来源层级'];
const PRODUCT_KEY_COLUMNS = ['商品ID', '商品id', '商品 ID'];
// 商品明细分表里能派生出「商品供给」存量类指标的源列（商品数/动销/零成交等）
const PRODUCT_SRC_IDS = ['pageViews', 'visitors', 'buyers', 'units', 'gmv'];
const STOCK_DERIVED_IDS = ['productCount', 'activeProducts', 'activeRate', 'visitedProducts', 'zeroSalesCount', 'lowConversionCount'];

const DATE_ALIASES = ['日期', '统计日期', '日期(天)', '日期（天）', '日期(日)', '统计日期(天)'];

function headerIndex(header, column) {
  const want = String(column).trim();
  for (let i = 0; i < header.length; i += 1) if (String(header[i] === null || header[i] === undefined ? '' : header[i]).trim() === want) return i;
  return -1;
}

function dateColumnOf(header) {
  for (const alias of DATE_ALIASES) {
    const i = headerIndex(header, alias);
    if (i >= 0) return i;
  }
  return -1;
}

function toNumber(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let s = String(raw).trim();
  if (!s || s === '-' || s === '--' || s === 'NULL' || s === 'null') return null;
  s = s.replace(/,/g, '').replace(/¥/g, '').replace(/元/g, '').replace(/%$/, '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// 日期列常见三种写法：2026-11-24 / 20261124 / 2026/11/24。
export function normalizeBizDate(raw) {
  const s = String(raw === null || raw === undefined ? '' : raw).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!m) m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return '';
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return '';
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// 商品明细表里能认出的源列（浏览量/访客/买家/销量/成交金额）
function prodSrcIndex(header, registry) {
  const idx = new Map();
  const picked = [];
  for (const id of PRODUCT_SRC_IDS) {
    const m = registry.find((x) => x.id === id);
    if (m) picked.push(m);
  }
  const found = metricIndexFor(header, picked);
  for (const [id, at] of found.entries()) idx.set(id, at);
  return idx;
}

// 商品供给的存量类指标（商品数/动销商品数/动销率/被访问商品数/零成交商品数/低转化商品数）
// 上游这些卡是 last + trend:false，我们按天从商品明细表重算：当天有明细行才填，不臆造。
function fillStockMetrics(days, productAgg) {
  for (const [date, byProduct] of productAgg.entries()) {
    const cell = days.get(date);
    if (!cell) continue;
    let productCount = 0, visited = 0, active = 0, zeroSales = 0, lowConv = 0;
    for (const row of byProduct.values()) {
      productCount += 1;
      const vis = row.visitors || 0;
      const sold = (row.units || 0) > 0 || (row.gmv || 0) > 0;
      if (vis > 0) {
        visited += 1;
        if (!sold) { zeroSales += 1; lowConv += 1; }
        else if ((row.buyers || 0) > 0 && (row.buyers || 0) / vis < 0.01) lowConv += 1;
      }
      if (sold) active += 1;
    }
    if (!byProduct.size) continue;
    const put = (id, value) => { if (cell[id] === undefined && value !== null) cell[id] = value; };
    put('productCount', productCount);
    put('activeProducts', active);
    put('visitedProducts', visited);
    put('zeroSalesCount', zeroSales);
    put('lowConversionCount', lowConv);
    // 动销率按 fraction 存（整数百分比由 normalizePctScales 统一 ×100）
    put('activeRate', productCount > 0 ? active / productCount : null);
  }
}

function metricsForGroup(group) {
  return (METRIC_GROUPS[group] || []).slice();
}

// 一张表里能认出哪些指标（每个指标取第一个命中的别名列）
function metricIndexFor(header, metrics) {
  const idx = new Map();
  for (const metric of metrics) {
    for (const alias of metric.aliases || []) {
      const i = headerIndex(header, alias);
      if (i >= 0) { idx.set(metric.id, i); break; }
    }
  }
  return idx;
}

function dimColumnsOf(header) {
  return DIM_COLUMNS.filter((c) => headerIndex(header, c) >= 0);
}

function rowIsStoreLevel(row, header, dims) {
  for (const col of dims) {
    const at = headerIndex(header, col);
    const value = String(row[at] === null || row[at] === undefined ? '' : row[at]).trim();
    const allowed = DIM_TOTAL[col];
    if (!allowed) continue; // 没有约定「全部值」的维度列不参与判定
    if (!allowed.includes(value)) return false;
  }
  return true;
}

function productKeyOf(row, header) {
  for (const col of PRODUCT_KEY_COLUMNS) {
    const at = headerIndex(header, col);
    if (at >= 0) {
      const v = String(row[at] === null || row[at] === undefined ? '' : row[at]).trim();
      if (v) return v;
    }
  }
  return '';
}

function readWorkbook(pathname) {
  try {
    return readTableFile(pathname);
  } catch {
    return null;
  }
}

function candidateWorkbooks(account) {
  let dir = '';
  try {
    dir = path.join(collectionDirOf(account), 'jobs');
  } catch {
    return [];
  }
  if (!fs.existsSync(dir)) return [];
  const names = fs.readdirSync(dir).filter((n) => n.startsWith(JOB_PREFIX)).sort().reverse();
  const books = [];
  for (const name of names.slice(0, 6)) {
    const artDir = path.join(dir, name, 'artifacts');
    if (!fs.existsSync(artDir)) continue;
    for (const file of fs.readdirSync(artDir)) {
      if (!file.endsWith('.xlsx') || file.startsWith('~')) continue;
      if (!file.startsWith('采集数据')) continue;
      books.push({ jobId: name, filePath: path.join(artDir, file) });
    }
  }
  return books;
}

/**
 * 读出这家店铺的「按天指标」。
 * 返回 { days: Map<'YYYY-MM-DD', {指标id: 值}>, sources: string[], notes: string[] }
 */
export function storeSeries(account) {
  const days = new Map();
  const notes = [];
  const sources = new Map(); // metricId -> sheet 名
  const productAgg = new Map(); // 日期 -> Map<商品ID, {visitors,buyers,units,gmv,pageViews}>
  const books = candidateWorkbooks(account);
  if (!books.length) notes.push('还没有成品工作簿');

  // 所有组一起匹配，一张表能同时贡献多组的指标
  const metrics = [];
  for (const g of GROUP_ORDER) metrics.push(...metricsForGroup(g));
  // 同名 id 在多组里重复（visitors/gmv/spend…），按 id 去重，别名取并集
  const merged = new Map();
  for (const m of metrics) {
    const prev = merged.get(m.id);
    if (!prev) { merged.set(m.id, { ...m, aliases: (m.aliases || []).slice() }); continue; }
    for (const a of m.aliases || []) if (!prev.aliases.includes(a)) prev.aliases.push(a);
    if (m.bad) prev.bad = true;
  }
  const registry = Array.from(merged.values());

  for (const book of books) {
    const table = readWorkbook(book.filePath);
    if (!table || !table.sheets) continue;
    for (const sheet of table.sheets) {
      if (sheet.name === '采集情况') continue;
      const rows = sheet.rows || [];
      if (rows.length < 2) continue;
      const header = rows[0] || [];
      const dateCol = dateColumnOf(header);
      if (dateCol < 0) continue;
      const idx = metricIndexFor(header, registry);
      if (!idx.size) continue;
      const dims = dimColumnsOf(header);
      const detail = DETAIL_COLUMNS.some((c) => headerIndex(header, c) >= 0);
      const seen = new Set(); // 商品明细表的 (日期+商品) 去重
      const srcIdx = prodSrcIndex(header, registry);
      for (let r = 1; r < rows.length; r += 1) {
        const row = rows[r] || [];
        if (!rowIsStoreLevel(row, header, dims)) continue;
        const date = normalizeBizDate(row[dateCol]);
        if (!date) continue;
        if (detail) {
          const key = productKeyOf(row, header);
          if (key && srcIdx.size) {
            let byProduct = productAgg.get(date);
            if (!byProduct) { byProduct = new Map(); productAgg.set(date, byProduct); }
            const acc = byProduct.get(key) || { pageViews: 0, visitors: 0, buyers: 0, units: 0, gmv: 0 };
            for (const [id, at] of srcIdx.entries()) {
              const n = toNumber(row[at]);
              if (n !== null) acc[id] += n;
            }
            byProduct.set(key, acc);
          }
          if (key) {
            const sig = date + '|' + key;
            if (seen.has(sig)) continue;
            seen.add(sig);
          }
        }
        let cell = days.get(date);
        if (!cell) { cell = {}; days.set(date, cell); }
        for (const [id, col] of idx.entries()) {
          if (cell[id] !== undefined) continue; // 先到先得：靠前的工作簿/表优先
          const n = toNumber(row[col]);
          if (n === null) continue;
          cell[id] = n;
          if (!sources.has(id)) sources.set(id, sheet.name);
        }
      }
    }
    if (days.size) break; // 一本工作簿覆盖五域，后面的更旧
  }
  if (sources.size) notes.push('数据来源：' + Array.from(new Set(Array.from(sources.values()))).join('、'));
  fillStockMetrics(days, productAgg);
  normalizePctScales(days, registry);
  return { days, notes, sources: Array.from(sources.keys()) };
}

function dayList(from, to) {
  const out = [];
  const end = parseDay(to);
  for (let ms = parseDay(from); ms <= end; ms += 86400000) out.push(fmtDay(ms));
  return out;
}

function shiftRange(from, to) {
  const startMs = parseDay(from);
  const endMs = parseDay(to);
  const span = Math.round((endMs - startMs) / 86400000) + 1;
  const prevEndMs = startMs - 86400000;
  const prevStartMs = prevEndMs - (span - 1) * 86400000;
  return { start: fmtDay(prevStartMs), end: fmtDay(prevEndMs) };
}

// 粒度分桶：按自然周（周一为首日）/ 自然月
function bucketKey(date, grain) {
  if (grain === 'month') return date.slice(0, 7);
  if (grain === 'week') {
    const ms = parseDay(date);
    const d = new Date(ms);
    const dow = (d.getDay() + 6) % 7; // 0=周一
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
    return fmtDay(monday.getTime());
  }
  return date;
}

function bucketLabel(key, grain) {
  if (grain === 'month') return key.slice(5) + ' 月';
  if (grain === 'week') return key.slice(5) + ' 周';
  return key.slice(5);
}

// 区间解析：支持 days / 本月 / 上月 / 自定义 from-to
export function resolveRange(opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const to = String(opts.to || '');
  const from = String(opts.from || '');
  const kind = String(opts.range || '');
  let start = '';
  let end = '';
  if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    start = from; end = to;
  } else if (kind === 'month') {
    start = fmtDay(new Date(now.getFullYear(), now.getMonth(), 1).getTime());
    end = fmtDay(yesterday.getTime());
  } else if (kind === 'lastmonth') {
    start = fmtDay(new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime());
    end = fmtDay(new Date(now.getFullYear(), now.getMonth(), 0).getTime());
  } else {
    const days = Number(opts.days) > 0 ? Math.max(1, Math.min(366, Math.floor(Number(opts.days)))) : 7;
    end = fmtDay(yesterday.getTime());
    start = fmtDay(parseDay(end) - (days - 1) * 86400000);
  }
  return { start, end };
}

function valueOf(days, date, id) {
  const cell = days.get(date);
  if (!cell) return null;
  const v = cell[id];
  return v === undefined || v === null || !Number.isFinite(Number(v)) ? null : Number(v);
}

function sumOver(daysList, dates, id) {
  let total = 0;
  let has = false;
  for (const days of daysList) {
    for (const date of dates) {
      const v = valueOf(days, date, id);
      if (v === null) continue;
      total += v;
      has = true;
    }
  }
  return has ? total : null;
}

function lastOver(daysList, dates, id) {
  let out = null;
  for (const days of daysList) {
    for (const date of dates) {
      const v = valueOf(days, date, id);
      if (v === null) continue;
      out = v; // 日期是顺序的，后面的覆盖前面的
    }
  }
  return out;
}

function weightedOver(daysList, dates, id, weightId) {
  let num = 0;
  let den = 0;
  let has = false;
  for (const days of daysList) {
    for (const date of dates) {
      const v = valueOf(days, date, id);
      const w = valueOf(days, date, weightId);
      if (v === null) continue;
      if (w === null || w <= 0) continue;
      num += v * w;
      den += w;
      has = true;
    }
  }
  return has && den ? num / den : null;
}

function averageOver(daysList, dates, id) {
  let total = 0;
  let count = 0;
  for (const days of daysList) {
    for (const date of dates) {
      const v = valueOf(days, date, id);
      if (v === null) continue;
      total += v;
      count += 1;
    }
  }
  return count ? total / count : null;
}

function deriveOver(daysList, dates, metric) {
  const spec = DERIVE[metric.derive] || {};
  if (spec.minus) {
    const base = sumOver(daysList, dates, spec.minus[0]);
    if (base === null) return null;
    let value = base;
    let complete = true;
    for (let i = 1; i < spec.minus.length; i += 1) {
      const part = sumOver(daysList, dates, spec.minus[i]);
      if (part === null) { complete = false; continue; }
      value -= part;
    }
    return complete ? value : value; // 缺项时仍给值，但由调用方标「部分覆盖」
  }
  const num = sumOver(daysList, dates, spec.num);
  const den = sumOver(daysList, dates, spec.den);
  if (num === null || den === null || !den) return null;
  return num / den;
}

function aggregate(daysList, dates, metric) {
  const agg = metric.aggregation || 'sum';
  if (agg === 'derive') return deriveOver(daysList, dates, metric);
  if (agg === 'last') return lastOver(daysList, dates, metric.id);
  if (agg === 'weightedAverage') return weightedOver(daysList, dates, metric.id, metric.weight || 'visitors');
  if (agg === 'average') return averageOver(daysList, dates, metric.id);
  return sumOver(daysList, dates, metric.id);
}

function seriesOf(stores, dates, metric, grain) {
  if (metric.trend === false) return [];
  const keys = [];
  for (const date of dates) {
    const k = bucketKey(date, grain);
    if (!keys.includes(k)) keys.push(k);
  }
  return keys.map((key) => {
    const sub = dates.filter((d) => bucketKey(d, grain) === key);
    const v = aggregate(stores.map((s) => s.days), sub, metric);
    return { key, label: bucketLabel(key, grain), value: v };
  });
}

/**
 * 百分比单位归一到「百分数值」（72.5 就是 72.5%）：
 * - 直接来自报表列的百分比，各平台写法不同（72.5 或 0.725）⇒ 采集端在 storeSeries 里按列做过归一；
 * - 我们自己算的比率（成交转化率 = 买家/访客）与 percentScale:'fraction' 的列（动销率）是小数 ⇒ 乘 100。
 */
function pctValue(value, metric) {
  if (metric.percentScale === 'fraction') return value * 100;
  if (metric.aggregation === 'derive') return value * 100;
  return value;
}

function fmtValue(value, metric) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  const type = metric.type || 'int';
  if (type === 'money') {
    if (Math.abs(value) >= 100000000) return '¥' + (value / 100000000).toFixed(2) + ' 亿';
    if (Math.abs(value) >= 10000) return '¥' + (value / 10000).toFixed(2) + ' 万';
    return '¥' + value.toFixed(2);
  }
  if (type === 'yuan') return '¥' + value.toFixed(2);
  if (type === 'pct') return pctValue(value, metric).toFixed(2) + '%';
  if (type === 'ratio') return value.toFixed(2);
  if (type === 'seconds') return Math.round(value) + ' 秒';
  return String(Math.round(value));
}

/**
 * 百分比列的「小数 vs 百分数」判定：整列最大值不超过 1.5 就当小数，整列 ×100。
 * 这是报表口径差异（生意参谋给 72.5，拼多多/抖店给 0.725）的兜底，真值 >150% 的列不会误判。
 */
function normalizePctScales(days, registry) {
  const pctIds = registry.filter((m) => m.type === 'pct' && m.aggregation !== 'derive' && m.percentScale !== 'fraction').map((m) => m.id);
  for (const id of pctIds) {
    let max = 0;
    let seen = false;
    for (const cell of days.values()) {
      const v = cell[id];
      if (v === undefined || v === null || !Number.isFinite(Number(v))) continue;
      seen = true;
      const abs = Math.abs(Number(v));
      if (abs > max) max = abs;
    }
    if (!seen || max > 1.5) continue;
    for (const cell of days.values()) {
      if (cell[id] === undefined) continue;
      cell[id] = Number(cell[id]) * 100;
    }
  }
}

/**
 * 比较文案（对齐上游三种无法比较 + 持平）：
 * - 上期为 0 → 上期为零，无法计算变化率
 * - 上期为负 → 上期为负数，无法比较
 * - 覆盖不足 → 数据不完整，无法比较
 * - 完全相等 → 与上期持平
 */
export function compareText(cur, prev, opts = {}) {
  if (cur === null || cur === undefined || !Number.isFinite(Number(cur))) return { text: '', state: 'missing' };
  if (prev === null || prev === undefined || !Number.isFinite(Number(prev))) return { text: '首期缺失', state: 'nodata' };
  if (opts.incomplete) return { text: '数据不完整，无法比较', state: 'incomplete' };
  if (prev === 0) return { text: '上期为零，无法计算变化率', state: 'zero' };
  if (prev < 0) return { text: '上期为负数，无法比较', state: 'negative' };
  const delta = (Number(cur) - Number(prev)) / Math.abs(Number(prev)) * 100;
  if (!delta) return { text: '与上期持平', state: 'flat' };
  const up = delta > 0;
  const good = opts.bad ? !up : up;
  return { text: '较上期 ' + (up ? '+' : '') + delta.toFixed(1) + '%', state: good ? 'good' : 'bad', up };
}

// 口径说明：卡片右上角的小问号用，按注册表生成「怎么算的」
let LABELS_BY_ID = null;
function labelsById() {
  if (LABELS_BY_ID) return LABELS_BY_ID;
  const m = new Map();
  for (const g of GROUP_ORDER) {
    for (const x of metricsForGroup(g)) if (!m.has(x.id)) m.set(x.id, x.label);
  }
  LABELS_BY_ID = m;
  return m;
}
const AGG_TEXT = {
  sum: '区间相加',
  last: '取区间末值',
  weightedAverage: '按访客数加权平均',
  average: '区间平均',
};
export function hintFor(metric) {
  const ids = labelsById();
  const nm = (id) => ids.get(id) || id;
  const d = DERIVE[metric.derive || metric.id];
  if (metric.aggregation === 'derive' && d) {
    if (d.minus) return d.minus.map(nm).join(' − ');
    if (d.num && d.den) return nm(d.num) + ' ÷ ' + nm(d.den);
  }
  return AGG_TEXT[metric.aggregation] || '区间相加';
}

function cardsFor(group, stores, dates, prevDates, grain, ctx) {
  const metrics = metricsForGroup(group);
  return metrics.map((metric) => {
    const cur = aggregate(stores.map((s) => s.days), dates, metric);
    const prev = aggregate(stores.map((s) => s.days), prevDates, metric);
    // 覆盖面：当期有值的天数占区间天数的比例（不足一半算「部分覆盖」）
    let covered = 0;
    for (const date of dates) {
      let any = false;
      for (const s of stores) if (s.days.has(date)) any = true;
      if (any) covered += 1;
    }
    const partial = dates.length > 0 && covered / dates.length < 0.5;
    const cmp = compareText(cur, prev, { bad: Boolean(metric.bad), incomplete: !cur && Boolean(prev) });
    return {
      id: metric.id,
      label: metric.label,
      group,
      type: metric.type || 'int',
      tone: metric.tone || 'info',
      bad: Boolean(metric.bad),
      trend: metric.trend === false ? false : true,
      percentScale: metric.percentScale || '',
      value: cur,
      prev,
      valueText: fmtValue(cur, metric),
      deltaText: cmp.text,
      deltaState: cmp.state,
      up: Boolean(cmp.up),
      partial,
      hint: hintFor(metric),
      series: seriesOf(stores, dates, metric, grain),
    };
  });
}

/**
 * 生成看板数据。
 * @param {{
 *   accounts: any[], store?: string, days?: number, range?: 'month'|'lastmonth',
 *   from?: string, to?: string, group?: string, grain?: 'day'|'week'|'month',
 *   mode?: 'combined'|'by-platform', now?: Date
 * }} opts
 */
export function buildDashboard(opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date();
  const wanted = Array.isArray(opts.accounts) ? opts.accounts : [];
  const sellers = wanted.filter((a) => a && a.accountType !== 'buyer' && a.platform);
  const store = String(opts.store || 'all');
  const picked = store && store !== 'all' ? sellers.filter((a) => a.id === store) : sellers;
  const range = resolveRange({ ...opts, now });
  const dates = dayList(range.start, range.end);
  const prev = shiftRange(range.start, range.end);
  const prevDates = dayList(prev.start, prev.end);
  const grain = ['day', 'week', 'month'].includes(String(opts.grain)) ? String(opts.grain) : 'day';
  const mode = String(opts.mode) === 'by-platform' ? 'by-platform' : 'combined';
  const group = String(opts.group || 'overview');
  const groupList = group === 'all' ? GROUP_ORDER.slice() : (METRIC_GROUPS[group] ? [group] : ['overview']);

  const stores = picked.map((account) => {
    const s = storeSeries(account);
    return { account, days: s.days, notes: s.notes };
  });

  const groups = groupList.map((g) => ({
    id: g,
    label: GROUP_LABELS[g] || g,
    cards: cardsFor(g, stores, dates, prevDates, grain, {}),
  }));

  const platforms = mode === 'by-platform'
    ? Array.from(new Set(picked.map((a) => a.platform))).map((platform) => {
        const list = stores.filter((s) => s.account.platform === platform);
        return {
          platform,
          groups: groupList.map((g) => ({ id: g, label: GROUP_LABELS[g] || g, cards: cardsFor(g, list, dates, prevDates, grain, {}) })),
        };
      })
    : [];

  const withData = stores.filter((s) => s.days.size > 0);
  const notes = [];
  if (!sellers.length) notes.push('还没有卖家店铺账号');
  else if (!picked.length) notes.push('没有找到这家店铺');
  if (sellers.length && !withData.length) notes.push('还没有可用的采集产物，请先跑一次采集');
  for (const s of stores) if (!s.days.size) notes.push(s.account.name + '：' + (s.notes[0] || '没有可用产物'));

  const coveredDays = dates.filter((date) => stores.some((s) => s.days.has(date))).length;
  const coverage = dates.length ? coveredDays / dates.length : 0;

  return {
    ok: true,
    generatedAt: new Date(now).toISOString(),
    range: { start: range.start, end: range.end, days: dates.length, label: range.start + ' — ' + range.end },
    prevRange: { start: prev.start, end: prev.end },
    grain,
    mode,
    group,
    store: store || 'all',
    coverage,
    partial: coverage > 0 && coverage < 0.5,
    stores: picked.map((a) => ({
      id: a.id,
      name: a.name,
      platform: a.platform,
      days: stores.find((s) => s.account.id === a.id) ? stores.find((s) => s.account.id === a.id).days.size : 0,
    })),
    groups,
    platforms,
    // 兼容旧前端：顶层给经营总览的卡片
    cards: (groups.find((g) => g.id === 'overview') || groups[0] || { cards: [] }).cards,
    notes,
  };
}
