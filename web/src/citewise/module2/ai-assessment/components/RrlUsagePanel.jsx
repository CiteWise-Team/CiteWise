// module2/ai-assessment/components/RrlUsagePanel.jsx
//
// Req 4: RRL selection & utilization control. For the active document the user
// decides HOW it should contribute to the introduction (its tier) and marks the
// specific excerpts that are eye-catching / most relevant. These choices flow
// straight into the synthesis payload.

import { useEffect, useState } from "react";
import theme, { ui } from "../../../theme";
import * as store from "../../../lib/citewiseStore";

export default function RrlUsagePanel({ sessionId, documentId, excerpts = [] }) {
  const [usage, setUsage] = useState(() => store.getRrlUsageFor(sessionId, documentId));
  const [customHighlightText, setCustomHighlightText] = useState("");

  useEffect(() => {
    setUsage(store.getRrlUsageFor(sessionId, documentId));
  }, [sessionId, documentId]);

  useEffect(() => {
    const unsub = store.subscribe(({ name }) => {
      if (name === "rrlUsage") setUsage(store.getRrlUsageFor(sessionId, documentId));
    });
    return unsub;
  }, [sessionId, documentId]);

  if (!documentId) return null;

  const setUsageChoice = (key) => {
    setUsage(store.setRrlUsageFor(sessionId, documentId, { usage: key }));
  };

  const toggleExcerpt = (idx) => {
    setUsage(store.toggleEmphasizedExcerpt(sessionId, documentId, idx));
  };

  const emphasized = new Set(usage.emphasizedExcerpts || []);

  return (
    <div
      style={{
        marginTop: "24px",
        background: theme.surfaceAlt,
        border: `1px solid ${theme.border}`,
        borderRadius: "12px",
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: theme.font, fontWeight: 700, fontSize: "15px", color: theme.accent }}>
          How this source should be used
        </span>
      </div>

      <p style={{ margin: "0 0 10px", fontSize: "0.78rem", color: theme.textMuted, fontFamily: theme.font, lineHeight: 1.5 }}>
        Override the AI's relevance tier and tell the synthesizer how to weigh this RRL.
      </p>

      {/* Usage tier selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: excerpts.length ? 16 : 0 }}>
        {store.RRL_USAGE_OPTIONS.map((opt) => {
          const active = usage.usage === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setUsageChoice(opt.key)}
              style={{
                background: active ? theme.accent : "transparent",
                color: active ? "#fff" : theme.text,
                border: `1px solid ${active ? theme.accent : theme.border}`,
                borderRadius: "999px",
                padding: "5px 12px",
                cursor: "pointer",
                fontFamily: theme.font,
                fontSize: "0.76rem",
                fontWeight: 600,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Emphasize specific excerpts */}
      {excerpts.length > 0 && (
        <div>
          <div style={{ ...ui.label, marginBottom: 8 }}>Mark eye-catching excerpts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
            {excerpts.map((ex, idx) => {
              const on = emphasized.has(idx);
              const quote = ex.quoteText || ex.quote || "";
              return (
                <label
                  key={idx}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                    background: on ? theme.accentSoft : "transparent",
                    border: `1px solid ${on ? theme.accent : theme.border}`,
                    borderRadius: "8px",
                    padding: "8px 10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleExcerpt(idx)}
                    style={{ marginTop: 2, width: 15, height: 15, accentColor: theme.accent, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.78rem", color: theme.text, fontFamily: theme.font, lineHeight: 1.5, fontStyle: "italic" }}>
                    “{quote.length > 160 ? quote.slice(0, 160) + "…" : quote}”
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Highlights */}
      <div style={{ marginTop: 16 }}>
        <div style={{ ...ui.label, marginBottom: 8 }}>Custom Highlights</div>
        <p style={{ margin: "0 0 10px", fontSize: "0.74rem", color: theme.textMuted, fontFamily: theme.font, lineHeight: 1.5 }}>
          Paste or type any specific text from the PDF you want the AI to emphasize.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <textarea
            value={customHighlightText}
            onChange={(e) => setCustomHighlightText(e.target.value)}
            placeholder="Paste highlight here..."
            style={{ ...ui.input, flex: 1, minHeight: 60, resize: "vertical", fontSize: "0.78rem" }}
          />
          <button
            onClick={() => {
              if (customHighlightText.trim()) {
                setUsage(store.addCustomExcerpt(sessionId, documentId, customHighlightText.trim()));
                setCustomHighlightText("");
              }
            }}
            style={{ ...ui.primaryBtn, padding: "6px 12px", fontSize: "0.76rem" }}
            disabled={!customHighlightText.trim()}
          >
            Add
          </button>
        </div>
        
        {usage.customExcerpts && usage.customExcerpts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            {usage.customExcerpts.map((text, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  background: theme.accentSoft,
                  border: `1px solid ${theme.accent}`,
                  borderRadius: "8px",
                  padding: "8px 10px",
                }}
              >
                <span style={{ flex: 1, fontSize: "0.78rem", color: theme.text, fontFamily: theme.font, lineHeight: 1.5, fontStyle: "italic" }}>
                  “{text}”
                </span>
                <button
                  onClick={() => setUsage(store.removeCustomExcerpt(sessionId, documentId, idx))}
                  style={{
                    background: "none",
                    border: "none",
                    color: theme.danger,
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    padding: "0 4px",
                  }}
                  title="Remove highlight"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
