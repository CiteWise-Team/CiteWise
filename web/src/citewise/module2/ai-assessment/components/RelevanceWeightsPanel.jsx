// module2/ai-assessment/components/RelevanceWeightsPanel.jsx
//
// Req 8: Relevance score customization. The user controls how much each
// component counts toward the overall relevance score and can disable
// components entirely (e.g. score on citations only). Choices persist per
// session and drive the recomputed overall score + synthesis tiering.

import { useEffect, useState } from "react";
import theme, { ui } from "../../../theme";
import * as store from "../../../lib/citewiseStore";

export default function RelevanceWeightsPanel({ sessionId }) {
  const [prefs, setPrefs] = useState(() => store.getScorePrefs(sessionId));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setPrefs(store.getScorePrefs(sessionId));
  }, [sessionId]);

  const persist = (next) => {
    setPrefs(next);
    store.setScorePrefs(sessionId, next);
  };

  const setWeight = (key, value) => {
    persist({ ...prefs, weights: { ...prefs.weights, [key]: Number(value) / 100 } });
  };

  const toggleEnabled = (key) => {
    persist({ ...prefs, enabled: { ...prefs.enabled, [key]: !prefs.enabled[key] } });
  };

  const reset = () => persist(store.getScorePrefs("__defaults__never__"));

  // Normalised display (weights of enabled components sum to 100%).
  const enabledTotal = store.SCORE_COMPONENTS.reduce(
    (sum, c) => sum + (prefs.enabled[c.key] ? Number(prefs.weights[c.key]) || 0 : 0),
    0
  );

  return (
    <div style={ui.card}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ ...ui.cardHeader, width: "100%", background: theme.surfaceAlt, border: "none", cursor: "pointer" }}
      >
        <span style={ui.cardTitle}>Relevance Scoring</span>
        <span style={{ color: theme.textMuted, fontFamily: theme.font, fontSize: "0.78rem" }}>
          {open ? "Hide ▲" : "Customize ▼"}
        </span>
      </button>

      {open && (
        <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ margin: 0, fontSize: "0.76rem", color: theme.textMuted, fontFamily: theme.font, lineHeight: 1.5 }}>
            Choose which components count and how much. A source is never auto-discarded for a low overall score if you weight a section you care about.
          </p>

          {store.SCORE_COMPONENTS.map(({ key, label }) => {
            const enabled = prefs.enabled[key];
            const pct = Math.round((Number(prefs.weights[key]) || 0) * 100);
            const share = enabled && enabledTotal > 0 ? Math.round(((Number(prefs.weights[key]) || 0) / enabledTotal) * 100) : 0;
            return (
              <div key={key} style={{ opacity: enabled ? 1 : 0.5 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: theme.font, fontSize: "0.82rem", color: theme.text }}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleEnabled(key)}
                      style={{ width: 15, height: 15, accentColor: theme.accent, cursor: "pointer" }}
                    />
                    {label}
                  </label>
                  <span style={{ fontFamily: theme.font, fontSize: "0.74rem", color: theme.accent, fontWeight: 700 }}>
                    {enabled ? `${share}%` : "off"}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pct}
                  disabled={!enabled}
                  onChange={(e) => setWeight(key, e.target.value)}
                  style={{ width: "100%", accentColor: theme.accent, marginTop: 4 }}
                />
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reset} style={{ ...ui.ghostBtn, padding: "5px 12px", fontSize: "0.74rem" }}>
              Reset to defaults
            </button>
          </div>
          <p style={{ margin: 0, fontSize: "0.7rem", color: theme.textFaint, fontFamily: theme.font }}>
            Applies to the overall score, the synthesis tiering, and the “How your sources are used” view.
          </p>
        </div>
      )}
    </div>
  );
}
