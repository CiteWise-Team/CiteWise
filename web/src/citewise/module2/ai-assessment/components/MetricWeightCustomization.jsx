import React, { useState, useEffect, useRef } from "react";
import theme, { ui } from "../../../theme";
import * as store from "../../../lib/citewiseStore";
import { apiFetch } from "../../../../api/http";

export default function MetricWeightCustomization({ 
  sessionId, 
  documents = [], 
  onWeightsChanged, 
  onAssessmentTriggered, 
  isHero = false 
}) {
  const [prefs, setPrefs] = useState(() => store.getScorePrefs(sessionId));
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

  useEffect(() => {
    setPrefs(store.getScorePrefs(sessionId));
  }, [sessionId]);

  const persist = (next) => {
    setPrefs(next);
    store.setScorePrefs(sessionId, next);
    setHasChanged(true);
    if (onWeightsChanged) onWeightsChanged(next);
  };

  const setWeight = (key, value) => {
    persist({ ...prefs, weights: { ...prefs.weights, [key]: Number(value) / 100 } });
  };

  const toggleEnabled = (key) => {
    persist({ ...prefs, enabled: { ...prefs.enabled, [key]: !prefs.enabled[key] } });
  };

  const reset = () => {
    persist(store.getScorePrefs("__defaults__never__"));
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

  // ✨ Local light-theme style overrides
  const cardStyle = isHero
    ? {
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
        padding: "2rem",
        maxWidth: "800px",
        margin: "0 auto",
        width: "100%",
      }
    : {
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
      };

  return (
    <div style={cardStyle}>
      {!isHero && (
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            background: "linear-gradient(180deg, #fff2e0 0%, #ffe9d1 100%)",
            border: "none",
            borderBottom: open ? "1px solid rgba(249, 115, 22, 0.18)" : "none",
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
              color: "#f97316",
              letterSpacing: "0.01em",
              lineHeight: 1.3,
            }}
          >
            Metric Weight Customization
          </span>
          <span
            style={{
              color: pendingDocs.length ? "#f97316" : "#6b7280",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.78rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {pendingDocs.length > 0 && !open
              ? `${pendingDocs.length} pending ▼`
              : (open ? "Hide ▲" : "Customize ▼")}
          </span>
        </button>
      )}

      {(open || isHero) && (
        <div style={{ padding: isHero ? "0" : "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "20px" }}>
          {isHero && (
            <div>
              <h2 style={{ margin: "0 0 8px 0", color: "#f97316", fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
                Metric Weight Customization
              </h2>
              {documents.length > 0 && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "12px",
                    background: "#fff7ef",
                    border: "1px solid #fed7aa",
                    borderRadius: "8px",
                    color: "#9a3412",
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: "0.85rem",
                  }}
                >
                  <strong>Not Yet Assessed:</strong> You have uploaded documents that are pending assessment. Customize your weights below and click "Assess All" to begin.
                </div>
              )}
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5 }}>
                Before AI assessment begins, customize how much each component counts toward the overall relevance score. 
                You can apply these weights to all documents, or only to selected documents. Documents that are not customized will use base weights.
              </p>
            </div>
          )}
          {!isHero && (
            <p style={{ margin: 0, fontSize: "0.76rem", color: "#6b7280", fontFamily: "'Poppins', sans-serif", lineHeight: 1.5 }}>
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

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {store.SCORE_COMPONENTS.map(({ key, label }) => {
              const enabled = prefs.enabled[key];
              const pct = Math.round((Number(prefs.weights[key]) || 0) * 100);
              const share = enabled && enabledTotal > 0 ? Math.round(((Number(prefs.weights[key]) || 0) / enabledTotal) * 100) : 0;
              return (
                <div key={key} style={{ opacity: enabled ? 1 : 0.5 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: "0.85rem",
                        color: "#111827",
                        fontWeight: 500,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleEnabled(key)}
                        style={{ width: 16, height: 16, accentColor: "#f97316", cursor: "pointer" }}
                      />
                      {label}
                    </label>
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "0.8rem", color: "#f97316", fontWeight: 700 }}>
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
                    style={{ width: "100%", accentColor: "#f97316", marginTop: 8 }}
                  />
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            <button
              onClick={handleApplyToAll}
              disabled={isProcessing || documents.length === 0}
              style={{
                fontSize: "0.85rem",
                padding: "11px 16px",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: isProcessing ? "wait" : (documents.length === 0 ? "not-allowed" : "pointer"),
                background: isProcessing
                  ? "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)"
                  : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                boxShadow: isProcessing
                  ? "0 0 16px rgba(249, 115, 22, 0.55)"
                  : "0 4px 12px rgba(249, 115, 22, 0.25)",
                opacity: documents.length === 0 ? 0.5 : 1,
                transition: "all 0.2s ease",
              }}
            >
              {isProcessing ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ animation: "citewise-spin 0.8s linear infinite" }}
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span>
                    {isHero
                      ? "Applying Weights & Starting Assessment..."
                      : (hasChanged ? "Reassessing With New Weights..." : "Starting AI Assessment...")}
                  </span>
                </>
              ) : (
                isHero ? "Apply Weights & Assess All" : (hasChanged ? "Reassess All With New Weights" : "Assess All")
              )}
            </button>
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                onClick={() => {
                  setSelectedDocs(new Set());
                  setShowSelectModal(true);
                }}
                disabled={isProcessing || documents.length === 0}
                style={{
                  background: "transparent",
                  color: "#f97316",
                  border: "1px solid rgba(249, 115, 22, 0.45)",
                  borderRadius: "8px",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  padding: "8px",
                  flex: 1,
                  cursor: isProcessing ? "wait" : (documents.length === 0 ? "not-allowed" : "pointer"),
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isProcessing && documents.length > 0) {
                    e.currentTarget.style.background = "rgba(249, 115, 22, 0.1)";
                    e.currentTarget.style.borderColor = "#f97316";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.45)";
                }}
              >
                Assess Selected
              </button>
              <button
                onClick={reset}
                disabled={isProcessing}
                style={{
                  background: "transparent",
                  color: "#6b7280",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  padding: "8px",
                  flex: 1,
                  cursor: isProcessing ? "wait" : "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isProcessing) {
                    e.currentTarget.style.background = "#f9fafb";
                    e.currentTarget.style.borderColor = "#d1d5db";
                    e.currentTarget.style.color = "#374151";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.color = "#6b7280";
                }}
              >
                Reset Default
              </button>
            </div>
            {isProcessing && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#fff7ef",
                  border: "1px solid #fed7aa",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#f97316",
                    boxShadow: "0 0 8px #f97316",
                    animation: "citewise-pulse-dot 1s infinite alternate",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "0.75rem", color: "#9a3412", fontFamily: "'Poppins', sans-serif" }}>
                  Sending {documents.length} document{documents.length !== 1 ? "s" : ""} to AI evaluation models...
                </span>
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
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              padding: "24px",
              width: "90%",
              maxWidth: "500px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.15)",
            }}
          >
            <h3 style={{ margin: 0, color: "#111827", fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
              Select Documents to Assess
            </h3>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.85rem", fontFamily: "'Poppins', sans-serif" }}>
              Select which documents to run through the AI assessment.
            </p>
            <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px", background: "#f9fafb" }}>
              {documents.map(doc => (
                <label
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "8px",
                    cursor: "pointer",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedDocs.has(doc.id)}
                    onChange={() => toggleDocSelection(doc.id)}
                    style={{ width: "16px", height: "16px", accentColor: "#f97316", cursor: "pointer" }}
                  />
                  <span style={{ color: "#111827", fontFamily: "'Poppins', sans-serif", fontSize: "0.85rem", wordWrap: "break-word" }}>
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
                  color: "#6b7280",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  padding: "8px 16px",
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
                Cancel
              </button>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleAssessSelected}
                  disabled={selectedDocs.size === 0 || isProcessing}
                  style={{
                    background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                    color: "#ffffff",
                    border: "none",
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
                      ? "0 0 14px rgba(249, 115, 22, 0.5)"
                      : "0 4px 12px rgba(249, 115, 22, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isProcessing ? (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ animation: "citewise-spin 0.8s linear infinite" }}
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
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
      `}</style>
    </div>
  );
}