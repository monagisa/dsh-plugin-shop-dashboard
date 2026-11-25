/**
 * 语法检查（不引入第三方依赖）：
 *   - `lib/**\/*.mjs` 与 `lib/index.js`：动态 import 一遍（能 import 说明模块语法没问题）；
 *   - `lib/client.js`：是 classic script（用到 window），用 `vm.Script` 只编译不执行。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const libDir = path.join(root, 'lib');
let checked = 0;
let failed = 0;

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

for (const file of walk(libDir)) {
  const rel = path.relative(root, file);
  const isClientBundle = path.basename(file) === 'client.js';
  try {
    if (file.endsWith('.mjs') || (file.endsWith('.js') && !isClientBundle)) {
      await import(pathToFileURL(file).href);
    } else if (isClientBundle) {
      const src = fs.readFileSync(file, 'utf8');
      new vm.Script(src, { filename: rel });
    } else {
      continue;
    }
    checked += 1;
  } catch (err) {
    failed += 1;
    console.log('FAIL ' + rel + ': ' + ((err && err.message) || err));
  }
}

console.log('checked=' + checked + ' failed=' + failed);
process.exit(failed ? 1 : 0);
