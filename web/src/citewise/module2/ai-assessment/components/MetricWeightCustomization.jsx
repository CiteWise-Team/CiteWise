import React, { useState, useEffect, useRef } from "react";
import theme, { ui } from "../../../theme";
import * as store from "../../../lib/citewiseStore";
import { apiFetch } from "../../../../api/http";
import { useTheme } from "../../../../context/ThemeContext";
import { ChevronDown, ChevronUp } from "lucide-react";

const METRIC_DETAILS = {
  gapAlignment: {
    description: "Evaluates how directly this paper addresses your defined research gap and objectives.",
    badge: "Gap Fit",
  },
  methodology: {
    description: "Evaluates empirical rigor, methodology soundness, and analytical validity.",
    badge: "Methods",
  },
  theoretical: {
    description: "Weighs theoretical grounding, conceptual frameworks, and academic literature context.",
    badge: "Theory",
  },
  citation: {
    description: "Measures publication venue authority, citation network quality, and academic impact.",
    badge: "Impact",
  },
};

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
    // Distribute equally with remainder to the first few items
    const base = Math.floor(total / items.length);
    let remainder = total % items.length;
    const res = {};
    for (const item of items) {
      res[item.key] = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
    }
    return res;
  }

  // Largest remainder calculation
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

  // Sort descending by fractional part to distribute remainder
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

