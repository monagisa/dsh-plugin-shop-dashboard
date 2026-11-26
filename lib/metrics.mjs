// 指标注册表：对齐 Accio「电商数据看板」的四组指标卡定义（id/label/type/tone/aggregation/derive/bad/trend）。
//
// 上游把口径写成数据（`ft` 常量 + 派生公式表），前端只按定义渲染。我们照搬这套结构，
// 这样以后加卡片、改别名、改口径都只动这张表，不动渲染与聚合逻辑。
//
// type: int 整数 / money 金额 / yuan 金额（客单价类） / pct 百分比 / ratio 比值 / seconds 时长
// aggregation: sum 求和 / last 取末值（存量类） / weightedAverage 加权平均 / average 直接平均 / derive 重算
// bad: true 表示「越高越差」（退款、花费、跳失率、CPC、CPL…），涨了要按坏方向着色
// trend: false 表示不画走势（商品数这类存量）
// percentScale: 'fraction' 表示来源里是小数（0.32 而不是 32）

export const TONE = {
  primary: { color: '#1ead6f', bg: '#f4fbf8', border: '#d4efe3' },
  info: { color: '#3080ff', bg: '#f5f9ff', border: '#d6e6fd' },
  teal: { color: '#0092b5', bg: '#f3fafc', border: '#cfe9ef' },
  purple: { color: '#6d3ed1', bg: '#f8f6fd', border: '#e2d8f7' },
  warn: { color: '#ff8800', bg: '#fff9f2', border: '#fae2c6' },
  danger: { color: '#e52828', bg: '#fef6f6', border: '#f7d9d7' },
};

// 派生指标的操作数（与上游 salesRevenue / aov / conversion / roi / cpc / cpl 一致）
export const DERIVE = {
  salesRevenue: { minus: ['gmv', 'refund', 'spend'] },
  aov: { num: 'gmv', den: 'buyers' },
  conversion: { num: 'buyers', den: 'visitors' },
  roi: { num: 'revenue', den: 'spend' },
  cpc: { num: 'spend', den: 'clicks' },
  cpl: { num: 'spend', den: 'leads' },
};

