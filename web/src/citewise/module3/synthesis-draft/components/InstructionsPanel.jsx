// module3/synthesis-draft/components/InstructionsPanel.jsx
//
// Req 3: User-guided AI processing. Lets the user tell the AI how to write the
// introduction before generating — which findings to emphasise, what to include
// or avoid, etc. Stored per-session and sent to the synthesis backend.

import { useEffect, useState } from "react";
import * as store from "../../../lib/citewiseStore";
import { ChevronDown, ChevronRight } from "lucide-react";

const PRESETS = [
  "Focus on the technological limitations discussed in the core sources.",
  "Use the highlighted excerpts as the main supporting evidence.",
  "Open the introduction with the selected research gap, then narrow to specifics.",
  "Keep the tone formal and avoid overstating the findings.",
];

export default function InstructionsPanel({ sessionId }) {
  const [text, setText] = useState(() => store.getInstructions(sessionId));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setText(store.getInstructions(sessionId));
  }, [sessionId]);

  const update = (val) => {
    setText(val);
    store.setInstructions(sessionId, val);
  };

  const appendPreset = (p) => {
    const next = text ? `${text.trim()} ${p}` : p;
    update(next);
  };

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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
          padding: "1.125rem 1.5rem",
          background: "#f9fafb",
          borderBottom: isOpen ? "1px solid #e5e7eb" : "none",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: "1.05rem",
            color: "#f97316",
            letterSpacing: "0.01em",
          }}
        >
          Guide the AI
        </span>
        {isOpen ? <ChevronDown size={18} color="#f97316" /> : <ChevronRight size={18} color="#9ca3af" />}
      </div>
      
      {isOpen && (
        <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b7280", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5 }}>
            Tell the AI how to write the introduction. These instructions are followed during generation.
          </p>
          <textarea
            value={text}
            onChange={(e) => update(e.target.value)}
            rows={4}
            placeholder="e.g. Mention the data-scarcity finding in the first paragraph; do not include cost figures."
            style={{
              width: "100%",
              background: "#ffffff",
              color: "#111827",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "0.6rem 0.75rem",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.85rem",
              lineHeight: 1.5,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => appendPreset(p)}
                style={{
                  background: "transparent",
                  color: "#6b7280",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "0.72rem",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#fff7ef";
                  e.currentTarget.style.borderColor = "#f97316";
                  e.currentTarget.style.color = "#f97316";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.color = "#6b7280";
                }}
                title="Add this instruction"
              >
                + {p.length > 38 ? p.slice(0, 38) + "…" : p}
              </button>
            ))}
          </div>
          {text && (
            <button
              onClick={() => update("")}
              style={{
                alignSelf: "flex-start",
                background: "transparent",
                color: "#dc2626",
                border: "1px solid rgba(220, 38, 38, 0.4)",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "0.72rem",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(220, 38, 38, 0.08)";
                e.currentTarget.style.borderColor = "#dc2626";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.4)";
              }}
            >
              Clear instructions
            </button>
          )}
        </div>
      )}
    </div>
  );
}