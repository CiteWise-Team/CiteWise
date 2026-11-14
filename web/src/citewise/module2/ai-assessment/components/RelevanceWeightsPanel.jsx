// module2/ai-assessment/components/RelevanceWeightsPanel.jsx
//
// Req 8: Relevance score customization. The user controls how much each
// component counts toward the overall relevance score and can disable
// components entirely (e.g. score on citations only). Choices persist per
// session and drive the recomputed overall score + synthesis tiering.

import { useEffect, useState } from "react";
import * as store from "../../../lib/citewiseStore";

/**
 * Distribute an integer amount `total` among items according to their weights.
 * Uses the Largest Remainder Method (Hamilton method) to guarantee the output
 * integers sum EXACTLY to `total` with zero rounding discrepancy.
 */
function distributeInteger(total, items) {
  if (!items || items.length === 0) return {};
  if (total <= 0) {
    const res = {};
    for (const item of items) res[item.key] = 0;
    return res;
  }

  const weightSum = items.reduce((s, it) => s + (it.weight > 0 ? it.weight : 0), 0);

  if (weightSum <= 0) {
    const base = Math.floor(total / items.length);
    let remainder = total % items.length;
    const res = {};
    for (const item of items) {
      res[item.key] = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
    }
    return res;
  }

  const mapped = items.map((item) => {
    const raw = (Math.max(0, item.weight) / weightSum) * total;
    const floor = Math.floor(raw);
    return {
      key: item.key,
      floor,
      frac: raw - floor,
    };
  });

  const allocated = mapped.reduce((s, it) => s + it.floor, 0);
  const remainder = total - allocated;

  const sorted = [...mapped].sort((a, b) => b.frac - a.frac);
  const bonusKeys = new Set(sorted.slice(0, remainder).map((it) => it.key));

  const result = {};
  for (const it of mapped) {
    result[it.key] = it.floor + (bonusKeys.has(it.key) ? 1 : 0);
  }
  return result;
}

function normalizeWeights(weights, enabled) {
  if (!weights || !enabled) return weights;
  const enabledKeys = store.SCORE_COMPONENTS.filter((c) => enabled[c.key]).map((c) => c.key);
  if (enabledKeys.length === 0) return { ...weights };
  const items = enabledKeys.map((k) => ({
    key: k,
    weight: Math.max(0, Math.round((Number(weights[k]) || 0) * 100)),
  }));
  const allocated = distributeInteger(100, items);
  const nextWeights = { ...weights };
  for (const { key } of store.SCORE_COMPONENTS) {
    if (enabled[key]) {
      nextWeights[key] = (allocated[key] ?? 0) / 100;
    } else {
      nextWeights[key] = 0;
    }
  }
  return nextWeights;
}

