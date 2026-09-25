// module3/synthesis-draft/components/SourceUsageTransparency.jsx
//
// Req 5: Workflow transparency. Shows HOW each approved RRL will be used in the
// introduction — its computed relevance tier, why it landed there (score
// breakdown + any user override), and, after generation, which references were
// actually cited.

import { useEffect, useState } from "react";
import * as store from "../../../lib/citewiseStore";
import { ChevronDown, ChevronRight } from "lucide-react";

const TIER_META = {
  CORE: { label: "Core evidence", color: "#16a34a", bg: "#f0fdf4", note: "Used as main synthesis evidence." },
  SUPPORTING: { label: "Supporting", color: "#f97316", bg: "#fff7ef", note: "Used cautiously as supporting evidence." },
  TANGENTIAL: { label: "Background", color: "#d97706", bg: "#fffbeb", note: "Brief background only." },
  EXCLUDED: { label: "Excluded", color: "#dc2626", bg: "#fef2f2", note: "Not used as evidence." },
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
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div
        style={{
          padding: "1.125rem 1.5rem",
          borderBottom: isOpen ? "1px solid #e5e7eb" : "none",
          background: "#f9fafb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#f97316", letterSpacing: "0.01em" }}>
            How your sources are used
          </span>
          <p style={{ margin: "4px 0 0", fontSize: "0.76rem", color: "#6b7280", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5 }}>
            Each approved RRL is ranked by your relevance weights. Tiers decide how strongly the AI leans on each source.
          </p>
        </div>
        <div style={{ paddingLeft: "10px" }}>
          {isOpen ? <ChevronDown size={18} color="#f97316" /> : <ChevronRight size={18} color="#9ca3af" />}
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: "0.75rem 1.25rem 1rem", display: "flex", flexDirection: "column", gap: "8px" }}>
          {documents.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: "0.82rem", fontFamily: "'Poppins', sans-serif", fontStyle: "italic", margin: 0 }}>
              No approved sources yet.
            </p>
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
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "8px 12px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "#111827",
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 200,
                      }}
                      title={doc.fileName || doc.name}
                    >
                      {doc.fileName || doc.name}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#6b7280", fontFamily: "'Poppins', sans-serif" }}>{reason}</div>
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: meta.color,
                      background: meta.bg,
                      border: `1px solid ${meta.color}40`,
                      borderRadius: "6px",
                      padding: "2px 8px",
                      fontFamily: "'Poppins', sans-serif",
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
      )}
    </div>
  );
}