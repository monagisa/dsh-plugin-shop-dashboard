import { readAccounts } from './lib/store.mjs';
import { buildDashboard } from './lib/dashboard.mjs';
const accs = readAccounts();
const acc = accs.find((a) => String(a.platform) === 'taobao') || accs[0];
const d = buildDashboard({ accounts: [acc], store: 'all', days: 7, group: 'overview', grain: 'day' });
const c = d.groups[0].cards[0];
console.log('card keys:', Object.keys(c).join(','));
console.log('series sample:', JSON.stringify((c.series || []).slice(0, 3)));
console.log('coverage:', d.coverage, 'partial:', d.partial, 'range:', JSON.stringify(d.range));
