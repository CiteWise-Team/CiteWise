// module3/synthesis-draft/components/InstructionsPanel.jsx
//
// Req 3: User-guided AI processing. Lets the user tell the AI how to write the
// introduction before generating — which findings to emphasise, what to include
// or avoid, etc. Stored per-session and sent to the synthesis backend.

import { useEffect, useRef, useState } from "react";
import * as store from "../../../lib/citewiseStore";
import { 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Wand2, 
  Lightbulb, 
  RotateCcw, 
  Plus, 
  Check 
} from "lucide-react";
import { useTheme } from "../../../../context/ThemeContext";

const PRESETS = [
  {
    title: "Technical Limitations",
    text: "Focus on the technological limitations discussed in the core sources.",
  },
  {
    title: "Evidence-First",
    text: "Use the highlighted excerpts as the main supporting evidence.",
  },
  {
    title: "Gap-First Flow",
    text: "Open the introduction with the selected research gap, then narrow to specifics.",
  },
  {
    title: "Formal Academic Tone",
    text: "Keep the tone formal and avoid overstating the findings.",
  },
  {
    title: "Methodology Comparison",
    text: "Compare and contrast methodologies across the reviewed papers.",
  },
];

export default function InstructionsPanel({ sessionId }) {
  const { isDark } = useTheme();
  const [text, setText] = useState(() => store.getInstructions(sessionId) || "");
  const [isOpen, setIsOpen] = useState(false);
  const textareaRef = useRef(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(68, el.scrollHeight)}px`;
  };

  useEffect(() => {
    setText(store.getInstructions(sessionId) || "");
  }, [sessionId]);

  useEffect(() => {
    if (isOpen) {
      adjustHeight();
    }
  }, [text, isOpen]);

  const update = (val) => {
    setText(val);
    store.setInstructions(sessionId, val);
  };

  const togglePreset = (pText) => {
    if (text.includes(pText)) {
      // Remove it and clean up excess whitespace
      const next = text
        .replace(pText, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      update(next);
    } else {
      const next = text.trim() ? `${text.trim()} ${pText}` : pText;
      update(next);
    }
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const hasDirectives = Boolean(text.trim());

  return (
    <div
      style={{
        background: "var(--cw-bg-surface, #ffffff)",
        border: "1px solid var(--cw-border, #e5e7eb)",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: isDark ? "0 4px 20px rgba(0, 0, 0, 0.35)" : "0 4px 16px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div 
        className="workflow-card-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
          padding: "1.125rem 1.5rem",
          background: isDark ? "var(--cw-bg-surface-elevated, #1e2638)" : "var(--cw-bg-surface-elevated, #f9fafb)",
          borderBottom: isOpen ? "1px solid var(--cw-border, #e5e7eb)" : "none",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  color: isDark ? "#f9fafb" : "var(--cw-text-primary, #0f0e17)",
                  letterSpacing: "0.01em",
                }}
              >
                Guide the AI
              </span>
              {hasDirectives && (
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: isDark ? "rgba(249, 115, 22, 0.2)" : "rgba(249, 115, 22, 0.12)",
                    color: "#f97316",
                    border: "1px solid rgba(249, 115, 22, 0.3)",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Directives Active
                </span>
              )}
            </div>
          </div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", color: isDark ? "#9ca3af" : "var(--cw-text-muted, #6b7280)" }}>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </div>
      
      {isOpen && (
        <div style={{ padding: "1.125rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Main Directives Textarea Card */}
          <div
            style={{
              background: isDark ? "rgba(255, 255, 255, 0.02)" : "#fafafa",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.09)" : "1px solid #e5e7eb",
              borderRadius: "12px",
              overflow: "hidden",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            {/* Directives Header Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.07)" : "1px solid #f1f5f9",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={13} style={{ color: "#f97316" }} />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    fontFamily: "'Poppins', sans-serif",
                    color: isDark ? "#e2e8f0" : "#334155",
                  }}
                >
                  Generation Directives
                </span>
              </div>
              {hasDirectives && (
                <button
                  type="button"
                  onClick={() => update("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: isDark ? "#f87171" : "#dc2626",
                    fontSize: "0.72rem",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  title="Clear all directives"
                >
                  <RotateCcw size={11} /> Clear
                </button>
              )}
            </div>

            {/* Textarea with automatic height expanding */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                update(e.target.value);
                adjustHeight();
              }}
              rows={2}
              placeholder="e.g., Emphasize recent machine-learning benchmarks in paragraph 2; contrast methodological limitations; keep tone formal and objective..."
              style={{
                width: "100%",
                background: "transparent",
                color: isDark ? "#f9fafb" : "#111827",
                border: "none",
                padding: "10px 12px",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.84rem",
                lineHeight: 1.6,
                resize: "none",
                overflowY: "hidden",
                outline: "none",
                boxSizing: "border-box",
                minHeight: "68px",
              }}
            />

            {/* Bottom Bar / Counters */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: "6px 12px",
                borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid #f8fafc",
                fontSize: "0.7rem",
                color: isDark ? "#64748b" : "#94a3b8",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              <span>{wordCount} words · {text.length} chars</span>
            </div>
          </div>

          {/* Quick Directives / Presets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Wand2 size={13} style={{ color: "#f97316" }} />
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  fontFamily: "'Poppins', sans-serif",
                  color: isDark ? "#cbd5e1" : "#475569",
                  letterSpacing: "0.02em",
                }}
              >
                Quick Directives
              </span>
              <span style={{ fontSize: "0.68rem", color: isDark ? "#64748b" : "#94a3b8", fontFamily: "'Poppins', sans-serif" }}>
                (click to toggle)
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {PRESETS.map((p, i) => {
                const isActive = text.includes(p.text);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => togglePreset(p.text)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      background: isActive
                        ? (isDark ? "rgba(249, 115, 22, 0.18)" : "#fff7ed")
                        : (isDark ? "rgba(255, 255, 255, 0.04)" : "#ffffff"),
                      color: isActive
                        ? "#ea580c"
                        : (isDark ? "#cbd5e1" : "#475569"),
                      border: isActive
                        ? "1px solid #f97316"
                        : (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0"),
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "0.74rem",
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: isActive ? 600 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: isActive ? "0 2px 8px rgba(249, 115, 22, 0.15)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.08)" : "#f8fafc";
                        e.currentTarget.style.borderColor = "#f97316";
                        e.currentTarget.style.color = "#f97316";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.04)" : "#ffffff";
                        e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0";
                        e.currentTarget.style.color = isDark ? "#cbd5e1" : "#475569";
                      }
                    }}
                    title={p.text}
                  >
                    {isActive ? <Check size={12} color="#ea580c" /> : <Plus size={12} />}
                    <span>{p.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modern Tips Callout */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "8px",
              background: isDark ? "rgba(249, 115, 22, 0.08)" : "#fffbf5",
              border: isDark ? "1px solid rgba(249, 115, 22, 0.2)" : "1px solid #fed7aa",
            }}
          >
            <Lightbulb size={14} style={{ color: "#f97316", flexShrink: 0, marginTop: "2px" }} />
            <span
              style={{
                fontSize: "0.72rem",
                color: isDark ? "#cbd5e1" : "#7c2d12",
                fontFamily: "'Poppins', sans-serif",
                lineHeight: 1.45,
              }}
            >
              Directives directly shape the synthesis generation prompt alongside your approved sources and relevance tiers.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}