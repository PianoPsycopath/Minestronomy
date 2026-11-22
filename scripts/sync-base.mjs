// Copies the files that the editor reads from public/ out of the pack in base/.
//   npm run sync:base                 particle JSON only
//   npm run sync:base -- --textures   particle JSON and the PNGs that exist in both folders
//   npm run sync:base -- --check      change nothing, list what would change
// Only files that already exist in public/ are touched. Comet particles are generated, so they are not copied.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const check = args.includes("--check");
const withTextures = args.includes("--textures");

const walk = dir => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])) : []);
let changed = 0;

for (const sub of ["particles", ...(withTextures ? ["textures"] : [])]) {
  for (const file of walk(path.join(ROOT, "public", sub))) {
    const r = path.relative(path.join(ROOT, "public"), file);
    const src = path.join(ROOT, "base", r);
    if (!fs.existsSync(src)) continue;
    if (fs.readFileSync(src).equals(fs.readFileSync(file))) continue;
    changed++;
    console.log(`${check ? "would update" : "updated"}  public/${r.split(path.sep).join("/")}`);
    if (!check) fs.copyFileSync(src, file);
  }
}
console.log(changed ? `${changed} file(s) ${check ? "differ" : "updated"}` : "public/ is already in sync with base/");
if (!withTextures) console.log("PNG textures were not checked. Add --textures to include them.");
