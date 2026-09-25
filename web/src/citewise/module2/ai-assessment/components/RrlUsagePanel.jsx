// module2/ai-assessment/components/RrlUsagePanel.jsx
//
// Req 4: RRL selection & utilization control. For the active document the user
// decides HOW it should contribute to the introduction (its tier) and marks the
// specific excerpts that are eye-catching / most relevant. These choices flow
// straight into the synthesis payload.

import { useEffect, useState } from "react";
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
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "15px", color: "#f97316" }}>
          How this source should be used
        </span>
      </div>

      <p style={{ margin: "0 0 10px", fontSize: "0.78rem", color: "#6b7280", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5 }}>
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
                background: active ? "#f97316" : "#ffffff",
                color: active ? "#ffffff" : "#374151",
                border: `1px solid ${active ? "#f97316" : "#e5e7eb"}`,
                borderRadius: "999px",
                padding: "5px 12px",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.76rem",
                fontWeight: 600,
                transition: "all 0.2s ease",
                boxShadow: active ? "0 2px 6px rgba(249, 115, 22, 0.25)" : "none",
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
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#6b7280",
              fontFamily: "'Poppins', sans-serif",
              marginBottom: 8,
            }}
          >
            Mark eye-catching excerpts
          </div>
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
                    background: on ? "#fff7ef" : "#ffffff",
                    border: `1px solid ${on ? "#f97316" : "#e5e7eb"}`,
                    borderRadius: "8px",
                    padding: "8px 10px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleExcerpt(idx)}
                    style={{ marginTop: 2, width: 15, height: 15, accentColor: "#f97316", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.78rem", color: "#1f2937", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5, fontStyle: "italic" }}>
                    "{quote.length > 160 ? quote.slice(0, 160) + "…" : quote}"
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Highlights */}
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#6b7280",
            fontFamily: "'Poppins', sans-serif",
            marginBottom: 8,
          }}
        >
          Custom Highlights
        </div>
        <p style={{ margin: "0 0 10px", fontSize: "0.74rem", color: "#6b7280", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5 }}>
          Paste or type any specific text from the PDF you want the AI to emphasize.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <textarea
            value={customHighlightText}
            onChange={(e) => setCustomHighlightText(e.target.value)}
            placeholder="Paste highlight here..."
            style={{
              flex: 1,
              minHeight: 60,
              resize: "vertical",
              fontSize: "0.78rem",
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              color: "#111827",
              padding: "0.6rem 0.75rem",
              fontFamily: "'Poppins', sans-serif",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#f97316";
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(249, 115, 22, 0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <button
            onClick={() => {
              if (customHighlightText.trim()) {
                setUsage(store.addCustomExcerpt(sessionId, documentId, customHighlightText.trim()));
                setCustomHighlightText("");
              }
            }}
            disabled={!customHighlightText.trim()}
            style={{
              padding: "6px 12px",
              fontSize: "0.76rem",
              background: customHighlightText.trim() ? "#f97316" : "#f3f4f6",
              color: customHighlightText.trim() ? "#ffffff" : "#9ca3af",
              border: "none",
              borderRadius: "8px",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              cursor: customHighlightText.trim() ? "pointer" : "not-allowed",
              transition: "all 0.2s ease",
              boxShadow: customHighlightText.trim() ? "0 2px 6px rgba(249, 115, 22, 0.25)" : "none",
            }}
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
                  background: "#fff7ef",
                  border: "1px solid #fed7aa",
                  borderRadius: "8px",
                  padding: "8px 10px",
                }}
              >
                <span style={{ flex: 1, fontSize: "0.78rem", color: "#1f2937", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5, fontStyle: "italic" }}>
                  "{text}"
                </span>
                <button
                  onClick={() => setUsage(store.removeCustomExcerpt(sessionId, documentId, idx))}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#dc2626",
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