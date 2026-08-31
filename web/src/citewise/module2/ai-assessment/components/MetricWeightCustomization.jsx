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
  const [open, setOpen] = useState(isHero); // always open if in hero position
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [showSelectModal, setShowSelectModal] = useState(false);

  // Documents still waiting to be assessed. Assessing files one at a time with
  // different weights means coming back to this panel, so surface it (and say how
  // many are left) rather than leaving it collapsed and easy to miss.
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
      // Always pass the current panel weights
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

  const cardStyle = isHero 
    ? { ...ui.card, padding: "2rem", maxWidth: "800px", margin: "0 auto", width: "100%" }
    : ui.card;

  return (
    <div style={cardStyle}>
      {!isHero && (
        <button
          onClick={() => setOpen((o) => !o)}
          style={{ 
            ...ui.cardHeader, 
            width: "100%", 
            background: theme.surfaceAlt, 
            border: "none", 
            cursor: "pointer",
            textAlign: "left",
            padding: "0.8rem 1rem",
            gap: "10px"
          }}
        >
          <span style={{ ...ui.cardTitle, fontSize: "0.9rem", lineHeight: 1.3 }}>
            Metric Weight Customization
          </span>
          <span style={{ color: pendingDocs.length ? theme.accent : theme.textMuted, fontFamily: theme.font, fontSize: "0.78rem", whiteSpace: "nowrap" }}>
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
              <h2 style={{ margin: "0 0 8px 0", color: theme.accent, fontFamily: theme.font }}>Metric Weight Customization</h2>
              {documents.length > 0 && (
                <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(255, 165, 0, 0.1)", border: "1px solid rgba(255, 165, 0, 0.3)", borderRadius: "8px", color: "#ffb74d", fontFamily: theme.font, fontSize: "0.85rem" }}>
                  <strong>Not Yet Assessed:</strong> You have uploaded documents that are pending assessment. Customize your weights below and click "Assess All" to begin.
                </div>
              )}
              <p style={{ margin: 0, fontSize: "0.85rem", color: theme.textMuted, fontFamily: theme.font, lineHeight: 1.5 }}>
                Before AI assessment begins, customize how much each component counts toward the overall relevance score. 
                You can apply these weights to all documents, or only to selected documents. Documents that are not customized will use base weights.
              </p>
            </div>
          )}
          {!isHero && (
             <p style={{ margin: 0, fontSize: "0.76rem", color: theme.textMuted, fontFamily: theme.font, lineHeight: 1.5 }}>
               Customize metric weights for assessment scoring.
               {pendingDocs.length > 0 && (
                 <>
                   {" "}
                   <span style={{ color: theme.accent, fontWeight: 600 }}>
                     {pendingDocs.length} document{pendingDocs.length !== 1 ? "s" : ""} not assessed yet
                   </span>
                   {" — set the weights you want, then use “Assess Selected” to apply them to just those files."}
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
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: theme.font, fontSize: "0.85rem", color: theme.text }}>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleEnabled(key)}
                        style={{ width: 16, height: 16, accentColor: theme.accent, cursor: "pointer" }}
                      />
                      {label}
                    </label>
                    <span style={{ fontFamily: theme.font, fontSize: "0.8rem", color: theme.accent, fontWeight: 700 }}>
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
                    style={{ width: "100%", accentColor: theme.accent, marginTop: 8 }}
                  />
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            <button 
              onClick={handleApplyToAll}
              disabled={isProcessing || documents.length === 0}
              style={{ ...ui.primaryBtn, fontSize: "0.85rem", padding: "10px", width: "100%", textAlign: "center" }}>
              {isHero ? "Apply Weights & Assess All" : (hasChanged ? "Reassess All With New Weights" : "Assess All")}
            </button>
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button 
                onClick={() => { 
                  console.log("Assess Selected clicked! Opening modal with docs:", documents);
                  setSelectedDocs(new Set()); 
                  setShowSelectModal(true); 
                }}
                disabled={isProcessing || documents.length === 0}
                style={{ ...ui.ghostBtn, border: `1px solid ${theme.border}`, fontSize: "0.75rem", padding: "8px", flex: 1 }}>
                Assess Selected
              </button>
              <button onClick={reset} style={{ ...ui.ghostBtn, fontSize: "0.75rem", padding: "8px", flex: 1 }}>
                Reset Default
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Documents Modal */}
      {showSelectModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "12px",
            padding: "24px", width: "90%", maxWidth: "500px", display: "flex", flexDirection: "column", gap: "16px"
          }}>
            <h3 style={{ margin: 0, color: theme.text, fontFamily: theme.font }}>
              Select Documents to Assess
            </h3>
            <p style={{ margin: 0, color: theme.textMuted, fontSize: "0.85rem", fontFamily: theme.font }}>
              Select which documents to run through the AI assessment.
            </p>
            <div style={{ maxHeight: "300px", overflowY: "auto", border: `1px solid ${theme.surfaceAlt}`, borderRadius: "8px", padding: "8px" }}>
              {documents.map(doc => (
                <label key={doc.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px", cursor: "pointer", borderBottom: `1px solid ${theme.surfaceAlt}` }}>
                  <input 
                    type="checkbox" 
                    checked={selectedDocs.has(doc.id)} 
                    onChange={() => toggleDocSelection(doc.id)}
                    style={{ width: "16px", height: "16px" }}
                  />
                  <span style={{ color: theme.text, fontFamily: theme.font, fontSize: "0.85rem", wordWrap: "break-word" }}>
                    {doc.name || doc.fileName || doc.title || doc.file_name}
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
              <button onClick={() => setShowSelectModal(false)} style={ui.ghostBtn}>Cancel</button>
              <div style={{ display: "flex", gap: "10px" }}>
                  <button 
                    onClick={handleAssessSelected}
                    disabled={selectedDocs.size === 0 || isProcessing}
                    style={ui.primaryBtn}
                  >
                    Assess Selected
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
