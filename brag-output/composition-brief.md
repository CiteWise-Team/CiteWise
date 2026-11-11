# Hyperframes Composition Brief: CiteWise

## Objective
A two-minute-maximum narrated pitch for TekCon 2026: problem, solution, how it works (the three
CiteWise steps), results, impact, team.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape - 1920x1080, 30 fps
- Duration: 1:41 (cap 2:00, set by the brief; overrides /brag's 15-25 s)

## Source Material
- Project root: the CiteWise repository
- Primary files read: `README.md`, `web/src/pages/Home.jsx`, `web/src/citewise/theme.js`,
  `web/index.html`, `web/src/components/ui/GroupCard.jsx`, and the module1 / module2 / module3
  components under `web/src/citewise/`
- Product name: CiteWise
- Tagline: "Discover research gaps and draft with confidence."
- Key UI recreated: the "Select a Research Module" launcher, the workflow tracker, CATalyst
  Workspace import + RRL Document Upload, Quick Navigation + AI Assessment Panel (Semantic
  Alignment Scores, evidence excerpt, page preview), Synthesis Control + generated draft + export menu
- Copy that appears verbatim from the app: step names, panel titles, "Ready to upload?",
  "Drop PDF files or click to browse", "Highlighted Evidence Excerpts", "View page",
  "Proceed to Synthesis", "Approved Documents", "Average Score", the four export options,
  Recommended / Needs Review / Low Relevance

## Creative Direction
- Tone preset: polished
- Creative direction: calm, confident capstone product film
- Angle, hook, outro: see `brag-plan.md`
- Avoid: generic SaaS language, abstract filler, invented metrics

## Visual Identity
- Background #0e0e18, panel #1e1e2f, surface #25253a, border #3a3a55
- Text #e4e4f0, muted #a9a9bd, accent #ea580c / #f97316, success #3ecf8e
- Display font Poppins, body Geist, numbers Geist Mono (bundled in `assets/fonts/`)

## Storyboard
1. Problem - PDFs pile up; two questions
2. Solution - logo, name, landing headline, three-step strip
3. Step 1 Data Import - launcher click, imported title / rationale / gaps, four PDFs uploaded
4. Step 2 AI Assessment - scores, four weighted bars, evidence excerpt, page preview, approvals
5. Step 3 Generate Introduction - draft with citations, references, export menu
6. Results - 69-497 ms extraction, ~24 s mean assessment (18-31 s), 0 extra AI calls on re-weighting
7. Impact and team card

Scene lengths are not fixed: `tools/build-vo.mjs` measures the narration and writes
`tools/timings.json`, and `tools/build.mjs` stamps those timings into `index.html`.

## Audio
- Narration: Kokoro `af_heart` at 1.1x, one clip per line, mixed to `assets/vo/voiceover.wav`
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` at 0.13 under the voice, fades out under the team card
- Music cue guidance: preset read; narration drives timing, so no beat locks (natural timing chosen for readability)
- Audio-reactive treatment: none
- SFX: mouse clicks on the four simulated clicks, soft drops on the uploaded PDFs, a soft bell on the two logo reveals

## Hyperframes notes
- Built against Hyperframes 0.9.x using the CLI's own docs; the Hyperframes agent skills are not installed on this machine.
- `npx hyperframes check` is the gate before render.
- Demo scenes 3-5 are real recordings of the deployed app (`brag-output/footage/`), cut and retimed to the
  narration by `tools/build-footage.mjs` into `assets/footage/s3.mp4`, `s4.mp4`, `s5.mp4`. AI wait times are shortened.
- Rebuild order after changing the script or the cuts: `node tools/build-vo.mjs`, `node tools/build-footage.mjs`,
  `node tools/build.mjs`, then `npx hyperframes check` and `npx hyperframes render --output ../brag.mp4`.