export default function RelevanceWeightsPanel({ sessionId }) {
  const [prefs, setPrefs] = useState(() => {
    const initial = store.getScorePrefs(sessionId);
    return { ...initial, weights: normalizeWeights(initial.weights, initial.enabled) };
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loaded = store.getScorePrefs(sessionId);
    const normalized = normalizeWeights(loaded.weights, loaded.enabled);
    setPrefs({ ...loaded, weights: normalized });
  }, [sessionId]);

  const persist = (next) => {
    setPrefs(next);
    store.setScorePrefs(sessionId, next);
  };

  const rebalanceWeights = (targetKey, rawValue) => {
    if (!prefs.enabled[targetKey]) return;

    const enabledKeys = store.SCORE_COMPONENTS.filter((c) => prefs.enabled[c.key]).map((c) => c.key);
    if (enabledKeys.length <= 1) {
      const nextWeights = { ...prefs.weights, [targetKey]: 1.0 };
      persist({ ...prefs, weights: nextWeights });
      return;
    }

    const targetVal = Math.max(0, Math.min(100, Math.round(Number(rawValue) || 0)));
    const rem = 100 - targetVal;
    const otherKeys = enabledKeys.filter((k) => k !== targetKey);

    const items = otherKeys.map((k) => ({
      key: k,
      weight: Math.round((Number(prefs.weights[k]) || 0) * 100),
    }));

    const allocated = distributeInteger(rem, items);
    const nextWeights = { ...prefs.weights, [targetKey]: targetVal / 100 };
    for (const k of otherKeys) {
      nextWeights[k] = (allocated[k] || 0) / 100;
    }

    persist({ ...prefs, weights: nextWeights });
  };

  const toggleEnabled = (key) => {
    const nextEnabled = { ...prefs.enabled, [key]: !prefs.enabled[key] };
    const enabledKeys = store.SCORE_COMPONENTS.filter((c) => nextEnabled[c.key]).map((c) => c.key);
    const nextWeights = { ...prefs.weights };

    if (enabledKeys.length === 0) {
      for (const c of store.SCORE_COMPONENTS) {
        nextWeights[c.key] = 0;
      }
    } else if (!nextEnabled[key]) {
      nextWeights[key] = 0;
      const items = enabledKeys.map((k) => ({
        key: k,
        weight: Math.round((Number(prefs.weights[k]) || 0) * 100),
      }));
      const allocated = distributeInteger(100, items);
      for (const k of enabledKeys) {
        nextWeights[k] = (allocated[k] || 0) / 100;
      }
    } else {
      if (enabledKeys.length === 1) {
        nextWeights[key] = 1.0;
      } else {
        const defaultShare = Math.round((store.DEFAULT_WEIGHTS[key] || (1 / enabledKeys.length)) * 100);
        const targetPct = Math.min(defaultShare, Math.floor(100 / enabledKeys.length));
        const rem = 100 - targetPct;
        const otherKeys = enabledKeys.filter((k) => k !== key);
        const items = otherKeys.map((k) => ({
          key: k,
          weight: Math.round((Number(prefs.weights[k]) || 0) * 100),
        }));
        const allocated = distributeInteger(rem, items);
        nextWeights[key] = targetPct / 100;
        for (const k of otherKeys) {
          nextWeights[k] = (allocated[k] || 0) / 100;
        }
      }
    }

    persist({ ...prefs, enabled: nextEnabled, weights: nextWeights });
  };

  const reset = () => {
    const defaults = store.getScorePrefs("__defaults__never__");
    persist(defaults);
  };

  const totalPct = store.SCORE_COMPONENTS.reduce(
    (sum, c) => sum + (prefs.enabled[c.key] ? Math.round((Number(prefs.weights[c.key]) || 0) * 100) : 0),
    0
  );

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
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "#f9fafb",
          border: "none",
          borderBottom: open ? "1px solid #e5e7eb" : "none",
          cursor: "pointer",
          padding: "1.125rem 1.5rem",
          gap: "10px",
        }}
      >
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: "1.05rem",
            color: "#ea580c",
            letterSpacing: "0.01em",
          }}
        >
          Relevance Scoring
        </span>
        <span style={{ color: "#6b7280", fontFamily: "'Poppins', sans-serif", fontSize: "0.78rem", fontWeight: 600 }}>
          {open ? "Hide ▲" : "Customize ▼"}
        </span>
      </button>

      {open && (
        <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ margin: 0, fontSize: "0.76rem", color: "#6b7280", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5 }}>
            Choose which components count and how much. A source is never auto-discarded for a low overall score if you weight a section you care about.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {store.SCORE_COMPONENTS.map(({ key, label }) => {
              const enabled = prefs.enabled[key];
              const pct = enabled ? Math.round((Number(prefs.weights[key]) || 0) * 100) : 0;
              return (
                <div key={key} style={{ opacity: enabled ? 1 : 0.5, transition: "opacity 0.2s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "0.82rem",
                        color: "#111827",
                        fontWeight: 500,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleEnabled(key)}
                        style={{ width: 15, height: 15, accentColor: "#ea580c", cursor: "pointer" }}
                      />
                      {label}
                    </label>
                    <span
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "0.78rem",
                        color: enabled ? "#ea580c" : "#9ca3af",
                        fontWeight: 700,
                        minWidth: "40px",
                        textAlign: "right",
                      }}
                    >
                      {enabled ? `${pct}%` : "off"}
                    </span>
                  </div>
                  {/* Modern Slim Pill Slider Bar matching Reference */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      marginTop: 6,
                    }}
                  >
                    {/* The 7px Slim Pill Track (soft light/gray background) */}
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "7px",
                        borderRadius: "999px",
                        background: "#e5e7eb",
                        overflow: "hidden",
                        pointerEvents: "none",
                      }}
                    >
                      {/* Active Solid Orange Fill Bar */}
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: enabled ? "#ea580c" : "#cbd5e1",
                          borderRadius: "999px",
                          transition: "width 0.08s ease-out",
                        }}
                      />
                    </div>

                    {/* Interactive Slider Input with White Center & Orange Ring Knob */}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={pct}
                      disabled={!enabled}
                      onChange={(e) => rebalanceWeights(key, e.target.value)}
                      className="cw-relevance-slider"
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: "100%",
                        height: "100%",
                        margin: 0,
                        padding: 0,
                        background: "transparent",
                        backgroundColor: "transparent",
                        border: "none",
                        outline: "none",
                        cursor: enabled ? "pointer" : "not-allowed",
                        zIndex: 2,
                        WebkitAppearance: "none",
                        appearance: "none",
                      }}
                    />
                  </div>
                </div>
              );
            })}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "6px",
                marginTop: "2px",
                borderTop: "1px solid #f3f4f6",
                fontSize: "0.74rem",
                fontFamily: "'Poppins', sans-serif",
                color: "#6b7280",
              }}
            >
              <span>Total Weight Allocation</span>
              <span style={{ fontWeight: 700, color: totalPct === 100 ? "#ea580c" : "#9ca3af" }}>
                {totalPct}%
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={reset}
              style={{
                background: "transparent",
                color: "#6b7280",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "0.74rem",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f9fafb";
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.color = "#374151";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.color = "#6b7280";
              }}
            >
              Reset to defaults
            </button>
          </div>
          <p style={{ margin: 0, fontSize: "0.7rem", color: "#9ca3af", fontFamily: "'Poppins', sans-serif" }}>
            Applies to the overall score, the synthesis tiering, and the "How your sources are used" view.
          </p>
        </div>
      )}

      <style>{`
        input[type="range"].cw-relevance-slider {
          -webkit-appearance: none !important;
          appearance: none !important;
          border: none !important;
          background: transparent !important;
          background-color: transparent !important;
          border-radius: 8px !important;
          box-shadow: none !important;
          outline: none !important;
          margin: 0 !important;
          padding: 0 !important;
          color-scheme: light !important;
        }
        input[type="range"].cw-relevance-slider::-webkit-slider-runnable-track {
          -webkit-appearance: none !important;
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          height: 7px !important;
          border-radius: 999px !important;
          box-shadow: none !important;
        }
        input[type="range"].cw-relevance-slider::-moz-range-track {
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          height: 7px !important;
          border-radius: 999px !important;
          box-shadow: none !important;
        }
        input[type="range"].cw-relevance-slider::-webkit-slider-thumb {
          -webkit-appearance: none !important;
          appearance: none !important;
          width: 20px !important;
          height: 20px !important;
          margin-top: -6.5px !important;
          border-radius: 50% !important;
          background: #ffffff !important;
          border: 3.5px solid #ea580c !important;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25) !important;
          cursor: pointer !important;
          transition: transform 0.12s ease, box-shadow 0.12s ease !important;
        }
        input[type="range"].cw-relevance-slider::-webkit-slider-thumb:hover {
          transform: scale(1.12);
          box-shadow: 0 0 8px rgba(234, 88, 12, 0.5) !important;
        }
        input[type="range"].cw-relevance-slider::-webkit-slider-thumb:active {
          transform: scale(1.18);
        }
        input[type="range"].cw-relevance-slider::-moz-range-thumb {
          width: 20px !important;
          height: 20px !important;
          border-radius: 50% !important;
          background: #ffffff !important;
          border: 3.5px solid #ea580c !important;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25) !important;
          cursor: pointer !important;
          transition: transform 0.12s ease, box-shadow 0.12s ease !important;
        }
        input[type="range"].cw-relevance-slider::-moz-range-thumb:hover {
          transform: scale(1.12);
          box-shadow: 0 0 8px rgba(234, 88, 12, 0.5) !important;
        }
        input[type="range"].cw-relevance-slider:disabled::-webkit-slider-thumb {
          background: #e2e8f0 !important;
          border-color: #94a3b8 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
        }
        input[type="range"].cw-relevance-slider:disabled::-moz-range-thumb {
          background: #e2e8f0 !important;
          border-color: #94a3b8 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}