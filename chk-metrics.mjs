import fs from 'node:fs';
const s = fs.readFileSync('./lib/metrics.mjs', 'utf8');
const i = s.indexOf('DERIVE');
console.log(s.slice(i - 40, i + 700));
const j = s.indexOf('export const METRIC_GROUPS');
console.log('---- group sample ----');
console.log(s.slice(j, j + 700));
