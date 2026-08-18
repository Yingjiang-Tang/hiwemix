// 校验色母官网链接映射的完整性：每个色母代码都必须有链接或显式声明无链接
// 用法：node scripts/validate-toner-links.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// 从 src/data/toners/*.ts 提取全部色母代码
const tonerFiles = readdirSync(join(root, "src/data/toners")).filter(
  (f) => f.endsWith(".ts") && f !== "index.ts",
);
const appCodes = new Set();
for (const f of tonerFiles) {
  const src = readFileSync(join(root, "src/data/toners", f), "utf8");
  for (const m of src.matchAll(/code: '([^']+)'/g)) appCodes.add(m[1]);
}

// 解析映射文件中的链接代码与无链接清单
const linksSrc = readFileSync(join(root, "src/data/toner-site-links.ts"), "utf8");
const linkedCodes = new Set(
  [...linksSrc.matchAll(/^\s*"([^"]+)": "https:\/\/www\.hiwe\.com\//gm)].map((m) => m[1]),
);
const withoutLinks = new Set(
  [...linksSrc.matchAll(/^\s*"([^"]+)",\s*$/gm)].map((m) => m[1]).filter((c) => !linkedCodes.has(c)),
);

const missing = [...appCodes].filter((c) => !linkedCodes.has(c) && !withoutLinks.has(c));
const unlinkedFromApp = [...linkedCodes].filter((c) => !appCodes.has(c));

let failed = false;
if (missing.length > 0) {
  failed = true;
  console.error(`❌ ${missing.length} 个色母既无链接也未声明无链接:`);
  for (const c of missing) console.error(`   ${c}`);
}
if (unlinkedFromApp.length > 0) {
  failed = true;
  console.error(`❌ ${unlinkedFromApp.length} 个链接代码不在应用色母清单中:`);
  for (const c of unlinkedFromApp) console.error(`   ${c}`);
}

console.log(
  `✅ 色母 ${appCodes.size} 个：链接 ${linkedCodes.size}、无链接 ${withoutLinks.size}、未覆盖 ${missing.length}`,
);
process.exit(failed ? 1 : 0);
