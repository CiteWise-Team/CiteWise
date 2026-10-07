import React, { useState, useEffect, useRef } from "react";
import theme, { ui } from "../../../theme";
import * as store from "../../../lib/citewiseStore";
import { apiFetch } from "../../../../api/http";
import { useTheme } from "../../../../context/ThemeContext";
import { 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  Unlock, 
  X, 
  Search, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Check, 
  Sparkles 
} from "lucide-react";

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
  const [locked, setLocked] = useState({});
  const [open, setOpen] = useState(isHero);
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalFilter, setModalFilter] = useState("all"); // 'all' | 'pending' | 'assessed'
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  // Synchronized active loading progression
  const [processProgress, setProcessProgress] = useState(25);
  const [processStatusText, setProcessStatusText] = useState("Calibrating weights...");

  const pendingDocs = documents.filter((d) => d.rawStatus === "pending");
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!showSelectModal) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isProcessing) {
        setShowSelectModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSelectModal, isProcessing]);

  useEffect(() => {
    if (!isHero && !autoOpenedRef.current && pendingDocs.length > 0) {
      autoOpenedRef.current = true;
      setOpen(true);
    }
  }, [isHero, pendingDocs.length]);

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

  const toggleLock = (key) => {
    if (!prefs.enabled[key]) return;
    setLocked((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const rebalanceWeights = (targetKey, rawValue) => {
    if (!prefs.enabled[targetKey] || locked[targetKey]) return;

    const enabledKeys = store.SCORE_COMPONENTS.filter((c) => prefs.enabled[c.key]).map((c) => c.key);
    if (enabledKeys.length <= 1) {
      const nextWeights = { ...prefs.weights, [targetKey]: 1.0 };
      persist({ ...prefs, weights: nextWeights });
      return;
    }

    const otherKeys = enabledKeys.filter((k) => k !== targetKey);
    const otherLockedKeys = otherKeys.filter((k) => locked[k]);
    const otherUnlockedKeys = otherKeys.filter((k) => !locked[k]);

    // Total percentage locked among other enabled metrics
    const sumLocked = otherLockedKeys.reduce(
      (sum, k) => sum + Math.round((Number(prefs.weights[k]) || 0) * 100),
      0
    );
    const maxAllowed = Math.max(0, 100 - sumLocked);

    // If there are no other unlocked metrics, targetKey cannot rebalance against anything
    if (otherUnlockedKeys.length === 0) {
      const nextWeights = { ...prefs.weights, [targetKey]: maxAllowed / 100 };
      persist({ ...prefs, weights: nextWeights });
      return;
    }

    const targetVal = Math.max(0, Math.min(maxAllowed, Math.round(Number(rawValue) || 0)));
    const rem = 100 - sumLocked - targetVal;

    const items = otherUnlockedKeys.map((k) => ({
      key: k,
      weight: Math.round((Number(prefs.weights[k]) || 0) * 100),
    }));

    const allocated = distributeInteger(rem, items);
    const nextWeights = { ...prefs.weights, [targetKey]: targetVal / 100 };

    for (const k of otherLockedKeys) {
      nextWeights[k] = Math.round((Number(prefs.weights[k]) || 0) * 100) / 100;
    }
    for (const k of otherUnlockedKeys) {
      nextWeights[k] = (allocated[k] || 0) / 100;
    }

    persist({ ...prefs, weights: nextWeights });
  };

  const toggleEnabled = (key) => {
    const nextEnabled = { ...prefs.enabled, [key]: !prefs.enabled[key] };
    const enabledKeys = store.SCORE_COMPONENTS.filter((c) => nextEnabled[c.key]).map((c) => c.key);
    const nextWeights = { ...prefs.weights };

    // If disabling key, clear its lock
    if (prefs.enabled[key]) {
      setLocked((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }

    if (enabledKeys.length === 0) {
      for (const c of store.SCORE_COMPONENTS) {
        nextWeights[c.key] = 0;
      }
    } else if (!nextEnabled[key]) {
      // Key disabled: set to 0 and rebalance remaining enabled keys to sum to 100%
      nextWeights[key] = 0;
      const otherLockedKeys = enabledKeys.filter((k) => locked[k]);
      const otherUnlockedKeys = enabledKeys.filter((k) => !locked[k]);
      const sumLocked = otherLockedKeys.reduce(
        (sum, k) => sum + Math.round((Number(prefs.weights[k]) || 0) * 100),
        0
      );

      if (otherUnlockedKeys.length > 0 && sumLocked < 100) {
        const rem = 100 - sumLocked;
        const items = otherUnlockedKeys.map((k) => ({
          key: k,
          weight: Math.round((Number(prefs.weights[k]) || 0) * 100),
        }));
        const allocated = distributeInteger(rem, items);
        for (const k of otherLockedKeys) {
          nextWeights[k] = Math.round((Number(prefs.weights[k]) || 0) * 100) / 100;
        }
        for (const k of otherUnlockedKeys) {
          nextWeights[k] = (allocated[k] || 0) / 100;
        }
      } else {
        const items = enabledKeys.map((k) => ({
          key: k,
          weight: Math.round((Number(prefs.weights[k]) || 0) * 100),
        }));
        const allocated = distributeInteger(100, items);
        for (const k of enabledKeys) {
          nextWeights[k] = (allocated[k] || 0) / 100;
        }
      }
    } else {
      // Key enabled: introduce it and rebalance others
      if (enabledKeys.length === 1) {
        nextWeights[key] = 1.0;
      } else {
        const otherKeys = enabledKeys.filter((k) => k !== key);
        const otherLockedKeys = otherKeys.filter((k) => locked[k]);
        const otherUnlockedKeys = otherKeys.filter((k) => !locked[k]);
        const sumLocked = otherLockedKeys.reduce(
          (sum, k) => sum + Math.round((Number(prefs.weights[k]) || 0) * 100),
          0
        );

        const defaultShare = Math.round((store.DEFAULT_WEIGHTS[key] || (1 / enabledKeys.length)) * 100);
        const maxForNew = Math.max(0, 100 - sumLocked);
        const targetPct = Math.min(defaultShare, Math.min(maxForNew, Math.floor(100 / enabledKeys.length)));

        if (otherUnlockedKeys.length > 0) {
          const rem = 100 - sumLocked - targetPct;
          const items = otherUnlockedKeys.map((k) => ({
            key: k,
            weight: Math.round((Number(prefs.weights[k]) || 0) * 100),
          }));
          const allocated = distributeInteger(rem, items);
          nextWeights[key] = targetPct / 100;
          for (const k of otherLockedKeys) {
            nextWeights[k] = Math.round((Number(prefs.weights[k]) || 0) * 100) / 100;
          }
          for (const k of otherUnlockedKeys) {
            nextWeights[k] = (allocated[k] || 0) / 100;
          }
        } else {
          nextWeights[key] = maxForNew / 100;
          for (const k of otherLockedKeys) {
            nextWeights[k] = Math.round((Number(prefs.weights[k]) || 0) * 100) / 100;
          }
        }
      }
    }

    persist({ ...prefs, enabled: nextEnabled, weights: nextWeights });
  };

  const reset = () => {
    setLocked({});
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

  const modalPendingCount = documents.filter(
    (d) => d.rawStatus === "pending" || (!d.relevancyScore && d.relevancyScore !== 0)
  ).length;
  const modalAssessedCount = documents.length - modalPendingCount;

  const filteredModalDocs = documents.filter((doc) => {
    const isPending = doc.rawStatus === "pending" || (!doc.relevancyScore && doc.relevancyScore !== 0);
    if (modalFilter === "pending" && !isPending) return false;
    if (modalFilter === "assessed" && isPending) return false;
    if (modalSearch.trim()) {
      const q = modalSearch.toLowerCase().trim();
      const title = (doc.name || doc.fileName || doc.title || doc.file_name || "").toLowerCase();
      const authors = (doc.authors || doc.author || "").toString().toLowerCase();
      return title.includes(q) || authors.includes(q);
    }
    return true;
  });

  const areAllFilteredSelected = filteredModalDocs.length > 0 && filteredModalDocs.every((d) => selectedDocs.has(d.id));

  const toggleSelectAllFiltered = () => {
    const next = new Set(selectedDocs);
    if (areAllFilteredSelected) {
      filteredModalDocs.forEach((d) => next.delete(d.id));
    } else {
      filteredModalDocs.forEach((d) => next.add(d.id));
    }
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
                You can lock any metric to freeze its percentage while adjusting the others.
              </p>
            </div>
          )}

          {!isHero && (
            <p style={{ margin: 0, fontSize: "0.76rem", color: isDark ? "#94a3b8" : "#6b7280", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5 }}>
              Customize metric weights for assessment scoring. Lock any metric to freeze its percentage while adjusting the others.
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
              const isLocked = Boolean(locked[key]);
              const pct = enabled ? Math.round((Number(prefs.weights[key]) || 0) * 100) : 0;
              const detail = METRIC_DETAILS[key];
              const isLast = index === store.SCORE_COMPONENTS.length - 1;

              // Check if all other enabled components are locked
              const otherKeys = store.SCORE_COMPONENTS.filter((c) => prefs.enabled[c.key] && c.key !== key);
              const otherUnlockedCount = otherKeys.filter((c) => !locked[c.key]).length;
              const isSoleUnlocked = enabled && !isLocked && otherUnlockedCount === 0 && otherKeys.length > 0;

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

                    <div style={{ display: "flex", alignItems: "center", gap: isHero ? "8px" : "6px" }}>
                      {enabled && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLock(key);
                          }}
                          title={isLocked ? `Unlock ${label}` : `Lock ${label} at ${pct}%`}
                          aria-label={isLocked ? `Unlock ${label}` : `Lock ${label} at ${pct}%`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: isHero ? "4px 10px" : "2px 8px",
                            borderRadius: "999px",
                            fontSize: isHero ? "0.75rem" : "0.7rem",
                            fontWeight: 600,
                            fontFamily: "'Poppins', sans-serif",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            border: isLocked
                              ? "1px solid #ea580c"
                              : (isDark ? "1px solid rgba(255, 255, 255, 0.16)" : "1px solid #cbd5e1"),
                            background: isLocked
                              ? (isDark ? "rgba(234, 88, 12, 0.22)" : "rgba(234, 88, 12, 0.12)")
                              : (isDark ? "rgba(255, 255, 255, 0.04)" : "#f8fafc"),
                            color: isLocked
                              ? "#ea580c"
                              : (isDark ? "#94a3b8" : "#64748b"),
                            outline: "none",
                          }}
                          onMouseEnter={(e) => {
                            if (!isLocked) {
                              e.currentTarget.style.borderColor = "#ea580c";
                              e.currentTarget.style.color = "#ea580c";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isLocked) {
                              e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.16)" : "#cbd5e1";
                              e.currentTarget.style.color = isDark ? "#94a3b8" : "#64748b";
                            }
                          }}
                        >
                          {isLocked ? (
                            <Lock size={isHero ? 13 : 11} strokeWidth={2.4} style={{ color: "#ea580c" }} />
                          ) : (
                            <Unlock size={isHero ? 13 : 11} strokeWidth={2} />
                          )}
                          <span>{isLocked ? "Locked" : "Lock"}</span>
                        </button>
                      )}

                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "'Poppins', sans-serif",
                          fontSize: isHero ? "0.95rem" : "0.82rem",
                          color: enabled ? "#ea580c" : (isDark ? "#64748b" : "#9ca3af"),
                          fontWeight: 700,
                          padding: isHero ? "3px 14px" : "2px 8px",
                          borderRadius: "999px",
                          background: isHero ? (isDark ? "rgba(234, 88, 12, 0.14)" : "#fff7ed") : (isDark ? "rgba(255, 255, 255, 0.05)" : "#f8fafc"),
                          border: isHero ? (isDark ? "1px solid rgba(234, 88, 12, 0.35)" : "1px solid #fed7aa") : (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0"),
                          minWidth: isHero ? "60px" : "44px",
                          textAlign: "right",
                        }}
                      >
                        {enabled ? `${pct}%` : "off"}
                      </div>
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
                          background: enabled
                            ? (isLocked ? "linear-gradient(90deg, #ea580c 0%, #c2410c 100%)" : "#ea580c")
                            : (isDark ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1"),
                          backgroundColor: enabled
                            ? (isLocked ? "#ea580c" : "#ea580c")
                            : (isDark ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1"),
                          borderRadius: "999px",
                          transition: "width 0.08s ease-out",
                          boxShadow: enabled
                            ? (isLocked ? "0 0 6px rgba(234, 88, 12, 0.35)" : "0 0 10px rgba(234, 88, 12, 0.45)")
                            : "none",
                        }}
                      />
                    </div>

                    {/* Interactive Slider Input with White Center & Orange Ring Knob */}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={pct}
                      disabled={!enabled || isLocked || isSoleUnlocked}
                      onChange={(e) => rebalanceWeights(key, e.target.value)}
                      className="cw-weight-slider"
                      title={
                        !enabled
                          ? `${label} is disabled`
                          : isLocked
                          ? `${label} is locked at ${pct}%. Click "Locked" to unlock.`
                          : isSoleUnlocked
                          ? `Remaining weight is fixed at ${pct}% because all other metrics are locked.`
                          : `Adjust ${label} weight (${pct}%)`
                      }
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
                        cursor: (!enabled || isLocked || isSoleUnlocked) ? "not-allowed" : "pointer",
                        zIndex: 2,
                        WebkitAppearance: "none",
                        appearance: "none",
                        opacity: isLocked ? 0.8 : 1,
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
                  const pending = documents.filter(d => d.rawStatus === "pending" || (!d.relevancyScore && d.relevancyScore !== 0));
                  if (pending.length > 0) {
                    setSelectedDocs(new Set(pending.map(d => d.id)));
                  } else {
                    setSelectedDocs(new Set(documents.map(d => d.id)));
                  }
                  setModalSearch("");
                  setModalFilter("all");
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
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessing) {
              setShowSelectModal(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)",
            padding: "16px",
            animation: "citewiseFadeIn 0.2s ease-out forwards",
          }}
        >
          <div
            style={{
              background: isDark ? "#161522" : "#ffffff",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e2e8f0",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "min(680px, 90vh)",
              display: "flex",
              flexDirection: "column",
              boxShadow: isDark
                ? "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(234, 88, 12, 0.08)"
                : "0 20px 50px -10px rgba(0, 0, 0, 0.15), 0 0 30px rgba(234, 88, 12, 0.04)",
              animation: "citewiseModalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px 16px 24px",
                borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #f1f5f9",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, rgba(234, 88, 12, 0.18) 0%, rgba(249, 115, 22, 0.08) 100%)",
                    border: isDark ? "1px solid rgba(234, 88, 12, 0.35)" : "1px solid #fed7aa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ea580c",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  <Sparkles size={19} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: isDark ? "#ffffff" : "#0f172a",
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.3,
                    }}
                  >
                    Select Documents to Assess
                  </h3>
                  <p
                    style={{
                      margin: "3px 0 0 0",
                      color: isDark ? "#94a3b8" : "#64748b",
                      fontSize: "0.8rem",
                      fontFamily: "'Poppins', sans-serif",
                      lineHeight: 1.45,
                    }}
                  >
                    Choose which papers to evaluate with your custom metric weights
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isProcessing && setShowSelectModal(false)}
                disabled={isProcessing}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0",
                  background: isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
                  color: isDark ? "#94a3b8" : "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  padding: 0,
                  marginTop: "2px",
                }}
                onMouseEnter={(e) => {
                  if (!isProcessing) {
                    e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.1)" : "#f1f5f9";
                    e.currentTarget.style.color = isDark ? "#ffffff" : "#0f172a";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isProcessing) {
                    e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc";
                    e.currentTarget.style.color = isDark ? "#94a3b8" : "#64748b";
                  }
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div
              style={{
                padding: "14px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid #f1f5f9",
                background: isDark ? "rgba(255, 255, 255, 0.015)" : "#fafafa",
              }}
            >
              {/* Search input */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    left: "12px",
                    color: isDark ? "#64748b" : "#94a3b8",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Search papers by title or author..."
                  style={{
                    width: "100%",
                    padding: "9px 34px 9px 36px",
                    background: isDark ? "#100f18" : "#ffffff",
                    border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #cbd5e1",
                    borderRadius: "10px",
                    color: isDark ? "#ffffff" : "#0f172a",
                    fontSize: "0.84rem",
                    fontFamily: "'Poppins', sans-serif",
                    outline: "none",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#ea580c";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(234, 88, 12, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "#cbd5e1";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                {modalSearch && (
                  <button
                    type="button"
                    onClick={() => setModalSearch("")}
                    style={{
                      position: "absolute",
                      right: "10px",
                      background: "transparent",
                      border: "none",
                      color: isDark ? "#94a3b8" : "#64748b",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filter chips & Select All toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setModalFilter("all")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      cursor: "pointer",
                      border: modalFilter === "all"
                        ? "1px solid #ea580c"
                        : (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0"),
                      background: modalFilter === "all"
                        ? (isDark ? "rgba(234, 88, 12, 0.2)" : "#fff7ed")
                        : "transparent",
                      color: modalFilter === "all"
                        ? "#ea580c"
                        : (isDark ? "#94a3b8" : "#64748b"),
                      transition: "all 0.18s ease",
                    }}
                  >
                    All ({documents.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalFilter("pending")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      border: modalFilter === "pending"
                        ? "1px solid #f59e0b"
                        : (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0"),
                      background: modalFilter === "pending"
                        ? (isDark ? "rgba(245, 158, 11, 0.18)" : "#fffbeb")
                        : "transparent",
                      color: modalFilter === "pending"
                        ? (isDark ? "#fbbf24" : "#d97706")
                        : (isDark ? "#94a3b8" : "#64748b"),
                      transition: "all 0.18s ease",
                    }}
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b" }} />
                    Pending ({modalPendingCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalFilter("assessed")}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      border: modalFilter === "assessed"
                        ? "1px solid #10b981"
                        : (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0"),
                      background: modalFilter === "assessed"
                        ? (isDark ? "rgba(16, 185, 129, 0.18)" : "#ecfdf5")
                        : "transparent",
                      color: modalFilter === "assessed"
                        ? (isDark ? "#34d399" : "#059669")
                        : (isDark ? "#94a3b8" : "#64748b"),
                      transition: "all 0.18s ease",
                    }}
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                    Assessed ({modalAssessedCount})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  disabled={filteredModalDocs.length === 0}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#ea580c",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    fontFamily: "'Poppins', sans-serif",
                    cursor: filteredModalDocs.length === 0 ? "not-allowed" : "pointer",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    transition: "all 0.15s ease",
                    opacity: filteredModalDocs.length === 0 ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (filteredModalDocs.length > 0) {
                      e.currentTarget.style.background = isDark ? "rgba(234, 88, 12, 0.12)" : "#fff7ed";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {areAllFilteredSelected ? "Deselect All Files" : "Select All Files"}
                </button>
              </div>
            </div>

            {/* Documents List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                minHeight: "180px",
                maxHeight: "360px",
              }}
            >
              {filteredModalDocs.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "36px 16px",
                    gap: "10px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isDark ? "#64748b" : "#94a3b8",
                    }}
                  >
                    <FileText size={24} />
                  </div>
                  <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "0.88rem", fontWeight: 600, color: isDark ? "#e2e8f0" : "#334155" }}>
                    No matching documents found
                  </div>
                  <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "0.78rem", color: isDark ? "#94a3b8" : "#64748b" }}>
                    Try changing your search query or switching active filter tabs.
                  </div>
                  {(modalSearch || modalFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalSearch("");
                        setModalFilter("all");
                      }}
                      style={{
                        marginTop: "4px",
                        background: isDark ? "rgba(234, 88, 12, 0.15)" : "#fff7ed",
                        border: "1px solid #ea580c",
                        color: "#ea580c",
                        borderRadius: "8px",
                        padding: "6px 14px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        fontFamily: "'Poppins', sans-serif",
                        cursor: "pointer",
                      }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                filteredModalDocs.map((doc) => {
                  const isSelected = selectedDocs.has(doc.id);
                  const isPending = doc.rawStatus === "pending" || (!doc.relevancyScore && doc.relevancyScore !== 0);
                  const docTitle = doc.name || doc.fileName || doc.title || doc.file_name || "Untitled Paper";
                  const authors = doc.authors || doc.author || "";
                  const year = doc.year || doc.publication_year || "";

                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleDocSelection(doc.id)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "14px",
                        padding: "12px 14px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                        background: isSelected
                          ? (isDark ? "rgba(234, 88, 12, 0.1)" : "#fff7ed")
                          : (isDark ? "rgba(255, 255, 255, 0.02)" : "#ffffff"),
                        border: isSelected
                          ? "1px solid rgba(234, 88, 12, 0.45)"
                          : (isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0"),
                        borderLeft: isSelected
                          ? "3.5px solid #ea580c"
                          : (isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0"),
                        boxShadow: isSelected
                          ? (isDark ? "0 4px 14px rgba(234, 88, 12, 0.15)" : "0 2px 8px rgba(234, 88, 12, 0.08)")
                          : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.04)" : "#f8fafc";
                          e.currentTarget.style.borderColor = isDark ? "rgba(234, 88, 12, 0.25)" : "rgba(234, 88, 12, 0.25)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.02)" : "#ffffff";
                          e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0";
                        }
                      }}
                    >
                      {/* Custom checkbox */}
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "5px",
                          border: isSelected
                            ? "1.5px solid #ea580c"
                            : (isDark ? "1.5px solid rgba(255, 255, 255, 0.25)" : "1.5px solid #cbd5e1"),
                          background: isSelected ? "#ea580c" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: "2px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} color="#ffffff" />}
                      </div>

                      {/* File Icon */}
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: isSelected
                            ? (isDark ? "rgba(234, 88, 12, 0.2)" : "#fed7aa")
                            : (isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9"),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isSelected ? "#ea580c" : (isDark ? "#94a3b8" : "#64748b"),
                          flexShrink: 0,
                          marginTop: "1px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <FileText size={16} />
                      </div>

                      {/* Document Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: isDark ? "#f3f4f6" : "#0f172a",
                            fontFamily: "'Poppins', sans-serif",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            lineHeight: 1.4,
                            wordBreak: "break-word",
                          }}
                        >
                          {docTitle}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                            marginTop: "4px",
                          }}
                        >
                          {/* Status Pill */}
                          {isPending ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "1px 7px",
                                borderRadius: "999px",
                                fontSize: "0.68rem",
                                fontWeight: 600,
                                fontFamily: "'Poppins', sans-serif",
                                background: isDark ? "rgba(245, 158, 11, 0.15)" : "#fffbeb",
                                border: isDark ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid #fde68a",
                                color: isDark ? "#fbbf24" : "#b45309",
                              }}
                            >
                              <Clock size={10} />
                              Pending
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "1px 7px",
                                borderRadius: "999px",
                                fontSize: "0.68rem",
                                fontWeight: 600,
                                fontFamily: "'Poppins', sans-serif",
                                background: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
                                border: isDark ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid #a7f3d0",
                                color: isDark ? "#34d399" : "#047857",
                              }}
                            >
                              <CheckCircle2 size={10} />
                              Assessed
                              {typeof doc.relevancyScore === "number" ? ` (${doc.relevancyScore}%)` : ""}
                            </span>
                          )}

                          {/* Author or Year */}
                          {(authors || year) && (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                color: isDark ? "#64748b" : "#94a3b8",
                                fontFamily: "'Poppins', sans-serif",
                              }}
                            >
                              {[authors, year].filter(Boolean).join(" • ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #f1f5f9",
                background: isDark ? "rgba(255, 255, 255, 0.02)" : "#fafafa",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              {/* Selected Count Indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: "0.8rem",
                    color: isDark ? "#94a3b8" : "#64748b",
                  }}
                >
                  Selected:
                </span>
                <span
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: selectedDocs.size > 0 ? "#ea580c" : (isDark ? "#64748b" : "#9ca3af"),
                    background: selectedDocs.size > 0
                      ? (isDark ? "rgba(234, 88, 12, 0.18)" : "#fff7ed")
                      : (isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9"),
                    border: selectedDocs.size > 0
                      ? (isDark ? "1px solid rgba(234, 88, 12, 0.35)" : "1px solid #fed7aa")
                      : (isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0"),
                    padding: "2px 10px",
                    borderRadius: "999px",
                    transition: "all 0.15s ease",
                  }}
                >
                  {selectedDocs.size} of {documents.length}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => !isProcessing && setShowSelectModal(false)}
                  disabled={isProcessing}
                  style={{
                    background: "transparent",
                    color: isDark ? "#cbd5e1" : "#64748b",
                    border: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #cbd5e1",
                    borderRadius: "10px",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600,
                    fontSize: "0.84rem",
                    padding: "9px 18px",
                    cursor: isProcessing ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isProcessing) {
                      e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9";
                      e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.25)" : "#94a3b8";
                      e.currentTarget.style.color = isDark ? "#ffffff" : "#0f172a";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isProcessing) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.15)" : "#cbd5e1";
                      e.currentTarget.style.color = isDark ? "#cbd5e1" : "#64748b";
                    }
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleAssessSelected}
                  disabled={selectedDocs.size === 0 || isProcessing}
                  style={{
                    background: selectedDocs.size === 0
                      ? (isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0")
                      : "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                    color: selectedDocs.size === 0
                      ? (isDark ? "#64748b" : "#94a3b8")
                      : "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.84rem",
                    padding: "9px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: isProcessing ? "wait" : (selectedDocs.size === 0 ? "not-allowed" : "pointer"),
                    boxShadow: selectedDocs.size > 0
                      ? (isProcessing
                          ? "0 0 16px rgba(234, 88, 12, 0.55)"
                          : "0 4px 14px rgba(234, 88, 12, 0.3)")
                      : "none",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isProcessing && selectedDocs.size > 0) {
                      e.currentTarget.style.background = "linear-gradient(135deg, #c2410c 0%, #ea580c 100%)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 6px 18px rgba(234, 88, 12, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isProcessing && selectedDocs.size > 0) {
                      e.currentTarget.style.background = "linear-gradient(135deg, #ea580c 0%, #f97316 100%)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.3)";
                    }
                  }}
                >
                  {isProcessing ? (
                    <>
                      <svg width="15" height="15" viewBox="0 0 50 50">
                        <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="5" />
                        <circle cx="25" cy="25" r="20" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeDasharray="50 70">
                          <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                        </circle>
                      </svg>
                      <span>Starting Assessment ({selectedDocs.size})...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>Assess Selected ({selectedDocs.size})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes citewiseModalIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes citewiseFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
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