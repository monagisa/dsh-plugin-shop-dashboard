// 只提供看板用到的两个日期函数（与店铺账号插件的 datastore 同名同语义）。

/** 解析成毫秒数（与店铺账号插件一致：parseDay 返回毫秒时间戳，便于直接做减法比较）。 */
export function parseDay(text) {
  const m = String(text || '').match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!m) return NaN;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getTime();
}

/** 毫秒数 / Date / 日期字符串 → `YYYY-MM-DD`。 */
export function fmtDay(value) {
  let d;
  if (value instanceof Date) d = value;
  else if (typeof value === 'number' && Number.isFinite(value)) d = new Date(value);
  else d = new Date(String(value || ''));
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
