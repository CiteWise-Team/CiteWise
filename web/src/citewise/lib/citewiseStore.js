// citewise/lib/citewiseStore.js
//
// Session-scoped client store for the CiteWise adviser workflow. Everything is
// persisted in localStorage and keyed by sessionId so a refresh keeps the
// user's gap edits, instructions, scoring preferences, RRL usage choices and
// draft version history intact.
//
// A lightweight pub/sub (window CustomEvent) lets components in the same tab
// react immediately — the native `storage` event only fires across tabs.

const EVENT = "citewise:store-change";

function keyFor(sessionId, name) {
  return `citewise.${name}.${sessionId || "default"}`;
}

function read(sessionId, name, fallback) {
  try {
    const raw = localStorage.getItem(keyFor(sessionId, name));
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(sessionId, name, value) {
  try {
    localStorage.setItem(keyFor(sessionId, name), JSON.stringify(value));
    // Notify same-tab listeners.
    window.dispatchEvent(
      new CustomEvent(EVENT, { detail: { sessionId, name } })
    );
  } catch (err) {
    console.warn("[citewiseStore] write failed:", err);
  }
}

/** Subscribe to any store change. Returns an unsubscribe fn. */
export function subscribe(handler) {
  const wrapped = (e) => handler(e.detail || {});
  window.addEventListener(EVENT, wrapped);
  return () => window.removeEventListener(EVENT, wrapped);
}

function uid() {
  return `g_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
}

// ── Research gaps ──────────────────────────────────────────────────
// A gap: { id, text, source: 'catalyst' | 'user' | 'combined', note, selected }

export function getGaps(sessionId) {
  return read(sessionId, "gaps", []);
}

export function setGaps(sessionId, gaps) {
  write(sessionId, "gaps", gaps);
  syncPrimaryGap(sessionId, gaps);
}

/** Seed gaps from CATalyst import only if none have been customised yet. */
export function seedGapsFromCatalyst(sessionId, catalystGaps) {
  const existing = getGaps(sessionId);
  if (existing.length > 0) return existing;
  const seeded = (catalystGaps || [])
    .map((t) => String(t || "").trim())
    .filter(Boolean)
    .map((text, idx) => ({
      id: uid(),
      text,
      source: "catalyst",
      note: "",
      selected: idx === 0, // default-select the first imported gap
    }));
  if (seeded.length) setGaps(sessionId, seeded);
  return seeded;
}

export function addGap(sessionId, text, source = "user") {
  const gaps = getGaps(sessionId);
  const next = [
    ...gaps,
    { id: uid(), text: String(text || "").trim(), source, note: "", selected: false },
  ];
  setGaps(sessionId, next);
  return next;
}

export function updateGap(sessionId, id, patch) {
  const next = getGaps(sessionId).map((g) => (g.id === id ? { ...g, ...patch } : g));
  setGaps(sessionId, next);
  return next;
}

export function removeGap(sessionId, id) {
  const next = getGaps(sessionId).filter((g) => g.id !== id);
  setGaps(sessionId, next);
  return next;
}

export function toggleGapSelected(sessionId, id) {
  const next = getGaps(sessionId).map((g) =>
    g.id === id ? { ...g, selected: !g.selected } : g
  );
  setGaps(sessionId, next);
  return next;
}

/** Combine several gaps into one new gap; the originals are kept. */
export function combineGaps(sessionId, ids) {
  const gaps = getGaps(sessionId);
  const chosen = gaps.filter((g) => ids.includes(g.id));
  if (chosen.length < 2) return gaps;
  const combinedText = chosen.map((g) => g.text.replace(/\s+$/, "")).join(" Moreover, ");
  const next = [
    ...gaps.map((g) => ({ ...g, selected: false })),
    {
      id: uid(),
      text: combinedText,
      source: "combined",
      note: `Combined from ${chosen.length} gaps`,
      selected: true,
    },
  ];
  setGaps(sessionId, next);
  return next;
}

export function getSelectedGaps(sessionId) {
  return getGaps(sessionId).filter((g) => g.selected);
}

/**
 * Keep the legacy `citewise_chosen_gap_<sessionId>` key (read by the synthesis
 * module + backend) in sync with the first selected gap, so existing wiring
 * keeps working.
 */
function syncPrimaryGap(sessionId, gaps) {
  const selected = (gaps || []).filter((g) => g.selected);
  const primary = selected[0]?.text || "";
  const legacyKey = sessionId
    ? `citewise_chosen_gap_${sessionId}`
    : "citewise_chosen_gap_default";
  if (primary) localStorage.setItem(legacyKey, primary);
  else localStorage.removeItem(legacyKey);
}

// ── Chosen / refined title ─────────────────────────────────────────

export function getChosenTitle(sessionId) {
  return read(sessionId, "chosenTitle", "");
}

export function setChosenTitle(sessionId, title) {
  write(sessionId, "chosenTitle", title || "");
}

// ── User-guided synthesis instructions ─────────────────────────────

export function getInstructions(sessionId) {
  return read(sessionId, "instructions", "");
}

export function setInstructions(sessionId, text) {
  write(sessionId, "instructions", text || "");
}

// ── Relevance scoring preferences ──────────────────────────────────
// weights sum is normalised at use-time; enabled controls which components
// contribute to the recomputed overall score.

export const DEFAULT_WEIGHTS = {
  gapAlignment: 0.35,
  methodology: 0.3,
  theoretical: 0.2,
  citation: 0.15,
};

export const SCORE_COMPONENTS = [
  { key: "gapAlignment", label: "Gap Alignment" },
  { key: "methodology", label: "Methodology" },
  { key: "theoretical", label: "Theory / Framework" },
  { key: "citation", label: "Citation Quality" },
];

export function getScorePrefs(sessionId) {
  const stored = read(sessionId, "scorePrefs", null);
  if (stored && stored.weights && stored.enabled) return stored;
  return {
    weights: { ...DEFAULT_WEIGHTS },
    enabled: {
      gapAlignment: true,
      methodology: true,
      theoretical: true,
      citation: true,
    },
  };
}

export function setScorePrefs(sessionId, prefs) {
  write(sessionId, "scorePrefs", prefs);
}

/**
 * Recompute an overall score (0-100) from per-component sub-scores using the
 * user's weights, considering only enabled components. Returns null if no
 * enabled component has a numeric score.
 */
export function recomputeOverall(scores, prefs) {
  const { weights, enabled } = prefs;
  let sum = 0;
  let weightTotal = 0;
  for (const { key } of SCORE_COMPONENTS) {
    if (!enabled[key]) continue;
    const raw = scores?.[key];
    if (raw == null || Number.isNaN(Number(raw))) continue;
    const val = Number(raw) <= 1 ? Number(raw) * 100 : Number(raw);
    const w = Number(weights[key]) || 0;
    sum += val * w;
    weightTotal += w;
  }
  if (weightTotal === 0) return null;
  return Math.round(sum / weightTotal);
}

// ── RRL utilization control ────────────────────────────────────────
// Map keyed by document id:
//   { usage: 'auto'|'core'|'supporting'|'background'|'exclude',
//     emphasizedExcerpts: number[] }

export const RRL_USAGE_OPTIONS = [
  { key: "auto", label: "Auto (use AI relevance)" },
  { key: "core", label: "Core evidence" },
  { key: "supporting", label: "Supporting evidence" },
  { key: "background", label: "Background only" },
  { key: "exclude", label: "Exclude from synthesis" },
];

export function getRrlUsage(sessionId) {
  return read(sessionId, "rrlUsage", {});
}

export function setRrlUsage(sessionId, usage) {
  write(sessionId, "rrlUsage", usage);
}

export function getRrlUsageFor(sessionId, docId) {
  const all = getRrlUsage(sessionId);
  return all[docId] || { usage: "auto", emphasizedExcerpts: [] };
}

export function setRrlUsageFor(sessionId, docId, patch) {
  const all = getRrlUsage(sessionId);
  const current = all[docId] || { usage: "auto", emphasizedExcerpts: [] };
  all[docId] = { ...current, ...patch };
  write(sessionId, "rrlUsage", all);
  return all[docId];
}

export function toggleEmphasizedExcerpt(sessionId, docId, excerptIndex) {
  const current = getRrlUsageFor(sessionId, docId);
  const set = new Set(current.emphasizedExcerpts || []);
  if (set.has(excerptIndex)) set.delete(excerptIndex);
  else set.add(excerptIndex);
  return setRrlUsageFor(sessionId, docId, { emphasizedExcerpts: [...set] });
}

export function addCustomExcerpt(sessionId, docId, text) {
  const current = getRrlUsageFor(sessionId, docId);
  const custom = current.customExcerpts || [];
  return setRrlUsageFor(sessionId, docId, { customExcerpts: [...custom, text] });
}

export function removeCustomExcerpt(sessionId, docId, index) {
  const current = getRrlUsageFor(sessionId, docId);
  const custom = current.customExcerpts || [];
  return setRrlUsageFor(sessionId, docId, { customExcerpts: custom.filter((_, i) => i !== index) });
}

// ── Draft version history ──────────────────────────────────────────
// version: { id, content, references[], label, timestamp, source: 'generated'|'edited' }

export function getDraftVersions(sessionId) {
  return read(sessionId, "draftVersions", []);
}

export function addDraftVersion(sessionId, { content, references, label, source }) {
  const versions = getDraftVersions(sessionId);
  // Skip if identical to the most recent version.
  const last = versions[0];
  if (last && last.content === content) return versions;
  const entry = {
    id: uid(),
    content: content || "",
    references: references || [],
    label: label || `Version ${versions.length + 1}`,
    source: source || "generated",
    timestamp: new Date().toISOString(),
  };
  const next = [entry, ...versions].slice(0, 30); // cap history
  write(sessionId, "draftVersions", next);
  return next;
}

export function removeDraftVersion(sessionId, id) {
  const next = getDraftVersions(sessionId).filter((v) => v.id !== id);
  write(sessionId, "draftVersions", next);
  return next;
}

export function clearSession(sessionId) {
  ["gaps", "chosenTitle", "instructions", "scorePrefs", "rrlUsage", "draftVersions"].forEach(
    (name) => localStorage.removeItem(keyFor(sessionId, name))
  );
}
