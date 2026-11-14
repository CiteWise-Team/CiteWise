// module2/ai-assessment/components/RrlUsagePanel.jsx
//
// Req 4: RRL selection & utilization control. For the active document the user
// decides HOW it should contribute to the introduction (its tier) and marks the
// specific excerpts that are eye-catching / most relevant. These choices flow
// straight into the synthesis payload.

import { useEffect, useState, useRef } from "react";
import * as store from "../../../lib/citewiseStore";
import { useTheme } from "../../../../context/ThemeContext";

export default function RrlUsagePanel({ sessionId, documentId, excerpts = [] }) {
  const { isDark } = useTheme();
  const [usage, setUsage] = useState(() => store.getRrlUsageFor(sessionId, documentId));
  const [customHighlightText, setCustomHighlightText] = useState("");
  const highlightInputRef = useRef(null);

  const handleAddHighlight = () => {
    if (customHighlightText.trim()) {
      setUsage(store.addCustomExcerpt(sessionId, documentId, customHighlightText.trim()));
      setCustomHighlightText("");
      if (highlightInputRef.current) {
        highlightInputRef.current.style.height = "38px";
      }
    }
  };

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
        background: isDark ? "#171624" : "#f9fafb",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "15px", color: "#ea580c" }}>
          How this source should be used
        </span>
      </div>

      <p style={{ margin: "0 0 10px", fontSize: "0.78rem", color: isDark ? "#cbd5e1" : "#6b7280", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5 }}>
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
              className={`cw-usage-toggle-btn ${active ? "is-active" : "is-inactive"}`}
              style={{
                background: active ? "#ea580c" : (isDark ? "#1f1d2e" : "#ffffff"),
                color: active ? "#ffffff" : (isDark ? "#cbd5e1" : "#374151"),
                border: `1px solid ${active ? "#ea580c" : (isDark ? "rgba(255, 255, 255, 0.15)" : "#e5e7eb")}`,
                borderRadius: "8px",
                padding: "6px 14px",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.78rem",
                fontWeight: 600,
                transition: "all 180ms ease",
                boxShadow: active ? "0 2px 8px rgba(234, 88, 12, 0.22)" : "0 1px 2px rgba(0, 0, 0, 0.04)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                if (active) {
                  e.currentTarget.style.background = "#c2410c";
                  e.currentTarget.style.borderColor = "#c2410c";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
                } else {
                  e.currentTarget.style.borderColor = "#ea580c";
                  e.currentTarget.style.color = "#ea580c";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(234, 88, 12, 0.15)";
                  if (isDark) {
                    e.currentTarget.style.background = "rgba(234, 88, 12, 0.12)";
                  }
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                if (active) {
                  e.currentTarget.style.background = "#ea580c";
                  e.currentTarget.style.borderColor = "#ea580c";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.22)";
                } else {
                  e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.15)" : "#e5e7eb";
                  e.currentTarget.style.color = isDark ? "#cbd5e1" : "#374151";
                  e.currentTarget.style.background = isDark ? "#1f1d2e" : "#ffffff";
                  e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.04)";
                }
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = active
                  ? "0 2px 6px rgba(234, 88, 12, 0.2)"
                  : "0 1px 2px rgba(0, 0, 0, 0.06)";
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
              color: isDark ? "#94a3b8" : "#6b7280",
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
                    background: on
                      ? (isDark ? "rgba(234, 88, 12, 0.18)" : "#fff7ef")
                      : (isDark ? "#1a1928" : "#ffffff"),
                    border: `1px solid ${on ? "#ea580c" : (isDark ? "rgba(255, 255, 255, 0.1)" : "#e5e7eb")}`,
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
                    style={{ marginTop: 2, width: 15, height: 15, accentColor: "#ea580c", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.78rem", color: isDark ? "#e2e8f0" : "#1f2937", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5, fontStyle: "italic" }}>
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
            color: isDark ? "#94a3b8" : "#6b7280",
            fontFamily: "'Poppins', sans-serif",
            marginBottom: 8,
          }}
        >
          Custom Highlights
        </div>
        <p style={{ margin: "0 0 10px", fontSize: "0.74rem", color: isDark ? "#94a3b8" : "#6b7280", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5 }}>
          Paste or type any specific text from the PDF you want the AI to emphasize.
        </p>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <textarea
            ref={highlightInputRef}
            value={customHighlightText}
            onChange={(e) => {
              setCustomHighlightText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 38), 180)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddHighlight();
              }
            }}
            placeholder="Paste or type any specific highlight here…"
            rows={1}
            style={{
              flex: 1,
              minHeight: "38px",
              height: "38px",
              maxHeight: "180px",
              background: isDark ? "#100f18" : "#ffffff",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #e5e7eb",
              borderRadius: "8px",
              color: isDark ? "#f9fafb" : "#111827",
              padding: "0.5rem 0.85rem",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.85rem",
              lineHeight: 1.45,
              resize: "none",
              overflowY: "auto",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#ea580c";
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(234, 88, 12, 0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.15)" : "#e5e7eb";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <button
            onClick={handleAddHighlight}
            disabled={!customHighlightText.trim()}
            style={{
              background: customHighlightText.trim() ? "#ea580c" : (isDark ? "rgba(255, 255, 255, 0.06)" : "#f3f4f6"),
              color: customHighlightText.trim() ? "#ffffff" : (isDark ? "#6b7280" : "#9ca3af"),
              border: `1px solid ${customHighlightText.trim() ? "#ea580c" : (isDark ? "rgba(255, 255, 255, 0.1)" : "#e5e7eb")}`,
              borderRadius: "8px",
              padding: "0 18px",
              height: "38px",
              cursor: customHighlightText.trim() ? "pointer" : "not-allowed",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.82rem",
              fontWeight: 700,
              flexShrink: 0,
              transition: "all 180ms ease",
              boxShadow: customHighlightText.trim() ? "0 2px 8px rgba(234, 88, 12, 0.22)" : "none",
            }}
            onMouseEnter={(e) => {
              if (customHighlightText.trim()) {
                e.currentTarget.style.background = "#c2410c";
                e.currentTarget.style.borderColor = "#c2410c";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
              }
            }}
            onMouseLeave={(e) => {
              if (customHighlightText.trim()) {
                e.currentTarget.style.background = "#ea580c";
                e.currentTarget.style.borderColor = "#ea580c";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.22)";
              }
            }}
            onMouseDown={(e) => {
              if (customHighlightText.trim()) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 6px rgba(234, 88, 12, 0.2)";
              }
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
                  background: isDark ? "rgba(249, 115, 22, 0.12)" : "#fff7ef",
                  border: isDark ? "1px solid rgba(249, 115, 22, 0.3)" : "1px solid #fed7aa",
                  borderRadius: "8px",
                  padding: "8px 10px",
                }}
              >
                <span style={{ flex: 1, fontSize: "0.78rem", color: isDark ? "#fed7aa" : "#1f2937", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5, fontStyle: "italic" }}>
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