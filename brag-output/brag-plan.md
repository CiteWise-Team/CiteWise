# Brag Plan: CiteWise (TekCon 2026 two-minute pitch)

> Overrides to the default /brag shape, requested by the brief: duration is ~1:50 (hard cap 2:00)
> instead of 15-25s, narration is on (Kokoro, `af_heart`), and the structure follows the
> pitch flow Problem -> Solution -> How it works (demo) -> Results -> Impact -> Team.

## What is this app?
CiteWise is an AI-powered academic research assistant that scores related-literature PDFs
against a research gap and drafts a citation-traceable introduction from the approved sources.

## The angle
A thesis introduction starts as a pile of PDFs nobody can rank. CiteWise turns that pile into
a ranked, evidence-backed shortlist and then into a drafted introduction where every claim
opens the page it came from. The video is the product doing exactly that, in its own three steps.

## Hook (first 3 seconds)
PDF pages drop onto the screen one after another while the line "Every thesis starts with a pile
of PDFs." lands. Then two questions: "Which papers support your gap?" / "Where did this claim come from?"

## Key moments (the middle)
- One click on the group card's **CiteWise** button imports Research Title, Rationale and gaps.
- Four score bars fill: Gap Alignment, Methodology, Theory / Framework, Citation Quality (35 / 30 / 20 / 15).
- An evidence excerpt with "Page 7 - View page" opens the PDF page with the quote highlighted.
- The introduction draft writes itself with in-text citations, then the export menu opens.

## Outro / punchline
"Discover research gaps and draft with confidence." (the landing page headline) over the logo,
then the team card.

## User flow worth showing
Step 1 Data Import -> Step 2 AI Assessment -> Step 3 Generate Introduction, with the real
workflow tracker ("Step 1 / Step 2 / Step 3") across the top of every demo scene.

## Tone
- Preset: polished
- Creative direction: calm, confident capstone product film
- Interpretation: steady narration-led pacing, long readable holds, UI motion does the work, no jokes.

## Format: landscape - 1920x1080, 30 fps
## Duration: ~110 s (cap 120 s)

## Visual identity (from the project)
- Background: #0e0e18 (page), #1e1e2f (panel), #25253a (raised card), border #3a3a55
- Accent: #ea580c, bar gradient #f97316 -> #fb8c3a
- Text: #e4e4f0, muted #a1a1b5, success #3ecf8e
- Display font: Poppins (600/700/800)
- Body font: Geist, Geist Mono for numbers
- Strongest visual element: the Semantic Alignment Scores panel and the page-verified evidence excerpt

## Share copy (draft)
CiteWise scores your related literature against your research gap, shows the page behind every
score, and drafts your introduction from the sources you approved.

## Audio direction
- Role: narration-led, warm bed underneath
- Music: happy-beats-business-moves-vol-12 (steady and clean, 117 s)
- Music treatment: starts at 0, sits at ~0.13 under the voice for the whole film, 2.5 s fade-out under the team card
- Music cue guidance: preset read (`cues/...vol-12...music-cues.md`, 110 BPM). Scene timing follows the narration, so cues are not locked; natural timing chosen for readability.
- Audio-reactive treatment: none (narration film; restraint)
- SFX posture: sparse - one click on the CiteWise button, soft drops on the PDFs, one soft bell on the logo
- Restraint rule: nothing may compete with the voice

## Voiceover script
1. Problem: "Every thesis starts the same way: with a pile of PDFs. Which papers actually support your research gap? Reading them all takes time you don't have, and you still end up with citations you can't trace."
2. Solution: "This is CiteWise: an AI-powered research assistant that takes you from research gap to a drafted introduction, in one connected flow."
3. Step 1: "Step one: Data Import. One click brings in your research title, rationale, and gaps from your CATalyst workspace. Then you upload your related literature as PDFs."
4. Step 2: "Step two: AI Assessment. Each paper is scored against your research gap on four weighted criteria: gap alignment, methodology, theory, and citation quality. Every score is backed by word-for-word evidence, verified down to the page, so you can open the PDF and check it yourself. You stay in control: approve what fits, and leave out what doesn't."
5. Step 3: "Step three: Generate Introduction. CiteWise drafts your introduction from only the sources you approved, complete with in-text citations and a reference list. Paraphrase it, keep a version history, and export to PDF or Word."
6. Results: "On real research papers, text extraction finished in under half a second, and a full AI assessment averaged about twenty-four seconds, against a thirty-second target. Change the weights, and the scores update with no extra AI call."
7. Impact: "Less time sorting papers. More time doing research. And every claim traceable to its source. CiteWise: discover research gaps, and draft with confidence."

## Grounding
- Scores, weights, classifications, traceability, zero-inference rescoring, export formats: README "Assessment Pipeline" and the module components.
- Numbers: README "Assessment Performance (Dual SLA)" - Tier 1 69-497 ms (target <= 1.0 s), Tier 2 18-31 s, mean ~24 s (target <= 30.0 s), 3-21 page real papers.
- Sample content on screen (paper titles, workspace name) comes from the landing page's own demo data; the research gap, excerpt and draft text are fictional stand-ins, and no real user data appears.
- No user-study or survey figures are shown because none exist in the repository.

## Storyboard
Scene lengths follow the generated narration; values below are targets.

### Scene 1 - Problem - ~14 s
PDF pages pile up; headline, then two questions. Sequential: pages drop one by one. Transition: soft -> 2

### Scene 2 - Solution - ~10 s
Logo, "CiteWise", headline from the landing page, the three-step strip. Transition: soft -> 3

### Scene 3 - Step 1: Data Import - ~13 s
Group card, cursor clicks **CiteWise**; Research Title / Rationale / gaps fill in; three PDFs land in "Selected files". Interaction: cursor click, sequential PDF rows. Transition: slide -> 4

### Scene 4 - Step 2: AI Assessment - ~25 s
Quick Navigation list with scores; Semantic Alignment Scores bars fill; CONFIDENCE / RELEVANCE boxes; evidence excerpt -> "View page" opens the highlighted PDF page; Approve. Sequential: 4 bars, held on screen. Transition: slide -> 5

### Scene 5 - Step 3: Generate Introduction - ~16 s
Draft paragraphs reveal line by line with citation chips; "Where each citation comes from"; export menu. Transition: soft -> 6

### Scene 6 - Results - ~17 s
Two measured stats with their targets, plus the zero-inference rescoring note and the stack strip. Transition: soft -> 7

### Scene 7 - Impact and team - ~14 s
Three impact lines, then logo, headline and team card with placeholders.

**Music mood for this video:** steady, clean, low
**Audio summary:** voice carries the film over a quiet bed, with a handful of soft interface sounds.
