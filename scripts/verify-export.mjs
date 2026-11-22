// Compares the output of the Bedrock exporter with the pack in base/.
//   npm run verify:export
// Exit code 0 = every exported JSON file equals its counterpart in base/ and every static file exists.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = path.join(ROOT, "base");
const load = rel => import(pathToFileURL(path.join(ROOT, "src", rel)).href);

const { buildPackJsonFiles } = await load("export/packJson.js");
const cfg = await load("config/index.js");

// ---- helpers ------------------------------------------------------------------------------------------------
function stripComments(text) {
  let out = "", inStr = false, esc = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) { out += c; if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; out += "\n"; continue; }
    out += c;
  }
  return out;
}
const readJson = p => JSON.parse(stripComments(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "")));

// Lists whose order has no meaning in Bedrock: bones (found by name) and particle effects (found by effect + locator).
function canon(x, key = "") {
  if (Array.isArray(x)) {
    const items = x.map(i => canon(i));
    if (key === "bones" && items.every(i => i && i.name)) return items.sort((a, b) => a.name.localeCompare(b.name));
    if (key === "particle_effects" && items.every(i => i && i.effect)) return items.sort((a, b) => (a.effect + a.locator).localeCompare(b.effect + b.locator));
    return items;
  }
  if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, canon(v, k)]));
  return x;
}

function diff(a, b, p = "", out = []) {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || a === null || b === null) {
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push([p, a, b]);
  } else if (typeof a !== "object") {
    if (a !== b) out.push([p, a, b]);
  } else if (Array.isArray(a)) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (i >= a.length) out.push([`${p}[${i}]`, undefined, b[i]]);
      else if (i >= b.length) out.push([`${p}[${i}]`, a[i], undefined]);
      else diff(a[i], b[i], `${p}[${i}]`, out);
    }
  } else {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a)) out.push([`${p}.${k}`, undefined, b[k]]);
      else if (!(k in b)) out.push([`${p}.${k}`, a[k], undefined]);
      else diff(a[k], b[k], `${p}.${k}`, out);
    }
  }
  return out;
}
const show = v => { const t = JSON.stringify(v); return t === undefined ? "<absent>" : t.length > 200 ? t.slice(0, 200) + "…" : t; };
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const rel = p => path.relative(BASE, p).split(path.sep).join("/");

let failures = 0;
const fail = msg => { failures++; console.log("  FAIL " + msg); };

// ---- 1. generated JSON vs base ------------------------------------------------------------------------------
// Two runs: with generated particles only, and with the sun, moon and starbox files that the editor loads from public/particles.
function publicRawJsons() {
  const raw = {}, dir = path.join(ROOT, "public/particles");
  const take = (key, file) => { const p = path.join(dir, file); if (fs.existsSync(p)) raw[key] = readJson(p); };
  take("sun", "sun.particle.json");
  take("moon", "moon.particle.json");
  for (const f of Object.keys(cfg.STARBOX_FACES)) take(`star_field_${f}_stars`, `star_field_${f}_stars.particle.json`);
  return raw;
}

const runs = [["generated only", {}], ["with public/particles", publicRawJsons()]];
const exportedPaths = new Set();
for (const [label, rawJsons] of runs) {
  console.log(`\n== exporter JSON vs base/  (${label})`);
  let ok = 0;
  for (const { path: p, data } of buildPackJsonFiles({ rawJsons })) {
    exportedPaths.add(p);
    const basePath = path.join(BASE, p);
    if (!fs.existsSync(basePath)) {
      if (cfg.EXPORT_ONLY_FILES.includes(p)) { if (label === runs[0][0]) console.log(`  note ${p} is not in base/ (listed in EXPORT_ONLY_FILES)`); continue; }
      fail(`${p} is exported but does not exist in base/`); continue;
    }
    const d = diff(canon(JSON.parse(JSON.stringify(data))), canon(readJson(basePath)));
    if (!d.length) { ok++; continue; }
    fail(`${p}: ${d.length} difference(s)`);
    for (const [k, a, b] of d.slice(0, 4)) console.log(`       ${k}\n         export: ${show(a)}\n         base  : ${show(b)}`);
  }
  console.log(`  ${ok} files identical`);
}

// ---- 2. static files ------------------------------------------------------------------------------------------
console.log("\n== static files");
const bundled = [...fs.readFileSync(path.join(ROOT, "src/export/baseAssets.js"), "utf8").matchAll(/"\.\.\/\.\.\/base\/([^"]+)"/g)].map(m => m[1]);
const globRe = g => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]") + "$");
const statics = [...cfg.STATIC_PACK_FILES, ...cfg.FALLBACK_PACK_FILES];
for (const f of statics) {
  if (!fs.existsSync(path.join(BASE, f))) fail(`${f} is listed as static but does not exist in base/`);
  else if (!bundled.some(g => globRe(g).test(f))) fail(`${f} is not covered by a pattern in export/baseAssets.js`);
}
console.log(`  ${statics.length} static / fallback files checked`);

// ---- 3. what base/ has that an export does not contain -----------------------------------------------------------
const textureSets = [...exportedPaths].filter(p => p.endsWith(".texture_set.json"));
const covered = new Set([...exportedPaths, ...statics]);
const editorOwned = new Set([
  ...Object.keys(cfg.STARBOX_FACES).map(f => `textures/normal_${f}.png`),
  "textures/environment/sunAstrum.png", "textures/environment/moon_phasesASTRUM.png", "textures/environment/planet.png"
]);
const notExported = walk(BASE).map(rel).filter(f => !covered.has(f) && !editorOwned.has(f)).sort();
console.log("\n== files in base/ that are not part of an export (leftovers, sources, scripts)");
console.log(notExported.map(f => "  " + f).join("\n") || "  none");
console.log(`  (${textureSets.length} texture sets are generated; ${editorOwned.size} textures come from the editor)`);

// ---- 4. is public/ in sync? ---------------------------------------------------------------------------------
console.log("\n== public/ vs base/ (warnings only: the editor owns these files)");
let stale = 0;
for (const f of walk(path.join(ROOT, "public"))) {
  const r = path.relative(path.join(ROOT, "public"), f).split(path.sep).join("/");
  const b = path.join(BASE, r.startsWith("particles/") ? r : r);
  if (!fs.existsSync(b)) continue;
  const same = fs.readFileSync(f).equals(fs.readFileSync(b));
  if (!same) { stale++; console.log(`  differs: public/${r}`); }
}
if (!stale) console.log("  all shared files identical");
else console.log(`  ${stale} file(s) differ. Run: npm run sync:base   (add -- --textures to copy the PNGs too)`);

console.log(failures ? `\n${failures} problem(s)` : "\nExport matches base/");
process.exit(failures ? 1 : 0);
