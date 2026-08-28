// module3/synthesis-draft/components/InstructionsPanel.jsx
//
// Req 3: User-guided AI processing. Lets the user tell the AI how to write the
// introduction before generating — which findings to emphasise, what to include
// or avoid, etc. Stored per-session and sent to the synthesis backend.

import { useEffect, useState } from "react";
import theme, { ui } from "../../../theme";
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
    <div style={ui.card}>
      <div 
        style={{ ...ui.cardHeader, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={ui.cardTitle}>Guide the AI</span>
        {isOpen ? <ChevronDown size={18} color={theme.accent} /> : <ChevronRight size={18} color={theme.textMuted} />}
      </div>
      
      {isOpen && (
        <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ margin: 0, fontSize: "0.78rem", color: theme.textMuted, fontFamily: theme.font, lineHeight: 1.5 }}>
          Tell the AI how to write the introduction. These instructions are followed during generation.
        </p>
        <textarea
          value={text}
          onChange={(e) => update(e.target.value)}
          rows={4}
          placeholder="e.g. Mention the data-scarcity finding in the first paragraph; do not include cost figures."
          style={{ ...ui.input, resize: "vertical" }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => appendPreset(p)}
              style={{
                ...ui.ghostBtn,
                padding: "4px 10px",
                fontSize: "0.72rem",
                color: theme.textMuted,
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
            style={{ ...ui.ghostBtn, alignSelf: "flex-start", padding: "4px 10px", fontSize: "0.72rem", color: theme.danger, borderColor: theme.danger }}
          >
            Clear instructions
          </button>
        )}
      </div>
      )}
    </div>
  );
}
