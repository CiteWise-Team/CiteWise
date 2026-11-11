// Builds index.html from tools/index.template.html and tools/timings.json.
// Tokens: {{total}}  {{s3.start}} {{s3.dur}} {{s3.end}}  {{s3.l2}} (start of scene 3's 2nd line)
// Each takes an optional offset: {{s3.l2-0.1}}. <!--CAPTIONS--> and /*TIMINGS*/ are filled in too.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const T = JSON.parse(readFileSync(join(root, "tools", "timings.json"), "utf8"));
const scenes = Object.fromEntries(T.scenes.map((s) => [s.id, s]));
const fmt = (n) => String(Math.round(n * 1000) / 1000);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const captions = T.captions
  .map(
    (c, i) =>
      `      <div id="cap${i + 1}" class="clip cap" data-start="${fmt(c.start)}" data-duration="${fmt(c.dur)}" data-track-index="5"><span>${esc(c.text)}</span></div>`,
  )
  .join("\n");

let html = readFileSync(join(root, "tools", "index.template.html"), "utf8");
html = html
  .replace("<!--CAPTIONS-->", captions)
  .replace("/*TIMINGS*/", JSON.stringify({ total: T.total, scenes: T.scenes }))
  .replace(/\{\{total([+-][\d.]+)?\}\}/g, (_, off) => fmt(T.total + (off ? parseFloat(off) : 0)))
  .replace(/\{\{(s\d)\.(start|dur|end|l\d)([+-][\d.]+)?\}\}/g, (m, id, key, off) => {
    const s = scenes[id];
    if (!s) throw new Error(`unknown scene in ${m}`);
    let v;
    if (key === "start") v = s.start;
    else if (key === "dur") v = s.dur;
    else if (key === "end") v = s.start + s.dur;
    else {
      const line = s.lines[parseInt(key.slice(1), 10) - 1];
      if (!line) throw new Error(`unknown line in ${m}`);
      v = line.start;
    }
    return fmt(v + (off ? parseFloat(off) : 0));
  });
const left = html.match(/\{\{[^}]*\}\}/);
if (left) throw new Error(`unresolved token ${left[0]}`);
writeFileSync(join(root, "index.html"), html);
console.log(`index.html built: ${T.total}s, ${T.captions.length} captions`);
