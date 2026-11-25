/**
 * store.mjs —— 只读访问「店铺账号管理」插件的数据目录。
 *
 * 本插件不写入任何东西，只读两类东西：
 *   1. `accounts.json`：店铺列表（名字、平台、账号类型），用来给看板分店铺；
 *   2. `collection/`：每个店铺的采集作业目录（读里面的成品工作簿）。
 *
 * 数据目录的推导顺序与店铺账号管理插件一致：
 *   `DSH_SHOP_ACCOUNTS_DIR` 环境变量 → `<DSH_HOME>/shop-accounts.dir` 指针 → `<DSH_HOME>/shop-accounts`。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function shopHome() {
  return process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
}

export function defaultShopAccountsDir() {
  return path.join(shopHome(), 'shop-accounts');
}

export function dataDirPointerPath() {
  return path.join(shopHome(), 'shop-accounts.dir');
}

export function readPointer() {
  try {
    const p = dataDirPointerPath();
    if (!fs.existsSync(p)) return '';
    const text = fs.readFileSync(p, 'utf8').trim();
    return text || '';
  } catch {
    return '';
  }
}

export function dataDir() {
  const override = (process.env.DSH_SHOP_ACCOUNTS_DIR || '').trim();
  if (override) return path.resolve(override);
  const pointer = readPointer();
  if (pointer) return path.resolve(pointer);
  return defaultShopAccountsDir();
}

export function accountsFile() {
  return path.join(dataDir(), 'accounts.json');
}

export function collectionRoot() {
  return path.join(dataDir(), 'collection');
}

function readJson(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function readAccounts() {
  const data = readJson(accountsFile());
  const list = (data && Array.isArray(data.accounts)) ? data.accounts : [];
  return list.map((a) => ({
    id: String(a.id || ''),
    name: String(a.name || ''),
    platform: String(a.platform || ''),
    accountType: String(a.accountType || '').toLowerCase(),
    collection: a.collection || null,
  })).filter((a) => a.id);
}

function readMarker(dir) {
  const m = readJson(path.join(dir, '.account.json'));
  if (m && m.accountId) return String(m.accountId);
  return '';
}

/**
 * 找某个账号的采集数据目录。
 *
 * 目录有两种形态：
 *   - 新命名：`<店名>_<平台>_<尾号>`，里面写了 `.account.json`；
 *   - 老命名：直接是账号 id。
 * 先按标记精确匹配，再退回老命名。
 */
export function collectionDirOf(account) {
  const root = collectionRoot();
  const id = typeof account === 'string' ? account : String((account && account.id) || '');
  if (!id) return path.join(root, '');
  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return path.join(root, id);
  }
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(root, e.name));
  const byMarker = dirs.find((dir) => readMarker(dir) === id);
  if (byMarker) return byMarker;
  const legacy = path.join(root, id);
  if (dirs.includes(legacy)) return legacy;
  return legacy;
}
