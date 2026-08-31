// module3/synthesis-draft/components/SourceUsageTransparency.jsx
//
// Req 5: Workflow transparency. Shows HOW each approved RRL will be used in the
// introduction — its computed relevance tier, why it landed there (score
// breakdown + any user override), and, after generation, which references were
// actually cited.

import { useEffect, useState } from "react";
import theme from "../../../theme";
import * as store from "../../../lib/citewiseStore";
import { ChevronDown, ChevronRight } from "lucide-react";

const TIER_META = {
  CORE: { label: "Core evidence", color: theme.success, note: "Used as main synthesis evidence." },
  SUPPORTING: { label: "Supporting", color: theme.accent, note: "Used cautiously as supporting evidence." },
  TANGENTIAL: { label: "Background", color: theme.warning, note: "Brief background only." },
  EXCLUDED: { label: "Excluded", color: theme.danger, note: "Not used as evidence." },
};

function subScores(doc) {
  return {
    gapAlignment: doc.gapAlignmentScore,
    methodology: doc.methodologyScore,
    theoretical: doc.theoreticalScore,
    citation: doc.citationScore,
  };
}

function computeTier(doc, usageChoice, prefs) {
  const map = { core: "CORE", supporting: "SUPPORTING", background: "TANGENTIAL", exclude: "EXCLUDED" };
  if (usageChoice && map[usageChoice]) return { tier: map[usageChoice], reason: "Set manually by you", overall: null };

  const overall = store.recomputeOverall(subScores(doc), prefs) ?? doc.relevancyScore ?? null;
  const rec = String(doc.recommendationStatus || "").toLowerCase();
  const rel = String(doc.relevanceLevel || "").toLowerCase();

  let tier = "SUPPORTING";
  if (overall != null) {
    if (overall >= 75) tier = "CORE";
    else tier = "SUPPORTING"; // AI auto-tiering is restricted to min SUPPORTING
  }
  return { tier, reason: `Weighted relevance ${overall != null ? Math.round(overall) : "—"} (Auto Min: Supporting)`, overall };
}

export default function SourceUsageTransparency({ sessionId, documents }) {
  const [prefs, setPrefs] = useState(() => store.getScorePrefs(sessionId));
  const [usage, setUsage] = useState(() => store.getRrlUsage(sessionId));

  useEffect(() => {
    const unsub = store.subscribe(({ name }) => {
      if (name === "scorePrefs") setPrefs(store.getScorePrefs(sessionId));
      if (name === "rrlUsage") setUsage(store.getRrlUsage(sessionId));
    });
    return unsub;
  }, [sessionId]);

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radiusLg,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "1rem 1.25rem",
          borderBottom: isOpen ? `1px solid ${theme.border}` : "none",
          background: theme.surfaceAlt,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none"
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <span style={{ fontFamily: theme.font, fontWeight: 700, fontSize: "1.02rem", color: theme.accent }}>
            How your sources are used
          </span>
          <p style={{ margin: "4px 0 0", fontSize: "0.76rem", color: theme.textMuted, fontFamily: theme.font, lineHeight: 1.5 }}>
            Each approved RRL is ranked by your relevance weights. Tiers decide how strongly the AI leans on each source.
          </p>
        </div>
        <div style={{ paddingLeft: "10px" }}>
          {isOpen ? <ChevronDown size={18} color={theme.accent} /> : <ChevronRight size={18} color={theme.textMuted} />}
        </div>
      </div>

      {isOpen && (
        <>          <div style={{ padding: "0.75rem 1.25rem 1rem", display: "flex", flexDirection: "column", gap: "8px" }}>
            {documents.length === 0 ? (
              <p style={{ color: theme.textMuted, fontSize: "0.82rem", fontFamily: theme.font }}>No approved sources yet.</p>
            ) : (
              documents.map((doc, idx) => {
                const docId = doc.id ?? doc.documentId;
                const choice = (usage[docId] || usage[String(docId)] || {}).usage || "auto";
                const { tier, reason } = computeTier(doc, choice === "auto" ? null : choice, prefs);
                const meta = TIER_META[tier];
                return (
                  <div
                    key={docId ?? idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      background: theme.surfaceAlt,
                      border: `1px solid ${theme.border}`,
                      borderRadius: "8px",
                      padding: "8px 12px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: theme.text,
                          fontFamily: theme.font,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 200,
                        }}
                        title={doc.fileName || doc.name}
                      >
                        {doc.fileName || doc.name}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: theme.textMuted, fontFamily: theme.font }}>{reason}</div>
                    </div>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: meta.color,
                        border: `1px solid ${meta.color}`,
                        borderRadius: "6px",
                        padding: "2px 8px",
                        fontFamily: theme.font,
                      }}
                      title={meta.note}
                    >
                      {meta.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