export default function MetricWeightCustomization({ 
  sessionId, 
  documents = [], 
  onWeightsChanged, 
  onAssessmentTriggered, 
  isHero = false 
}) {
  const { isDark } = useTheme();
  const [prefs, setPrefs] = useState(() => {
    const initial = store.getScorePrefs(sessionId);
    return { ...initial, weights: normalizeWeights(initial.weights, initial.enabled) };
  });
  const [open, setOpen] = useState(isHero);
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [showSelectModal, setShowSelectModal] = useState(false);

  const pendingDocs = documents.filter((d) => d.rawStatus === "pending");
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!isHero && !autoOpenedRef.current && pendingDocs.length > 0) {
      autoOpenedRef.current = true;
      setOpen(true);
    }
  }, [isHero, pendingDocs.length]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  // Synchronized active loading progression
  const [processProgress, setProcessProgress] = useState(25);
  const [processStatusText, setProcessStatusText] = useState("Calibrating weights...");

  useEffect(() => {
    if (!isProcessing) {
      setProcessProgress(25);
      return;
    }
    setProcessProgress(25);
    setProcessStatusText(`Preparing ${documents.length} document${documents.length !== 1 ? 's' : ''} for AI assessment...`);

    const t1 = setTimeout(() => {
      setProcessProgress(55);
      setProcessStatusText("Applying custom metric weights across corpus...");
    }, 500);

    const t2 = setTimeout(() => {
      setProcessProgress(80);
      setProcessStatusText("Dispatching documents to AI evaluation pipeline...");
    }, 1100);

    const t3 = setTimeout(() => {
      setProcessProgress(95);
      setProcessStatusText("Finalizing batch assessment...");
    }, 1900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isProcessing, documents.length]);

  useEffect(() => {
    const loaded = store.getScorePrefs(sessionId);
    const normalized = normalizeWeights(loaded.weights, loaded.enabled);
    setPrefs({ ...loaded, weights: normalized });
  }, [sessionId]);

  const persist = (next) => {
    setPrefs(next);
    store.setScorePrefs(sessionId, next);
    setHasChanged(true);
    if (onWeightsChanged) onWeightsChanged(next);
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
      // Key disabled: set to 0 and rebalance remaining enabled keys to sum to 100%
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
      // Key enabled: introduce it and rebalance others
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

  const handleApplyToAll = async () => {
    const docIds = documents.map(d => d.id);
    await triggerBatchAssess(docIds, true, false);
  };

  const handleApplyToSelected = async () => {
    if (selectedDocs.size === 0) return;
    const docIds = Array.from(selectedDocs);
    await triggerBatchAssess(docIds, true, false);
    setShowSelectModal(false);
  };


  const handleAssessSelected = async () => {
    if (selectedDocs.size === 0) return;
    const docIds = Array.from(selectedDocs);
    await triggerBatchAssess(docIds, true, false);
    setShowSelectModal(false);
  };

  const triggerBatchAssess = async (docIds, overwriteWeights, onlyApplyWeights = false) => {
    if (!docIds.length) return;
    setIsProcessing(true);
    try {
      const panelWeights = {
        gap: prefs.enabled.gapAlignment ? prefs.weights.gapAlignment : 0,
        methodology: prefs.enabled.methodology ? prefs.weights.methodology : 0,
        theory: prefs.enabled.theoretical ? prefs.weights.theoretical : 0,
        citation: prefs.enabled.citation ? prefs.weights.citation : 0,
      };

      const payload = { 
        documentIds: docIds, 
        weights: panelWeights,
        overwriteWeights,
        onlyApplyWeights 
      };
      
      const { res, data } = await apiFetch(`/api/v1/documents/assess-batch`, {
        method: 'POST',
        headers: { 'X-Session-Id': sessionId },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setHasChanged(false);
        if (onAssessmentTriggered) onAssessmentTriggered(docIds);
      }
    } catch (e) {
      console.warn("Batch assess failed:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleDocSelection = (id) => {
    const next = new Set(selectedDocs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDocs(next);
  };

  const enabledTotal = store.SCORE_COMPONENTS.reduce(
    (sum, c) => sum + (prefs.enabled[c.key] ? Number(prefs.weights[c.key]) || 0 : 0),
    0
  );

  // ✨ Local theme-aware style overrides
  const cardStyle = isHero
    ? {
        background: isDark ? "#171624" : "#ffffff",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e5e7eb",
        borderRadius: "20px",
        boxShadow: isDark
          ? "0 24px 60px rgba(0, 0, 0, 0.45), 0 0 35px rgba(234, 88, 12, 0.05)"
          : "0 12px 36px rgba(0, 0, 0, 0.05), 0 0 30px rgba(234, 88, 12, 0.03)",
        padding: "clamp(1.5rem, 3.5vw, 2.75rem)",
        maxWidth: "100%",
        width: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
        transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
      }
    : {
        background: isDark ? "#171624" : "#ffffff",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e5e7eb",
        borderRadius: "16px",
        boxShadow: isDark ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 16px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
      };

  return (
    <div
      className={isHero ? "cw-m-pad" : undefined}
      style={cardStyle}
      data-guide="citewise-metric-weights"
    >
      {!isHero && (
        <button
          className="workflow-card-header"
          onClick={() => setOpen((o) => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            background: isDark ? "#1a192b" : "var(--cw-bg-surface-elevated, #f9fafb)",
            border: "none",
            borderBottom: open ? (isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid var(--cw-border, #e5e7eb)") : "none",
            cursor: "pointer",
            textAlign: "left",
            padding: "1.125rem 1.5rem",
            gap: "10px",
          }}
        >
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "1.05rem",
              color: isDark ? "#ffffff" : "var(--cw-text-primary, #0f0e17)",
              letterSpacing: "0.01em",
              lineHeight: 1.3,
            }}
          >
            Metric Weight Customization
          </span>
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.78rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {pendingDocs.length > 0 && !open && (
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "#ea580c",
                  background: isDark ? "rgba(234, 88, 12, 0.15)" : "#fff7ed",
                  border: isDark ? "1px solid rgba(234, 88, 12, 0.3)" : "1px solid #fed7aa",
                  padding: "2px 8px",
                  borderRadius: "12px",
                }}
              >
                {pendingDocs.length} pending
              </span>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", color: isDark ? "#94a3b8" : "#6b7280" }}>
              {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </span>
        </button>
      )}

      {isHero && isProcessing ? (
        <div style={{ padding: "3rem 1.5rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          {/* Guaranteed Animated SVG Spinner with glowing center */}
          <div
            style={{
              position: "relative",
              width: "76px",
              height: "76px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.25rem",
            }}
          >
            <svg width="76" height="76" viewBox="0 0 50 50" style={{ position: "absolute", inset: 0 }}>
              <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(234, 88, 12, 0.12)" strokeWidth="3.5" />
              <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="#ea580c"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="55 70"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 25 25"
                  to="360 25 25"
                  dur="0.95s"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "rgba(234, 88, 12, 0.09)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 16px rgba(234, 88, 12, 0.25)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
          </div>

          <h3
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: isDark ? "#ffffff" : "var(--cw-text-primary, #0f0e17)",
              margin: "0 0 0.4rem 0",
              letterSpacing: "-0.01em",
            }}
          >
            Running AI Assessment
          </h3>
          <p
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.85rem",
              color: isDark ? "#94a3b8" : "var(--cw-text-muted, #6b7280)",
              lineHeight: 1.55,
              margin: "0 0 1.5rem 0",
              maxWidth: "420px",
              minHeight: "1.55em",
            }}
          >
            {processStatusText}
          </p>

          {/* Moving Progress Bar & Percentage Count */}
          <div
            style={{
              width: "280px",
              maxWidth: "85%",
              height: "8px",
              background: isDark ? "rgba(255, 255, 255, 0.12)" : "var(--cw-border, #e5e7eb)",
              borderRadius: "999px",
              overflow: "hidden",
              position: "relative",
              boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.08)",
              margin: "0 auto 0.6rem auto",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${processProgress}%`,
                background: "linear-gradient(90deg, #ea580c 0%, #f97316 50%, #fb923c 100%)",
                borderRadius: "999px",
                transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 0 10px rgba(234, 88, 12, 0.45)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "280px",
              maxWidth: "85%",
              margin: "0 auto",
              fontSize: "0.75rem",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <span style={{ color: isDark ? "#94a3b8" : "var(--cw-text-muted, #6b7280)" }}>Assessment progress</span>
            <span style={{ color: "#ea580c", fontWeight: 700 }}>{processProgress}%</span>
          </div>

          {/* Shimmering skeleton cards beneath previewing layout */}
          <div className="cw-loading-skeleton-preview" style={{ marginTop: "1.5rem", width: "100%", maxWidth: "380px", display: "flex", gap: "10px" }}>
            <div className="cw-loading-skeleton-card-left" style={{ height: "48px" }} />
            <div className="cw-loading-skeleton-card-right" style={{ height: "48px" }} />
          </div>
        </div>
      ) : (open || isHero) && (
        <div style={{ padding: isHero ? "0" : "1rem 1.25rem", display: "flex", flexDirection: "column", gap: isHero ? "24px" : "18px" }}>
          {isHero && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "14px",
                      background: isDark ? "rgba(234, 88, 12, 0.15)" : "#fff7ed",
                      border: isDark ? "1px solid rgba(234, 88, 12, 0.3)" : "1px solid #fed7aa",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ea580c",
                      flexShrink: 0,
                      boxShadow: isDark ? "0 0 16px rgba(234, 88, 12, 0.25)" : "none",
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="21" x2="4" y2="14" />
                      <line x1="4" y1="10" x2="4" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12" y2="3" />
                      <line x1="20" y1="21" x2="20" y2="16" />
                      <line x1="20" y1="12" x2="20" y2="3" />
                      <line x1="1" y1="14" x2="7" y2="14" />
                      <line x1="9" y1="8" x2="15" y2="8" />
                      <line x1="17" y1="16" x2="23" y2="16" />
                    </svg>
                  </div>
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1.45rem",
                        fontWeight: 800,
                        color: isDark ? "#ffffff" : "#0f0e17",
                        fontFamily: "'Poppins', sans-serif",
                        letterSpacing: "-0.01em",
                        lineHeight: 1.25,
                      }}
                    >
                      Metric Weight Customization
                    </h2>
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        fontSize: "0.85rem",
                        color: isDark ? "#94a3b8" : "#6b7280",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      Configure how heavily each research metric influences document relevance scoring
                    </p>
                  </div>
                </div>

                {documents.length > 0 && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 14px",
                      borderRadius: "999px",
                      background: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
                      border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      color: isDark ? "#cbd5e1" : "#475569",
                    }}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ea580c" }} />
                    <span>{documents.length} document{documents.length !== 1 ? "s" : ""} uploaded</span>
                  </div>
                )}
              </div>

              {documents.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "14px 18px",
                    background: isDark ? "rgba(234, 88, 12, 0.12)" : "#fff7ed",
                    border: isDark ? "1px solid rgba(234, 88, 12, 0.35)" : "1px solid #fed7aa",
                    borderRadius: "12px",
                    color: isDark ? "#fed7aa" : "#9a3412",
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: "0.86rem",
                    lineHeight: 1.55,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <strong style={{ color: isDark ? "#ffedd5" : "#7c2d12" }}>Pending Assessment:</strong>{" "}
                    Your uploaded documents are waiting for AI assessment. Adjust your evaluation priorities below, then click{" "}
                    <strong style={{ color: "#ea580c" }}>"Apply Weights & Assess All"</strong> to begin scoring.
                  </div>
                </div>
              )}

              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: isDark ? "#94a3b8" : "#6b7280",
                  fontFamily: "'Poppins', sans-serif",
                  lineHeight: 1.6,
                }}
              >
                Before AI assessment begins, calibrate how much each component counts toward the overall relevance score.
                Weights automatically rebalance across enabled metrics to maintain exactly 100% allocation.
              </p>
            </div>
          )}

          {!isHero && (
            <p style={{ margin: 0, fontSize: "0.76rem", color: isDark ? "#94a3b8" : "#6b7280", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5 }}>
              Customize metric weights for assessment scoring.
              {pendingDocs.length > 0 && (
                <>
                  {" "}
                  <span style={{ color: "#f97316", fontWeight: 600 }}>
                    {pendingDocs.length} document{pendingDocs.length !== 1 ? "s" : ""} not assessed yet
                  </span>
                  {" — set the weights you want, then use \"Assess Selected\" to apply them to just those files."}
                </>
              )}
            </p>
          )}

          {/* Metric Items: Vertically aligned inside the single card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: isHero ? "20px" : "14px",
              width: "100%",
            }}
          >
            {store.SCORE_COMPONENTS.map(({ key, label }, index) => {
              const enabled = prefs.enabled[key];
              const pct = enabled ? Math.round((Number(prefs.weights[key]) || 0) * 100) : 0;
              const detail = METRIC_DETAILS[key];
              const isLast = index === store.SCORE_COMPONENTS.length - 1;
              return (
                <div
                  key={key}
                  style={{
                    opacity: enabled ? 1 : 0.45,
                    transition: "opacity 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: isHero ? "8px" : "6px",
                    paddingBottom: isHero && !isLast ? "20px" : "0",
                    borderBottom: isHero && !isLast 
                      ? (isDark ? "1px solid rgba(255, 255, 255, 0.07)" : "1px solid #f1f5f9") 
                      : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: isHero ? "1rem" : "0.85rem",
                        color: isDark ? "#ffffff" : "#111827",
                        fontWeight: 600,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleEnabled(key)}
                        style={{ width: 18, height: 18, accentColor: "#ea580c", cursor: "pointer" }}
                      />
                      <span>{label}</span>
                    </label>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: isHero ? "0.95rem" : "0.82rem",
                        color: enabled ? "#ea580c" : (isDark ? "#64748b" : "#9ca3af"),
                        fontWeight: 700,
                        padding: isHero ? "3px 14px" : "0",
                        borderRadius: "999px",
                        background: isHero ? (isDark ? "rgba(234, 88, 12, 0.14)" : "#fff7ed") : "transparent",
                        border: isHero ? (isDark ? "1px solid rgba(234, 88, 12, 0.35)" : "1px solid #fed7aa") : "none",
                        minWidth: isHero ? "60px" : "42px",
                        textAlign: "right",
                      }}
                    >
                      {enabled ? `${pct}%` : "off"}
                    </div>
                  </div>

                  {isHero && detail && (
                    <p
                      style={{
                        margin: "0 0 2px 0",
                        fontSize: "0.82rem",
                        color: isDark ? "#94a3b8" : "#64748b",
                        lineHeight: 1.5,
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {detail.description}
                    </p>
                  )}

                  {/* Modern Slim Pill Slider Bar matching Reference */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "26px",
                      display: "flex",
                      alignItems: "center",
                      marginTop: 2,
                    }}
                  >
                    {/* The 7px Slim Pill Track (soft neutral background) */}
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "7px",
                        borderRadius: "999px",
                        background: isDark ? "rgba(255, 255, 255, 0.18)" : "#e2e8f0",
                        overflow: "hidden",
                        pointerEvents: "none",
                      }}
                    >
                      {/* Active Solid Orange Fill Bar */}
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: enabled ? "#ea580c" : (isDark ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1"),
                          backgroundColor: enabled ? "#ea580c" : (isDark ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1"),
                          borderRadius: "999px",
                          transition: "width 0.08s ease-out",
                          boxShadow: enabled ? "0 0 10px rgba(234, 88, 12, 0.45)" : "none",
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
                      className="cw-weight-slider"
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
                        colorScheme: "light",
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
          </div>

          {/* Action Buttons Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: isHero ? "10px" : "8px", marginTop: isHero ? "6px" : "4px" }}>
            <button
              onClick={handleApplyToAll}
              disabled={isProcessing || documents.length === 0}
              style={{
                fontSize: isHero ? "1rem" : "0.85rem",
                padding: isHero ? "14px 24px" : "11px 16px",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: isProcessing ? "wait" : (documents.length === 0 ? "not-allowed" : "pointer"),
                background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: isHero ? "12px" : "8px",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                boxShadow: isProcessing
                  ? "0 0 20px rgba(234, 88, 12, 0.55)"
                  : "0 4px 16px rgba(234, 88, 12, 0.28)",
                opacity: documents.length === 0 ? 0.5 : 1,
                transition: "all 180ms ease",
              }}
              onMouseEnter={(e) => {
                if (!isProcessing && documents.length > 0) {
                  e.currentTarget.style.background = "linear-gradient(135deg, #c2410c 0%, #ea580c 100%)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(234, 88, 12, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isProcessing && documents.length > 0) {
                  e.currentTarget.style.background = "linear-gradient(135deg, #ea580c 0%, #f97316 100%)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(234, 88, 12, 0.28)";
                }
              }}
            >
              {isProcessing ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="5" />
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeDasharray="50 70">
                      <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                    </circle>
                  </svg>
                  <span>
                    {isHero
                      ? "Applying Weights & Starting Assessment..."
                      : (hasChanged ? "Reassessing With New Weights..." : "Starting AI Assessment...")}
                  </span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>{isHero ? "Apply Weights & Assess All Documents" : (hasChanged ? "Reassess All With New Weights" : "Assess All")}</span>
                </>
              )}
            </button>

            <div style={{ display: "flex", gap: "12px", width: "100%" }}>
              <button
                onClick={() => {
                  setSelectedDocs(new Set());
                  setShowSelectModal(true);
                }}
                disabled={isProcessing || documents.length === 0}
                style={{
                  background: isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
                  color: "#ea580c",
                  border: isDark ? "1px solid rgba(234, 88, 12, 0.4)" : "1px solid #fed7aa",
                  borderRadius: isHero ? "10px" : "8px",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: isHero ? "0.85rem" : "0.75rem",
                  padding: isHero ? "11px 16px" : "8px",
                  flex: 1,
                  cursor: isProcessing ? "wait" : (documents.length === 0 ? "not-allowed" : "pointer"),
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
                onMouseEnter={(e) => {
                  if (!isProcessing && documents.length > 0) {
                    e.currentTarget.style.background = isDark ? "rgba(234, 88, 12, 0.12)" : "#fff7ed";
                    e.currentTarget.style.borderColor = "#ea580c";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc";
                  e.currentTarget.style.borderColor = isDark ? "rgba(234, 88, 12, 0.4)" : "#fed7aa";
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Assess Selected</span>
              </button>

              <button
                onClick={reset}
                disabled={isProcessing}
                style={{
                  background: isDark ? "rgba(255, 255, 255, 0.02)" : "#ffffff",
                  color: isDark ? "#cbd5e1" : "#6b7280",
                  border: isDark ? "1px solid rgba(255, 255, 255, 0.14)" : "1px solid #d1d5db",
                  borderRadius: isHero ? "10px" : "8px",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: isHero ? "0.85rem" : "0.75rem",
                  padding: isHero ? "11px 16px" : "8px",
                  flex: 1,
                  cursor: isProcessing ? "wait" : "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
                onMouseEnter={(e) => {
                  if (!isProcessing) {
                    e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.06)" : "#f9fafb";
                    e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.28)" : "#9ca3af";
                    e.currentTarget.style.color = isDark ? "#ffffff" : "#1f2937";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.02)" : "#ffffff";
                  e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.14)" : "#d1d5db";
                  e.currentTarget.style.color = isDark ? "#cbd5e1" : "#6b7280";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>Reset Default</span>
              </button>
            </div>

            {isProcessing && (
              <div
                style={{
                  padding: "12px 14px",
                  background: isDark ? "rgba(234, 88, 12, 0.08)" : "#fff7ed",
                  border: isDark ? "1px solid rgba(234, 88, 12, 0.3)" : "1px solid #ffedd5",
                  borderRadius: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  boxShadow: "0 2px 8px rgba(234, 88, 12, 0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <svg width="18" height="18" viewBox="0 0 50 50" style={{ flexShrink: 0 }}>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(234, 88, 12, 0.15)" strokeWidth="4" />
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#ea580c" strokeWidth="4" strokeLinecap="round" strokeDasharray="55 70">
                      <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.95s" repeatCount="indefinite" />
                    </circle>
                  </svg>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: isDark ? "#fed7aa" : "#9a3412", fontFamily: "'Poppins', sans-serif" }}>
                    {processStatusText}
                  </span>
                </div>
                {/* Moving Progress Bar */}
                <div
                  style={{
                    width: "100%",
                    height: "5px",
                    background: isDark ? "rgba(255, 255, 255, 0.1)" : "#fed7aa",
                    borderRadius: "999px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${processProgress}%`,
                      background: "linear-gradient(90deg, #ea580c 0%, #f97316 50%, #fb923c 100%)",
                      borderRadius: "999px",
                      transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 0 8px rgba(234, 88, 12, 0.45)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Select Documents Modal */}
      {showSelectModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: isDark ? "#171624" : "#ffffff",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e5e7eb",
              borderRadius: "16px",
              padding: "24px",
              width: "90%",
              maxWidth: "500px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.25)",
            }}
          >
            <h3 style={{ margin: 0, color: isDark ? "#ffffff" : "#111827", fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
              Select Documents to Assess
            </h3>
            <p style={{ margin: 0, color: isDark ? "#94a3b8" : "#6b7280", fontSize: "0.85rem", fontFamily: "'Poppins', sans-serif" }}>
              Select which documents to run through the AI assessment.
            </p>
            <div style={{ maxHeight: "300px", overflowY: "auto", border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e5e7eb", borderRadius: "8px", padding: "8px", background: isDark ? "#100f18" : "#f9fafb" }}>
              {documents.map(doc => (
                <label
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "8px",
                    cursor: "pointer",
                    borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e5e7eb",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedDocs.has(doc.id)}
                    onChange={() => toggleDocSelection(doc.id)}
                    style={{ width: "16px", height: "16px", accentColor: "#f97316", cursor: "pointer" }}
                  />
                  <span style={{ color: isDark ? "#f3f4f6" : "#111827", fontFamily: "'Poppins', sans-serif", fontSize: "0.85rem", wordWrap: "break-word" }}>
                    {doc.name || doc.fileName || doc.title || doc.file_name}
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
              <button
                onClick={() => setShowSelectModal(false)}
                style={{
                  background: "transparent",
                  color: isDark ? "#cbd5e1" : "#6b7280",
                  border: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  padding: "8px 16px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.05)" : "#f9fafb";
                  e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.3)" : "#d1d5db";
                  e.currentTarget.style.color = isDark ? "#ffffff" : "#374151";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.15)" : "#e5e7eb";
                  e.currentTarget.style.color = isDark ? "#cbd5e1" : "#6b7280";
                }}
              >
                Cancel
              </button>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleAssessSelected}
                  disabled={selectedDocs.size === 0 || isProcessing}
                  style={{
                    background: "#ea580c",
                    color: "#ffffff",
                    border: "1px solid #ea580c",
                    borderRadius: "8px",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    padding: "8px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: isProcessing ? "wait" : (selectedDocs.size === 0 ? "not-allowed" : "pointer"),
                    opacity: selectedDocs.size === 0 ? 0.5 : 1,
                    boxShadow: isProcessing
                      ? "0 0 14px rgba(234, 88, 12, 0.5)"
                      : "0 2px 8px rgba(234, 88, 12, 0.22)",
                    transition: "all 180ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isProcessing && selectedDocs.size > 0) {
                      e.currentTarget.style.background = "#c2410c";
                      e.currentTarget.style.borderColor = "#c2410c";
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isProcessing && selectedDocs.size > 0) {
                      e.currentTarget.style.background = "#ea580c";
                      e.currentTarget.style.borderColor = "#ea580c";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.22)";
                    }
                  }}
                  onMouseDown={(e) => {
                    if (!isProcessing && selectedDocs.size > 0) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 6px rgba(234, 88, 12, 0.2)";
                    }
                  }}
                >
                  {isProcessing ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 50 50">
                        <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="5" />
                        <circle cx="25" cy="25" r="20" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeDasharray="50 70">
                          <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                        </circle>
                      </svg>
                      <span>Starting Assessment ({selectedDocs.size})...</span>
                    </>
                  ) : (
                    `Assess Selected (${selectedDocs.size})`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes citewise-spin {
          100% { transform: rotate(360deg); }
        }
        @keyframes citewise-pulse-dot {
          0% { opacity: 0.35; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1.15); }
        }
        input[type="range"].cw-weight-slider,
        [data-theme="dark"] input[type="range"].cw-weight-slider,
        body.dark-theme input[type="range"].cw-weight-slider,
        .citewise-app-shell input[type="range"].cw-weight-slider,
        [data-theme="dark"] .citewise-app-shell input[type="range"].cw-weight-slider {
          -webkit-appearance: none !important;
          appearance: none !important;
          border: none !important;
          background: transparent !important;
          background-color: transparent !important;
          border-radius: 999px !important;
          box-shadow: none !important;
          outline: none !important;
          margin: 0 !important;
          padding: 0 !important;
          color-scheme: light !important;
        }
        input[type="range"].cw-weight-slider::-webkit-slider-runnable-track,
        [data-theme="dark"] input[type="range"].cw-weight-slider::-webkit-slider-runnable-track,
        body.dark-theme input[type="range"].cw-weight-slider::-webkit-slider-runnable-track,
        .citewise-app-shell input[type="range"].cw-weight-slider::-webkit-slider-runnable-track,
        [data-theme="dark"] .citewise-app-shell input[type="range"].cw-weight-slider::-webkit-slider-runnable-track {
          -webkit-appearance: none !important;
          appearance: none !important;
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          height: 7px !important;
          border-radius: 999px !important;
          box-shadow: none !important;
        }
        input[type="range"].cw-weight-slider::-moz-range-track,
        [data-theme="dark"] input[type="range"].cw-weight-slider::-moz-range-track,
        body.dark-theme input[type="range"].cw-weight-slider::-moz-range-track,
        .citewise-app-shell input[type="range"].cw-weight-slider::-moz-range-track,
        [data-theme="dark"] .citewise-app-shell input[type="range"].cw-weight-slider::-moz-range-track {
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          height: 7px !important;
          border-radius: 999px !important;
          box-shadow: none !important;
        }
        input[type="range"].cw-weight-slider::-webkit-slider-thumb {
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
        input[type="range"].cw-weight-slider::-webkit-slider-thumb:hover {
          transform: scale(1.12);
          box-shadow: 0 0 8px rgba(234, 88, 12, 0.5) !important;
        }
        input[type="range"].cw-weight-slider::-webkit-slider-thumb:active {
          transform: scale(1.18);
        }
        input[type="range"].cw-weight-slider::-moz-range-thumb {
          width: 20px !important;
          height: 20px !important;
          border-radius: 50% !important;
          background: #ffffff !important;
          border: 3.5px solid #ea580c !important;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25) !important;
          cursor: pointer !important;
          transition: transform 0.12s ease, box-shadow 0.12s ease !important;
        }
        input[type="range"].cw-weight-slider::-moz-range-thumb:hover {
          transform: scale(1.12);
          box-shadow: 0 0 8px rgba(234, 88, 12, 0.5) !important;
        }
        input[type="range"].cw-weight-slider:disabled::-webkit-slider-thumb {
          background: #e2e8f0 !important;
          border-color: #94a3b8 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
        }
        input[type="range"].cw-weight-slider:disabled::-moz-range-thumb {
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