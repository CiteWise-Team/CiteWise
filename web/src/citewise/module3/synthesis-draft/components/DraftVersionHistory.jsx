// module3/synthesis-draft/components/DraftVersionHistory.jsx
//
// Req 7: Draft versioning. Every generation and every saved edit is recorded
// as a version. Users can restore a previous version, compare two versions
// side-by-side, or delete versions.

import { useEffect, useState } from "react";
import theme, { ui } from "../../../theme";
import * as store from "../../../lib/citewiseStore";

function fmt(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function DraftVersionHistory({ sessionId, currentContent, onRestore }) {
  const [versions, setVersions] = useState(() => store.getDraftVersions(sessionId));
  const [compare, setCompare] = useState(null); // { a, b }
  const [pickA, setPickA] = useState(null);

  useEffect(() => {
    const unsub = store.subscribe(({ name }) => {
      if (name === "draftVersions") setVersions(store.getDraftVersions(sessionId));
    });
    return unsub;
  }, [sessionId]);

  useEffect(() => {
    setVersions(store.getDraftVersions(sessionId));
  }, [sessionId, currentContent]);

  const handleCompareClick = (v) => {
    if (!pickA) {
      setPickA(v);
    } else if (pickA.id === v.id) {
      setPickA(null);
    } else {
      setCompare({ a: pickA, b: v });
      setPickA(null);
    }
  };

  return (
    <div style={ui.card}>
      <div style={ui.cardHeader}>
        <span style={ui.cardTitle}>Version History</span>
        <span style={{ fontSize: "0.72rem", color: theme.textMuted, fontFamily: theme.font }}>{versions.length} saved</span>
      </div>

      <div style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "8px", maxHeight: 260, overflowY: "auto" }}>
        {versions.length === 0 ? (
          <p style={{ color: theme.textMuted, fontSize: "0.8rem", fontFamily: theme.font, margin: 0 }}>
            No versions yet. Generate or edit the draft to create one.
          </p>
        ) : (
          <>
            {pickA && (
              <div style={{ fontSize: "0.72rem", color: theme.accent, fontFamily: theme.font }}>
                Comparing from “{pickA.label}” — pick a second version…
              </div>
            )}
            {versions.map((v) => {
              const isCurrent = v.content === currentContent;
              return (
                <div
                  key={v.id}
                  style={{
                    background: isCurrent ? theme.accentSoft : theme.surfaceAlt,
                    border: `1px solid ${isCurrent ? theme.accent : theme.border}`,
                    borderRadius: "8px",
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.8rem", color: theme.text, fontFamily: theme.font, fontWeight: 600 }}>
                        {v.label} {isCurrent && <span style={{ color: theme.accent, fontSize: "0.66rem" }}>(current)</span>}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: theme.textMuted, fontFamily: theme.font }}>
                        {v.source === "edited" ? "Manual edit" : "Generated"} · {fmt(v.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button
                      onClick={() => onRestore?.(v)}
                      disabled={isCurrent}
                      style={{ ...ui.ghostBtn, padding: "3px 10px", fontSize: "0.7rem", opacity: isCurrent ? 0.5 : 1 }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleCompareClick(v)}
                      style={{
                        ...ui.ghostBtn,
                        padding: "3px 10px",
                        fontSize: "0.7rem",
                        borderColor: pickA?.id === v.id ? theme.accent : theme.border,
                        color: pickA?.id === v.id ? theme.accent : theme.text,
                      }}
                    >
                      {pickA?.id === v.id ? "Selected" : "Compare"}
                    </button>
                    <button
                      onClick={() => store.removeDraftVersion(sessionId, v.id)}
                      style={{ ...ui.ghostBtn, padding: "3px 10px", fontSize: "0.7rem", color: theme.danger, borderColor: theme.danger }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {compare && (
        <div
          onClick={() => setCompare(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(10,10,20,0.75)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: theme.radiusLg,
              width: "min(1000px, 95vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            <div style={{ ...ui.cardHeader }}>
              <span style={ui.cardTitle}>Compare versions</span>
              <button onClick={() => setCompare(null)} style={{ ...ui.ghostBtn, padding: "2px 10px" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, overflow: "hidden", flex: 1 }}>
              {[compare.a, compare.b].map((v, i) => (
                <div key={i} style={{ padding: 16, overflowY: "auto", borderLeft: i === 1 ? `1px solid ${theme.border}` : "none" }}>
                  <div style={{ fontSize: "0.74rem", fontWeight: 700, color: theme.accent, fontFamily: theme.font, marginBottom: 8 }}>
                    {v.label} · {fmt(v.timestamp)}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem", color: theme.text, fontFamily: theme.font, lineHeight: 1.6 }}>
                    {v.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
