// Cuts the real-app recordings in ../footage into one clip per demo scene (assets/footage/s3.mp4 ...).
// Each segment is [take, inSeconds, outSeconds, targetSeconds]; it is retimed to targetSeconds.
// The last segment of a scene absorbs whatever is left of that scene's narration-driven length.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "..", "footage");
const out = join(root, "assets", "footage");
mkdirSync(out, { recursive: true });
const T = JSON.parse(readFileSync(join(root, "tools", "timings.json"), "utf8"));
const dur = Object.fromEntries(T.scenes.map((s) => [s.id, s.dur]));

const CUTS = {
  s3: [
    ["b1", 0.3, 4.5, 3.3], // workspace card -> module launcher -> click Introduction Drafting
    ["b1", 4.5, 8.2, 2.6], // Data Import: imported title and rationale
    ["b1", 8.2, 13.3, 2.9], // scroll to the imported research gaps
    ["b1", 15.9, 21.0, 2.4], // Upload File -> five PDFs in the queue
    ["b1", 22.4, 25.4, null], // Upload All -> uploading
  ],
  s4: [
    ["c1", 4.9, 9.6, 2.7], // metric weights -> Apply Weights & Assess All
    ["c1", 9.6, 13.2, 1.9], // Running AI Assessment
    ["c4", 1.4, 4.6, 2.0], // scored list -> open the top paper
    ["c4", 18.9, 26.0, 4.6], // Semantic Alignment Scores
    ["c4", 7.6, 17.0, 6.3], // evidence excerpt -> View page -> highlighted PDF page
    ["c5", 1.0, 9.5, null], // select four papers -> Approve
  ],
  s5: [
    ["d1", 0.6, 3.6, 2.6], // Step 3 -> Draft Introduction
    ["d1", 3.6, 7.6, 1.6], // generating
    ["d1", 50.9, 56.0, 2.8], // draft arrives with citations
    ["d1", 57.0, 62.6, 2.8], // scroll through the draft
    ["d2", 0.8, 6.6, null], // Export menu
  ],
};

for (const [scene, segs] of Object.entries(CUTS)) {
  const fixed = segs.reduce((n, s) => n + (s[3] ?? 0), 0);
  const inputs = [];
  const chains = segs.map(([take, a, b, target], i) => {
    const t = target ?? dur[scene] - fixed;
    inputs.push("-ss", String(a), "-t", String(b - a), "-i", join(src, `${take}.mp4`));
    return `[${i}:v]setpts=(PTS-STARTPTS)*${(t / (b - a)).toFixed(5)},fps=30,trim=duration=${t.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`;
  });
  const graph = chains.join(";") + ";" + segs.map((_, i) => `[v${i}]`).join("") + `concat=n=${segs.length}:v=1:a=0[out]`;
  const file = join(out, `${scene}.mp4`);
  execFileSync("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", graph, "-map", "[out]", "-t", dur[scene].toFixed(3), "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-g", "15", "-pix_fmt", "yuv420p", "-movflags", "+faststart", file]);
  console.log(scene, "target", dur[scene]);
}
