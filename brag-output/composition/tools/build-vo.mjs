// Generates the narration from tools/script.json:
//   assets/vo/<scene>-<n>.wav   one Kokoro clip per line (cached; delete a file to regenerate it)
//   assets/vo/voiceover.wav     all lines laid out on one track
//   tools/timings.json          scene and caption timings consumed by build.mjs
// Needs Kokoro: pip install kokoro-onnx soundfile (or set HYPERFRAMES_PYTHON to a venv python).
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const voDir = join(root, "assets", "vo");
mkdirSync(voDir, { recursive: true });
const script = JSON.parse(readFileSync(join(root, "tools", "script.json"), "utf8"));

const run = (cmd) => execSync(cmd, { cwd: root, stdio: ["ignore", "pipe", "pipe"] }).toString();
const probe = (file) =>
  parseFloat(run(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`).trim());
const round = (n) => Math.round(n * 1000) / 1000;

let t = 0;
const scenes = [];
const clips = [];
for (const scene of script.scenes) {
  const start = t;
  t += scene.lead ?? script.lead;
  const lines = [];
  scene.lines.forEach((line, i) => {
    const wav = join(voDir, `${scene.id}-${i + 1}.wav`);
    if (!existsSync(wav)) {
      const txt = join(voDir, `${scene.id}-${i + 1}.txt`);
      writeFileSync(txt, line.say);
      console.log(`tts ${scene.id}-${i + 1}: ${line.say}`);
      run(`npx --yes hyperframes tts "${txt}" --voice ${script.voice} --speed ${script.speed} --output "${wav}"`);
    }
    const dur = probe(wav);
    if (i > 0) t += script.gap;
    lines.push({ start: round(t), dur: round(dur), cap: line.cap });
    clips.push({ wav, start: t });
    t += dur;
  });
  t += scene.tail ?? script.tail;
  scenes.push({ id: scene.id, start: round(start), dur: round(t - start), lines });
}

// Captions: a line's "|" marks split it into chunks, timed by character share.
const captions = [];
for (const scene of scenes) {
  for (const line of scene.lines) {
    const chunks = line.cap.split("|").map((c) => c.trim());
    const total = chunks.reduce((n, c) => n + c.length, 0);
    let at = line.start;
    chunks.forEach((text, i) => {
      const dur = (line.dur * text.length) / total;
      const last = i === chunks.length - 1;
      captions.push({ start: round(at), dur: round(dur + (last ? 0.2 : 0)), text });
      at += dur;
    });
  }
}

const inputs = clips.map((c) => `-i "${c.wav}"`).join(" ");
const delays = clips
  .map((c, i) => `[${i}:a]aresample=48000,adelay=${Math.round(c.start * 1000)}:all=1[a${i}]`)
  .join(";");
const mix = clips.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${clips.length}:normalize=0[out]`;
const out = join(voDir, "voiceover.wav");
run(`ffmpeg -y -v error ${inputs} -filter_complex "${delays};${mix}" -map "[out]" -t ${round(t)} -ar 48000 -ac 1 "${out}"`);

const timings = { total: round(t), scenes, captions };
writeFileSync(join(root, "tools", "timings.json"), JSON.stringify(timings, null, 2));
console.log(`total ${timings.total}s`);
for (const s of scenes) console.log(`${s.id} ${s.start} +${s.dur}`);
