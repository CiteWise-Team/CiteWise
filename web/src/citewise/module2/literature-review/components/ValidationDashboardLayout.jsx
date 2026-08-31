import { useState, useEffect, useCallback, useRef } from "react";
import DocumentActiveCard from "./DocumentActiveCard";
import QuickNavigationList from "./QuickNavigationList";
import AIAssessmentPanel from "../../ai-assessment/components/AIAssessmentPanel";
import ValidationSummaryFooter from "./ValidationSummaryFooter";
import RrlUploadLayout from "../../../module1/rrl-upload/components/RrlUploadLayout";
import MetricWeightCustomization from "../../ai-assessment/components/MetricWeightCustomization";
import { apiFetch } from "../../../../api/http";
import * as store from "../../../lib/citewiseStore";

export default function ValidationDashboardLayout({ groupId, sessionId: propSessionId, onStepChange }) {
  const STORAGE_SESSION_KEY = groupId ? `citewise.${groupId}.sessionId` : "citewise.session_id";
  const LOW_RELEVANCE_APPROVAL_THRESHOLD = 60;

  // Use sessionId from prop or generate/get from localStorage
  const [resolvedSessionId, setResolvedSessionId] = useState(() => {
    if (propSessionId) return propSessionId;
    const stored = localStorage.getItem(STORAGE_SESSION_KEY);
    if (stored) return stored;
    // Generate new session ID if none exists
    const newSessionId = crypto.randomUUID ? crypto.randomUUID() : 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(STORAGE_SESSION_KEY, newSessionId);
    return newSessionId;
  });

  const [documents, setDocuments] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRrlUpload, setShowRrlUpload] = useState(false);
  const [activeInsights, setActiveInsights] = useState(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [insightsPollExhausted, setInsightsPollExhausted] = useState(false);
  const [insightsErrorMsg, setInsightsErrorMsg] = useState(null);
  const [assessVersion, setAssessVersion] = useState(0);
  const pollAttemptsRef = useRef(0);
  const insightsCacheRef = useRef(new Map());
  const [showLowRelevanceWarningModal, setShowLowRelevanceWarningModal] = useState(false);
  const [pendingApprovalIndex, setPendingApprovalIndex] = useState(null);
  const [batchStats, setBatchStats] = useState({
    approvedCount: 0,
    totalCount: 0,
    averageScore: 0,
  });
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [approvalWarningModal, setApprovalWarningModal] = useState({
    show: false,
    docId: null,
    message: "",
  });

  // State for modular Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Only a *completed* assessment retires the weight-customization hero panel.
  // Flipping on "processing" meant that assessing one document swapped the panel
  // out on the very next poll, so a user assessing files one at a time with
  // different weights lost the controls before they could set up the second file.
  const [hasEverAssessed, setHasEverAssessed] = useState(false);
  useEffect(() => {
    if (documents.some((doc) => doc.rawStatus === "complete")) {
      setHasEverAssessed(true);
    }
  }, [documents]);

  const activeDoc = documents[currentIndex];

  // Save sessionId to localStorage when it changes
  useEffect(() => {
    if (resolvedSessionId) {
      localStorage.setItem(STORAGE_SESSION_KEY, resolvedSessionId);
    }
  }, [resolvedSessionId]);

  const formatBytes = (bytes) => {
    if (bytes === null || bytes === undefined) return "-";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const mapStatus = (status) => (status === "complete" ? "Ready" : "Processing");

  const mapDocuments = (items, previous) => {
    const previousOrderById = new Map((previous || []).map((doc, idx) => [doc.id, idx]));
    const normalizedItems = [...items].sort((a, b) => {
      const aPrevIndex = previousOrderById.get(a.id);
      const bPrevIndex = previousOrderById.get(b.id);

      // Keep existing documents in their previous visible order.
      if (aPrevIndex !== undefined && bPrevIndex !== undefined) {
        return aPrevIndex - bPrevIndex;
      }
      if (aPrevIndex !== undefined) return -1;
      if (bPrevIndex !== undefined) return 1;

      // Deterministic order for brand-new documents.
      return (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER);
    });

    const previousById = new Map((previous || []).map((doc) => [doc.id, doc]));
    return normalizedItems.map((item) => {
      const prev = previousById.get(item.id);
      // Prefer a backend-provided overallScore if present (ensures weighted score used),
      // otherwise fall back to legacy relevancyScore field.
      const overallFromInsight = item.overallScore ?? (item.insight && item.insight.overallScore) ?? null;
      const rawStatus = (item.scoringStatus || item.status || "pending").toLowerCase();
      return {
        id: item.id,
        name: item.fileName || "Untitled.pdf",
        size: formatBytes(item.sizeBytes),
        pages: prev?.pages ?? "-",
        rawStatus,
        status: rawStatus === "complete" ? "Ready" : (rawStatus === "processing" ? "Assessing" : (rawStatus === "pending" ? "Pending Assessment" : "Processing")),
        approved: item.approved === true || item.approved === 1 || item.approved === "true" || prev?.approved === true,
        relevancyScore: overallFromInsight ?? item.relevancyScore ?? null,
        recommendationStatus: item.recommendationStatus ?? item.insight?.recommendationStatus ?? null,
        relevanceLevel: item.relevanceLevel ?? item.insight?.relevanceLevel ?? null,
        metricWeights: item.metricWeights ?? item.insight?.metricWeights ?? null,
      };
    });
  };

  useEffect(() => {
    if (propSessionId && propSessionId !== resolvedSessionId) {
      setResolvedSessionId(propSessionId);
      setDocuments([]);
      setCurrentIndex(0);
      setActiveInsights(null);
      setIsInsightsLoading(false);
      setInsightsPollExhausted(false);
    }
  }, [propSessionId, resolvedSessionId]);

  const fetchDocuments = useCallback(async () => {
    if (!resolvedSessionId) return;
    try {
      const { res: response, data } = await apiFetch(`/api/v1/documents/session/${resolvedSessionId}`, {
        headers: {
          'X-Session-Id': resolvedSessionId,
        }
      });
      if (!response.ok) return;
      setDocuments((prev) => mapDocuments(Array.isArray(data) ? data : [], prev));
    } catch (err) {
      console.warn("Error loading session documents:", err);
    }
  }, [resolvedSessionId]);

  // Adaptive polling. A flat 5s interval costs ~120 requests / 10 min per open
  // tab even when nothing is happening, which on its own exhausted the API rate
  // limit and surfaced as an opaque "Failed to fetch". Poll quickly only while a
  // document is actually pending or being assessed, then back off.
  const documentsActiveRef = useRef(false);
  useEffect(() => {
    documentsActiveRef.current = documents.some(
      (doc) => doc.rawStatus === "pending" || doc.rawStatus === "processing"
    );
  }, [documents]);

  useEffect(() => {
    if (!resolvedSessionId) return;
    let cancelled = false;
    let timer = null;

    const tick = async () => {
      if (cancelled) return;
      await fetchDocuments();
      if (cancelled) return;
      timer = setTimeout(tick, documentsActiveRef.current ? 5000 : 30000);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [resolvedSessionId, fetchDocuments]);

  useEffect(() => {
    if (currentIndex >= documents.length) {
      setCurrentIndex(0);
    }
  }, [documents.length, currentIndex]);

  useEffect(() => {
    if (!activeDoc?.id) {
      setActiveInsights(null);
      setIsInsightsLoading(false);
      setInsightsPollExhausted(false);
      return;
    }

    let cancelled = false;
    let pollTimeout = null;
    pollAttemptsRef.current = 0;
    setInsightsPollExhausted(false);

    const fetchInsightsData = async () => {
      if (cancelled) return;
      
      // If we already have this in cache, show it instantly
      if (insightsCacheRef.current.has(activeDoc.id)) {
        setActiveInsights(insightsCacheRef.current.get(activeDoc.id));
        setIsInsightsLoading(false);
        setInsightsErrorMsg(null);
      } else {
        setIsInsightsLoading(true);
      }
      
      try {
        const { res: response, data } = await apiFetch(`/api/v1/documents/${activeDoc.id}/insights`, {
          cache: "no-store",
          headers: {
            'X-Session-Id': resolvedSessionId,
          }
        });
        if (cancelled) return;

        if (response.status === 202) {
          // Document is processing, continue polling
          pollAttemptsRef.current += 1;
          if (pollAttemptsRef.current >= 50) {
            setIsInsightsLoading(false);
            setInsightsPollExhausted(true);
            setInsightsErrorMsg("Assessment took too long.");
            return;
          }
          pollTimeout = setTimeout(fetchInsightsData, 5000);
          return;
        }

        if (response.ok) {
          insightsCacheRef.current.set(activeDoc.id, data);
          setActiveInsights(data);
          setIsInsightsLoading(false);
          setInsightsPollExhausted(false);
          setInsightsErrorMsg(null);
          return;
        }

        if (response.status === 404) {
          // If the document is explicitly pending, it might be about to start (race condition).
          // Give it a few seconds (e.g., 3 polls) to transition to processing before giving up.
          if (activeDoc.rawStatus === 'pending' && pollAttemptsRef.current > 3) {
            setIsInsightsLoading(false);
            setInsightsPollExhausted(true); // Treated as not assessed
            return;
          }

          pollAttemptsRef.current += 1;
          if (pollAttemptsRef.current >= 50) {
            setIsInsightsLoading(false);
            setInsightsPollExhausted(true);
            return;
          }
          pollTimeout = setTimeout(fetchInsightsData, 5000);
          return;
        }

        setIsInsightsLoading(false);
        setInsightsPollExhausted(true);
        setInsightsErrorMsg(data?.message || "Assessment failed.");
      } catch (err) {
        if (cancelled) return;
        console.warn("Failed to load insights:", err);
        setIsInsightsLoading(false);
        setInsightsPollExhausted(true);
        setInsightsErrorMsg(err.message || "Failed to load insights.");
      }
    };

    fetchInsightsData();

    return () => {
      cancelled = true;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [activeDoc?.id, resolvedSessionId, assessVersion]);

  const handleAssessDocument = useCallback(async () => {
    if (!activeDoc?.id) return;
    insightsCacheRef.current.delete(activeDoc.id);
    setActiveInsights(null);
    setIsInsightsLoading(true);
    setInsightsPollExhausted(false);
    setInsightsErrorMsg(null);
    pollAttemptsRef.current = 0;
    try {
      const prefs = store.getScorePrefs(resolvedSessionId);
      const weights = {
        gap: prefs.enabled.gapAlignment ? prefs.weights.gapAlignment : 0,
        methodology: prefs.enabled.methodology ? prefs.weights.methodology : 0,
        theory: prefs.enabled.theoretical ? prefs.weights.theoretical : 0,
        citation: prefs.enabled.citation ? prefs.weights.citation : 0,
      };

      const { res: response, data } = await apiFetch(`/api/v1/documents/assess-batch`, {
        method: "POST",
        headers: {
          'X-Session-Id': resolvedSessionId,
        },
        body: JSON.stringify({ documentIds: [activeDoc.id], weights, overwriteWeights: true })
      });
      if (!response.ok) {
        console.warn("Failed to start assessment");
        setIsInsightsLoading(false);
        setInsightsPollExhausted(true);
        setInsightsErrorMsg(data?.message || `Failed to start assessment: ${response.status}`);
      } else {
        setAssessVersion((v) => v + 1);
      }
    } catch (err) {
      console.warn("Failed to start assessment:", err);
      setIsInsightsLoading(false);
      setInsightsPollExhausted(true);
      setInsightsErrorMsg(err.message || "Failed to start assessment");
    }
  }, [activeDoc?.id, resolvedSessionId]);

  useEffect(() => {
    const approvedDocs = documents.filter((doc) => doc.approved);
    const approved = approvedDocs.length;
    const scoredApproved = approvedDocs.filter((doc) => typeof doc.relevancyScore === "number");
    const averageScore = scoredApproved.length
      ? scoredApproved.reduce((sum, doc) => sum + doc.relevancyScore, 0) / scoredApproved.length
      : 0;
    setBatchStats({
      approvedCount: approved,
      totalCount: documents.length,
      averageScore,
    });
  }, [documents]);

  const applyApprovalToggle = async (index, targetApprovalState) => {
    const docToToggle = documents[index];
    if (!docToToggle) return;

    const updatedDocs = documents.map((doc, i) =>
      i === index ? { ...doc, approved: targetApprovalState } : doc
    );
    setDocuments(updatedDocs);

    const approvedList = updatedDocs.filter((d) => d.approved === true);
    const storageKey = `citewise_approved_docs_${resolvedSessionId}`;
    localStorage.setItem(storageKey, JSON.stringify(approvedList));
    sessionStorage.setItem(storageKey, JSON.stringify(approvedList));

    setBatchStats((prev) => ({
      ...prev,
      approvedCount: updatedDocs.filter((d) => d.approved).length,
      totalCount: updatedDocs.length,
    }));

    try {
      const { res: response, data } = await apiFetch(`/api/v1/documents/${docToToggle.id}/approval`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": resolvedSessionId,
        },
        body: JSON.stringify({
          status: targetApprovalState ? "APPROVED" : "READY",
        }),
      });

      if (response.ok && data) {
        const approvedDocs = updatedDocs.filter((d) => d.approved);
        const scoredApproved = approvedDocs.filter((d) => typeof d.relevancyScore === "number");
        const avgScore = scoredApproved.length
          ? scoredApproved.reduce((sum, d) => sum + d.relevancyScore, 0) / scoredApproved.length
          : 0;

        setBatchStats({
          approvedCount: data.batchStats?.approvedCount ?? approvedDocs.length,
          totalCount: updatedDocs.length,
          averageScore: avgScore,
        });
      }
    } catch (err) {
      console.warn("Backend sync skipped (offline):", err.message);
    }
  };

  const handleApprovalToggle = async (index) => {
    const docToToggle = documents[index];
    if (!docToToggle) return;
    const targetApprovalState = !docToToggle.approved;
    await applyApprovalToggle(index, targetApprovalState);
  };

  const handleConfirmApprovalWarning = async () => {
    const { docId } = approvalWarningModal;
    setApprovalWarningModal({ show: false, docId: null, message: "" });
    if (!docId) return;

    const targetIndex = documents.findIndex((doc) => doc.id === docId);
    if (targetIndex === -1) return;
    if (documents[targetIndex].approved) return;

    await applyApprovalToggle(targetIndex, true);
  };

  const handleCancelApprovalWarning = () => {
    setApprovalWarningModal({ show: false, docId: null, message: "" });
  };

  const handleDeleteDocument = async (index) => {
    const docToDelete = documents[index];
    if (!docToDelete?.id) return;

    const updatedDocs = documents.filter((_, i) => i !== index);
    setDocuments(updatedDocs);

    if (index < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    } else if (index === currentIndex) {
      setCurrentIndex(Math.min(currentIndex, Math.max(0, updatedDocs.length - 1)));
    }

    try {
      const { res: response } = await apiFetch(`/api/v1/documents/${docToDelete.id}`, {
        method: "DELETE",
        headers: {
          'X-Session-Id': resolvedSessionId,
        }
      });
      if (!response.ok && response.status !== 404) {
        await fetchDocuments();
      }
    } catch (err) {
      console.warn("Failed to delete document:", err);
      await fetchDocuments();
    }
  };

  const handleUploadNew = () => {
    setShowUploadModal(true);
  };

const handleProceed = () => {
  // Get currently approved documents from current session
  const currentlyApproved = documents.filter(doc => doc.approved === true);
  const currentDocKeys = new Set(
    documents.map((doc) => doc.id || doc.name || doc.fileName).filter(Boolean)
  );
  
  console.log("=== PROCEED TO SYNTHESIS ===");
  console.log("Currently approved in Module 2:", currentlyApproved.map(d => d.name));
  
  const storageKey = `citewise_approved_docs_${resolvedSessionId}`;
  
  const mergedApproved = currentlyApproved.filter((doc) => currentDocKeys.has(doc.id || doc.name || doc.fileName));
  console.log("FINAL approved documents for current session:", mergedApproved.map(d => d.name || d.fileName));
  console.log("Total approved documents count:", mergedApproved.length);
  
  // Save merged list to localStorage
  localStorage.setItem(storageKey, JSON.stringify(mergedApproved));
  
  // Also save to sessionStorage for redundancy
  sessionStorage.setItem(storageKey, JSON.stringify(mergedApproved));
  
  setShowSuccessToast(true);
  setTimeout(() => {
    onStepChange(2, resolvedSessionId);
  }, 2200);
};

  const styleInject = (
    <style>{`
      @keyframes fadeInToast {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleInToast {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes pulseRing {
        0%, 100% { box-shadow: 0 0 20px rgba(91, 91, 214, 0.2); }
        50% { box-shadow: 0 0 40px rgba(91, 91, 214, 0.4); }
      }
      @keyframes drawCheckmark {
        to { stroke-dashoffset: 0; }
      }
      @keyframes fillProgress {
        to { width: 100%; }
      }
      @keyframes slideInToast {
        from { opacity: 0; transform: translateX(50px) scale(0.95); }
        to { opacity: 1; transform: translateX(0) scale(1); }
      }
    `}</style>
  );
  const hasAssessedDocs = hasEverAssessed && documents.length > 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Poppins', sans-serif",
        flex: 1,
      }}
    >
      {styleInject}

      {/* (Approval Modal and Upload Modal remain the same) */}
      {approvalWarningModal.show && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(14, 12, 10, 0.75)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          animation: "fadeInToast 0.3s ease-out forwards",
        }}>
          {/* ... modal content ... */}
          <div style={{
            background: "#1e1e2f",
            border: "1px solid rgba(91, 91, 214, 0.25)",
            borderRadius: "24px",
            padding: "clamp(1rem, 3vw, 2.5rem) clamp(1rem, 4vw, 3rem)",
            width: "max-content",
            maxWidth: "96vw",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(91, 91, 214, 0.15)",
            animation: "scaleInToast 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            overflowX: "auto",
            overflowY: "hidden",
            boxSizing: "border-box",
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "rgba(91, 91, 214, 0.1)",
              border: "2px solid #5b5bd6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              boxShadow: "0 0 20px rgba(91, 91, 214, 0.2)",
              animation: "pulseRing 2s infinite",
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5b5bd6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: "1.2rem",
              color: "#e4e4f0",
              margin: "0 0 0.75rem 0",
              letterSpacing: "0.01em",
              maxWidth: "600px",
              lineHeight: "1.4"
            }}>
              {approvalWarningModal.message}
            </h3>
            <p style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.95rem",
              color: "rgba(240, 236, 230, 0.7)",
              lineHeight: "1.6",
              margin: "0 0 1.75rem 0",
            }}>
              Are you sure you want to approve this document?
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.9rem",
            }}>
              <button
                type="button"
                onClick={handleConfirmApprovalWarning}
                style={{
                  background: "#5b5bd6",
                  border: "none",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  color: "#e4e4f0",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transform: "scale(1)",
                  boxShadow: "0 0 0 rgba(91, 91, 214, 0)",
                  transition: "transform 0.18s ease, box-shadow 0.22s ease, background 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.04)";
                  e.currentTarget.style.background = "#6f6fe0";
                  e.currentTarget.style.boxShadow = "0 0 24px rgba(91, 91, 214, 0.45), 0 0 42px rgba(91, 91, 214, 0.28)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background = "#5b5bd6";
                  e.currentTarget.style.boxShadow = "0 0 0 rgba(91, 91, 214, 0)";
                }}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={handleCancelApprovalWarning}
                style={{
                  background: "transparent",
                  border: "1px solid #3a3a55",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  color: "#e4e4f0",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transform: "scale(1)",
                  transition: "transform 0.18s ease, border-color 0.2s ease, background 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.04)";
                  e.currentTarget.style.borderColor = "#a1a1b5";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.borderColor = "#3a3a55";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                NO
              </button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(14, 12, 10, 0.8)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          animation: "fadeInToast 0.3s ease-out forwards",
          fontFamily: "'Poppins', sans-serif",
        }}>
          <div style={{
            background: "#1e1e2f",
            border: "1px solid #3a3a55",
            borderRadius: "24px",
            padding: "2rem",
            maxWidth: "900px",
            width: "95%",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)",
            animation: "scaleInToast 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            fontFamily: "'Poppins', sans-serif",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "#6f6fe0", margin: 0 }}>
                  Upload New RRL Documents
                </h3>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "0.8rem", color: "#a1a1b5", margin: "0.25rem 0 0" }}>
                  Add candidates to the current assessment batch. Duplicates are auto-removed.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#a1a1b5",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflow: "hidden" }}>
              <RrlUploadLayout 
                sessionId={resolvedSessionId} 
                hideHeader={true}
                onUploadComplete={async () => {
                  await fetchDocuments();
                  setTimeout(() => {
                    setShowUploadModal(false);
                  }, 2000);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(14, 12, 10, 0.75)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          animation: "fadeInToast 0.3s ease-out forwards",
        }}>
          <div style={{
            background: "#1e1e2f",
            border: "1px solid rgba(91, 91, 214, 0.25)",
            borderRadius: "24px",
            padding: "2.5rem 3rem",
            maxWidth: "480px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(91, 91, 214, 0.15)",
            animation: "scaleInToast 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "rgba(91, 91, 214, 0.1)",
              border: "2px solid #5b5bd6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              boxShadow: "0 0 20px rgba(91, 91, 214, 0.2)",
              animation: "pulseRing 2s infinite",
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5b5bd6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" style={{
                  strokeDasharray: 50,
                  strokeDashoffset: 50,
                  animation: "drawCheckmark 0.6s ease-out 0.2s forwards",
                }} />
              </svg>
            </div>
            <h3 style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: "1.5rem",
              color: "#e4e4f0",
              margin: "0 0 0.5rem 0",
              letterSpacing: "0.01em",
            }}>
              Synthesis Starting
            </h3>
            <p style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.95rem",
              color: "rgba(240, 236, 230, 0.7)",
              lineHeight: "1.6",
              margin: "0 0 1.75rem 0",
            }}>
              Your validated documents are being synthesized. Preparing the synthesis dashboard.
            </p>
            <div style={{
              width: "100%",
              height: "4px",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "2px",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                background: "linear-gradient(90deg, #5b5bd6, #5b5bd6)",
                width: "0%",
                borderRadius: "2px",
                animation: "fillProgress 2.2s linear forwards",
              }} />
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          maxWidth: 1400,
          width: "100%",
          margin: "0 auto",
          padding: "2rem 2.5rem 3rem",
          boxSizing: "border-box",
          flex: 1,
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: "24px",
          minHeight: 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", minHeight: 0 }}>
          <DocumentActiveCard
            documents={documents}
            currentIndex={currentIndex}
            onNavigate={(idx) => setCurrentIndex(Math.max(0, Math.min(documents.length - 1, idx)))}
          />
          <QuickNavigationList
            documents={documents}
            currentIndex={currentIndex}
            onSelect={setCurrentIndex}
            onApprovalToggle={handleApprovalToggle}
            onDelete={handleDeleteDocument}
          />
          {hasAssessedDocs && (
            <MetricWeightCustomization 
              sessionId={resolvedSessionId} 
              documents={documents}
              onAssessmentTriggered={(assessedDocIds) => {
                insightsCacheRef.current.clear();
                setAssessVersion(v => v + 1);
                fetchDocuments();
                if (assessedDocIds && assessedDocIds.length > 0) {
                  const targetId = assessedDocIds[0];
                  const idx = documents.findIndex(d => d.id === targetId);
                  if (idx !== -1) {
                    setCurrentIndex(idx);
                  }
                }
              }}
            />
          )}
        </div>

        {!hasAssessedDocs ? (
          <MetricWeightCustomization 
            sessionId={resolvedSessionId} 
            documents={documents}
            onAssessmentTriggered={(assessedDocIds) => {
              insightsCacheRef.current.clear();
              setAssessVersion(v => v + 1);
              fetchDocuments();
              if (assessedDocIds && assessedDocIds.length > 0) {
                const targetId = assessedDocIds[0];
                const idx = documents.findIndex(d => d.id === targetId);
                if (idx !== -1) {
                  setCurrentIndex(idx);
                }
              }
            }}
            isHero={true}
          />
        ) : (
          <AIAssessmentPanel
            documentId={activeDoc?.id}
            sessionId={resolvedSessionId}
            insights={activeInsights}
            isLoading={isInsightsLoading}
            error={insightsErrorMsg || (insightsPollExhausted ? "poll exhausted" : null)}
            assessmentTimedOut={insightsPollExhausted}
            onAssess={handleAssessDocument}
            onUploadClick={handleUploadNew}
            docStatus={activeDoc?.rawStatus}
            metricWeights={activeDoc?.metricWeights}
          />
        )}
      </div>

      <ValidationSummaryFooter
        approvedCount={batchStats.approvedCount}
        totalCount={batchStats.totalCount}
        averageScore={batchStats.averageScore}
        onProceed={handleProceed}
      />
    </div>
  );
}