export const METRIC_GROUPS = {
  overview: [
    { id: 'visitors', label: '访客数', type: 'int', tone: 'info', aggregation: 'sum', aliases: ['访客数', '店铺访客数', '商品访客数', '区间访客数', 'uv'] },
    { id: 'buyers', label: '支付买家数', type: 'int', tone: 'info', aggregation: 'sum', aliases: ['支付买家数', '成交买家数', '成交人数', '支付人数', '成交客户数'] },
    { id: 'orders', label: '订单数', type: 'int', tone: 'teal', aggregation: 'sum', aliases: ['支付子订单数', '支付订单数', '成交单量', '成交订单数', '区间支付订单数', '订单数', '支付父订单数'] },
    { id: 'aov', label: '客单价', type: 'yuan', tone: 'teal', aggregation: 'derive', derive: 'aov', aliases: ['客单价', '区间客单价', '客单价(按买家)'] },
    { id: 'gmv', label: '成交金额', type: 'money', tone: 'primary', aggregation: 'sum', aliases: ['成交金额', '支付金额', '用户支付金额', '支付金额(元)', '区间支付金额', '成交金额(元)'] },
    { id: 'spend', label: '推广花费', type: 'money', tone: 'warn', aggregation: 'sum', bad: true, aliases: ['推广花费', '推广总花费', '总花费', '广告花费', '营销花费', '全站推广花费', '总营销花费', '花费', '花费(元)', '网销宝推广消耗金额', '投放消耗（店铺被投）', '成交营销花费'] },
    { id: 'refund', label: '退款金额', type: 'money', tone: 'danger', aggregation: 'sum', bad: true, aliases: ['退款金额', '成功退款金额', '区间退款金额', '退款金额(元)', '退款金额（支付时间）', '成交退款金额（支付时间）'] },
    { id: 'conversion', label: '成交转化率', type: 'pct', tone: 'teal', aggregation: 'derive', derive: 'conversion', aliases: ['成交转化率', '支付转化率', '区间支付转化率', '区间成交转化率', '成交转化率（%）'] },
    { id: 'salesRevenue', label: '销售收入', type: 'money', tone: 'purple', aggregation: 'derive', derive: 'salesRevenue', aliases: [] },
  ],

  traffic: [
    { id: 'exposure', label: '曝光量', type: 'int', tone: 'info', aggregation: 'sum', aliases: ['曝光量', '展现次数', '展现量'] },
    { id: 'visitors', label: '访客数', type: 'int', tone: 'info', aggregation: 'sum', aliases: ['访客数', '店铺访客数', '区间访客数', 'uv'] },
    { id: 'pageViews', label: '浏览量', type: 'int', tone: 'info', aggregation: 'sum', aliases: ['浏览量', '店铺浏览量', '商品浏览量', '区间浏览量', 'pv'] },
    { id: 'carts', label: '加购人数', type: 'int', tone: 'purple', aggregation: 'sum', aliases: ['加购人数', '总购物车数'] },
    { id: 'buyers', label: '支付买家数', type: 'int', tone: 'primary', aggregation: 'sum', aliases: ['支付买家数', '成交买家数', '成交人数'] },
    { id: 'conversion', label: '成交转化率', type: 'pct', tone: 'teal', aggregation: 'derive', derive: 'conversion', aliases: ['成交转化率', '支付转化率'] },
    { id: 'bounceRate', label: '跳失率', type: 'pct', tone: 'danger', aggregation: 'weightedAverage', weight: 'visitors', bad: true, aliases: ['跳失率', '店铺跳失率'] },
    { id: 'stay', label: '平均停留时长', type: 'seconds', tone: 'teal', aggregation: 'weightedAverage', weight: 'visitors', aliases: ['平均停留时长', '店铺平均停留时长', '平均访问页面数'] },
    { id: 'clickConversion', label: '点击转化率', type: 'pct', tone: 'purple', aggregation: 'average', aliases: ['点击转化率'] },
  ],

  product: [
    { id: 'pageViews', label: '商品浏览量', type: 'int', tone: 'info', aggregation: 'sum', aliases: ['商品浏览量', '区间商品浏览量', '浏览量'] },
    { id: 'visitors', label: '商品访客数', type: 'int', tone: 'info', aggregation: 'sum', aliases: ['商品访客数', '访客数', '区间商品访客数'] },
    { id: 'units', label: '支付件数', type: 'int', tone: 'teal', aggregation: 'sum', aliases: ['支付件数', '成交商品件数', '支付商品件数', '支付件数(件)'] },
    { id: 'gmv', label: '支付金额', type: 'money', tone: 'primary', aggregation: 'sum', aliases: ['支付金额', '成交金额', '支付金额(元)'] },
    { id: 'activeProducts', label: '动销商品数', type: 'int', tone: 'teal', aggregation: 'last', aliases: ['动销商品数', '动销spu数'] },
    { id: 'activeRate', label: '动销率', type: 'pct', tone: 'teal', aggregation: 'last', percentScale: 'fraction', aliases: ['动销率', 'spu动销率'] },
    { id: 'visitedProducts', label: '有访问商品数', type: 'int', tone: 'purple', aggregation: 'last', aliases: ['有访问商品数', '被访问商品数', '访问商品数'] },
    { id: 'productCount', label: '商品数', type: 'int', tone: 'info', aggregation: 'last', trend: false, aliases: ['在售商品数', '商品数', '在线商品数'] },
    { id: 'lowConversionCount', label: '高流量低转化商品', type: 'int', tone: 'danger', aggregation: 'last', bad: true, trend: false, aliases: ['高流量低转化商品数', '高流量低转化商品'] },
    { id: 'zeroSalesCount', label: '零成交商品', type: 'int', tone: 'danger', aggregation: 'last', bad: true, trend: false, aliases: ['零成交商品数', '零成交商品'] },
  ],

  promotion: [
    { id: 'spend', label: '推广花费', type: 'money', tone: 'warn', aggregation: 'sum', bad: true, aliases: ['推广花费', '花费', '花费(元)', '营销花费'] },
    { id: 'revenue', label: '推广成交额', type: 'money', tone: 'primary', aggregation: 'sum', aliases: ['推广成交额', '总成交金额', '总成交金额(元)', '成交金额'] },
    { id: 'roi', label: 'ROI', type: 'ratio', tone: 'purple', aggregation: 'derive', derive: 'roi', aliases: ['ROI', '实际投产比', '投入产出比', '推广投产比', '净投产比'] },
    { id: 'cpc', label: 'CPC', type: 'yuan', tone: 'danger', aggregation: 'derive', derive: 'cpc', bad: true, aliases: ['CPC', '平均点击花费', '平均点击花费(元)'] },
    { id: 'leads', label: '线索量', type: 'int', tone: 'primary', aggregation: 'sum', aliases: ['线索量', '线索数'] },
    { id: 'inquiries', label: '询盘量', type: 'int', tone: 'teal', aggregation: 'sum', aliases: ['询盘量', '询盘数', '旺旺咨询量'] },
    { id: 'cpl', label: 'CPL', type: 'yuan', tone: 'danger', aggregation: 'derive', derive: 'cpl', bad: true, aliases: ['CPL', '线索成本'] },
    { id: 'clicks', label: '点击量', type: 'int', tone: 'info', aggregation: 'sum', aliases: ['点击量', '点击次数'] },
  ],
};

export const GROUP_LABELS = {
  overview: '经营总览',
  traffic: '流量转化',
  product: '商品供给',
  promotion: '运营推广',
};

export const GROUP_ORDER = ['overview', 'traffic', 'product', 'promotion'];

export function metricOf(group, id) {
  const list = METRIC_GROUPS[group] || [];
  return list.find((m) => m.id === id) || null;
}

export function allMetrics() {
  const out = [];
  for (const g of GROUP_ORDER) for (const m of METRIC_GROUPS[g]) out.push({ ...m, group: g });
  return out;
}
