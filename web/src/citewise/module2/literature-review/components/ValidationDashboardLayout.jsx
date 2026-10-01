import { useState, useEffect, useCallback, useRef } from "react";
import DocumentActiveCard from "./DocumentActiveCard";
import QuickNavigationList from "./QuickNavigationList";
import AIAssessmentPanel from "../../ai-assessment/components/AIAssessmentPanel";
import ValidationSummaryFooter from "./ValidationSummaryFooter";
import RrlUploadLayout from "../../../module1/rrl-upload/components/RrlUploadLayout";
import MetricWeightCustomization from "../../ai-assessment/components/MetricWeightCustomization";
import { apiFetch } from "../../../../api/http";
import useIsMobile from "../../../../hooks/useIsMobile";
import * as store from "../../../lib/citewiseStore";
import { useTheme } from "../../../../context/ThemeContext";
import ModernToast from "../../../../components/ui/ModernToast";

export default function ValidationDashboardLayout({ groupId, sessionId: propSessionId, onStepChange, onLockStep3 }) {
  const STORAGE_SESSION_KEY = groupId ? `citewise.${groupId}.sessionId` : "citewise.session_id";
  const LOW_RELEVANCE_APPROVAL_THRESHOLD = 60;

  const [resolvedSessionId, setResolvedSessionId] = useState(() => {
    if (propSessionId) return propSessionId;
    const stored = localStorage.getItem(STORAGE_SESSION_KEY);
    if (stored) return stored;
    const newSessionId = crypto.randomUUID ? crypto.randomUUID() : 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(STORAGE_SESSION_KEY, newSessionId);
    return newSessionId;
  });

  const isMobile = useIsMobile();
  const { isDark } = useTheme();
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

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(20);
  const [loadingStatusText, setLoadingStatusText] = useState("Connecting to workspace session...");
  const isFirstLoadRef = useRef(true);

  const [hasEverAssessed, setHasEverAssessed] = useState(() => {
    try {
      return localStorage.getItem(`citewise_has_assessed_${resolvedSessionId}`) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (documents.some((doc) => doc.rawStatus === "complete")) {
      setHasEverAssessed(true);
      try {
        localStorage.setItem(`citewise_has_assessed_${resolvedSessionId}`, "true");
      } catch {}
    }
  }, [documents, resolvedSessionId]);

  useEffect(() => {
    if (documents.length > 0) {
      const hasAnyApproved = documents.some((d) => d.approved === true);
      if (!hasAnyApproved) {
        if (groupId) {
          localStorage.setItem(`citewise.${groupId}.synthesisUnlocked`, "false");
          localStorage.setItem(`citewise.${groupId}.maxUnlockedStep`, "1");
        }
        localStorage.setItem(`citewise_proceeded_synthesis_${resolvedSessionId}`, "false");
        onLockStep3?.();
      }
    }
  }, [documents, groupId, resolvedSessionId, onLockStep3]);

  const activeDoc = documents[currentIndex];

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

      if (aPrevIndex !== undefined && bPrevIndex !== undefined) {
        return aPrevIndex - bPrevIndex;
      }
      if (aPrevIndex !== undefined) return -1;
      if (bPrevIndex !== undefined) return 1;

      return (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER);
    });

    const previousById = new Map((previous || []).map((doc) => [doc.id, doc]));
    return normalizedItems.map((item) => {
      const prev = previousById.get(item.id);
      const overallFromInsight = item.overallScore ?? (item.insight && item.insight.overallScore) ?? null;
      const rawStatus = (item.scoringStatus || item.status || "pending").toLowerCase();
      return {
        id: item.id,
        name: item.fileName || "Untitled.pdf",
        size: formatBytes(item.sizeBytes),
        pages: prev?.pages ?? "-",
        rawStatus,
        status: rawStatus === "complete" ? "Ready" : (rawStatus === "processing" ? "Assessing" : (rawStatus === "extracting" ? "Extracting Text" : (rawStatus === "pending" ? "Pending Assessment" : "Processing"))),
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
      setIsInitialLoading(true);
      setLoadingProgress(20);
      setLoadingStatusText("Connecting to workspace session...");
      isFirstLoadRef.current = true;
    }
  }, [propSessionId, resolvedSessionId]);

  const fetchDocuments = useCallback(async () => {
    if (!resolvedSessionId) {
      setIsInitialLoading(false);
      return;
    }

    if (isFirstLoadRef.current) {
      setLoadingProgress(22);
      setLoadingStatusText("Connecting to workspace session...");
    }

    const t1 = isFirstLoadRef.current ? setTimeout(() => {
      setLoadingProgress(48);
      setLoadingStatusText("Retrieving literature review documents...");
    }, 140) : null;

    try {
      const { res: response, data } = await apiFetch(`/api/v1/documents/session/${resolvedSessionId}`, {
        headers: {
          'X-Session-Id': resolvedSessionId,
        }
      });

      if (isFirstLoadRef.current) {
        setLoadingProgress(76);
        setLoadingStatusText("Calibrating relevance metrics & scoring...");
      }

      if (response.ok) {
        setDocuments((prev) => {
          const mapped = mapDocuments(Array.isArray(data) ? data : [], prev);
          if (mapped.some((doc) => doc.rawStatus === "complete")) {
            setHasEverAssessed(true);
            try {
              localStorage.setItem(`citewise_has_assessed_${resolvedSessionId}`, "true");
            } catch {}
          }
          return mapped;
        });
      }
    } catch (err) {
      console.warn("Error loading session documents:", err);
    } finally {
      if (t1) clearTimeout(t1);
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
        setTimeout(() => {
          setLoadingProgress(100);
          setLoadingStatusText("Dashboard ready!");
          setTimeout(() => {
            setIsInitialLoading(false);
          }, 350);
        }, 300);
      }
    }
  }, [resolvedSessionId]);

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
          if (activeDoc.rawStatus === 'pending' && pollAttemptsRef.current > 3) {
            setIsInsightsLoading(false);
            setInsightsPollExhausted(true);
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

    // When an approved document is unapproved or no documents are approved, lock Step 3
    if (!targetApprovalState || approvedList.length === 0) {
      if (groupId) {
        localStorage.setItem(`citewise.${groupId}.synthesisUnlocked`, "false");
        localStorage.setItem(`citewise.${groupId}.maxUnlockedStep`, "1");
      }
      localStorage.setItem(`citewise_proceeded_synthesis_${resolvedSessionId}`, "false");
      onLockStep3?.();
    }

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

  const handleBatchApprove = async (indicesToApprove) => {
    if (!indicesToApprove || indicesToApprove.length === 0) return;
    const indexSet = new Set(indicesToApprove);

    const targetDocsToApprove = [];
    const updatedDocs = documents.map((doc, i) => {
      if (indexSet.has(i)) {
        targetDocsToApprove.push(doc);
        return { ...doc, approved: true };
      }
      return doc;
    });

    setDocuments(updatedDocs);

    const approvedList = updatedDocs.filter((d) => d.approved === true);
    const storageKey = `citewise_approved_docs_${resolvedSessionId}`;
    localStorage.setItem(storageKey, JSON.stringify(approvedList));
    sessionStorage.setItem(storageKey, JSON.stringify(approvedList));

    const scoredApproved = approvedList.filter((doc) => typeof doc.relevancyScore === "number");
    const avgScore = scoredApproved.length
      ? scoredApproved.reduce((sum, doc) => sum + doc.relevancyScore, 0) / scoredApproved.length
      : 0;

    setBatchStats({
      approvedCount: approvedList.length,
      totalCount: updatedDocs.length,
      averageScore: avgScore,
    });

    try {
      await Promise.allSettled(
        targetDocsToApprove.map((doc) =>
          apiFetch(`/api/v1/documents/${doc.id}/approval`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "X-Session-Id": resolvedSessionId,
            },
            body: JSON.stringify({
              status: "APPROVED",
            }),
          })
        )
      );
    } catch (err) {
      console.warn("Backend batch approval sync skipped (offline):", err.message);
    }
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

    const wasApproved = docToDelete.approved;
    const updatedDocs = documents.filter((_, i) => i !== index);
    setDocuments(updatedDocs);

    const storageKey = `citewise_approved_docs_${resolvedSessionId}`;
    const updatedApproved = updatedDocs.filter((d) => d.approved);
    localStorage.setItem(storageKey, JSON.stringify(updatedApproved));
    sessionStorage.setItem(storageKey, JSON.stringify(updatedApproved));

    if (wasApproved || updatedApproved.length === 0) {
      if (groupId) {
        localStorage.setItem(`citewise.${groupId}.synthesisUnlocked`, "false");
        localStorage.setItem(`citewise.${groupId}.maxUnlockedStep`, "1");
      }
      localStorage.setItem(`citewise_proceeded_synthesis_${resolvedSessionId}`, "false");
      onLockStep3?.();
    }

    const currentUsage = store.getRrlUsage(resolvedSessionId) || {};
    if (currentUsage[docToDelete.id] || currentUsage[String(docToDelete.id)]) {
      const nextUsage = { ...currentUsage };
      delete nextUsage[docToDelete.id];
      delete nextUsage[String(docToDelete.id)];
      store.setRrlUsage(resolvedSessionId, nextUsage);
    }

    const scoredDocs = updatedApproved.filter((d) => typeof d.relevancyScore === "number");
    const avgScore = scoredDocs.length
      ? scoredDocs.reduce((s, d) => s + d.relevancyScore, 0) / scoredDocs.length
      : 0;
    setBatchStats({
      approvedCount: updatedApproved.length,
      totalCount: updatedDocs.length,
      averageScore: avgScore,
    });

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

    localStorage.setItem(storageKey, JSON.stringify(mergedApproved));
    sessionStorage.setItem(storageKey, JSON.stringify(mergedApproved));

    if (groupId) {
      localStorage.setItem(`citewise.${groupId}.synthesisUnlocked`, "true");
      localStorage.setItem(`citewise.${groupId}.maxUnlockedStep`, "2");
    }
    localStorage.setItem(`citewise_proceeded_synthesis_${resolvedSessionId}`, "true");

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
        0%, 100% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.2); }
        50% { box-shadow: 0 0 40px rgba(249, 115, 22, 0.4); }
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
      @keyframes cwSpin {
        to { transform: rotate(360deg); }
      }
      @keyframes cwPulseGlow {
        0%, 100% { transform: scale(1); opacity: 0.8; box-shadow: 0 0 16px rgba(234, 88, 12, 0.2); }
        50% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 30px rgba(234, 88, 12, 0.4); }
      }
      @keyframes cwIndeterminate {
        0% { left: -40%; width: 40%; }
        50% { left: 25%; width: 60%; }
        100% { left: 100%; width: 40%; }
      }
    `}</style>
  );
  const anyDocAssessed = documents.some((doc) =>
    doc.rawStatus === "complete" ||
    (doc.relevancyScore !== null && doc.relevancyScore !== undefined && doc.relevancyScore > 0)
  );
  const hasAssessedDocs = documents.length > 0 && anyDocAssessed;
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

      {approvalWarningModal.show && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(17, 24, 39, 0.6)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          animation: "fadeInToast 0.3s ease-out forwards",
        }}>
          <div style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "24px",
            padding: "clamp(1rem, 3vw, 2.5rem) clamp(1rem, 4vw, 3rem)",
            width: "max-content",
            maxWidth: "96vw",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.15), 0 0 40px rgba(249, 115, 22, 0.1)",
            animation: "scaleInToast 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            overflowX: "auto",
            overflowY: "hidden",
            boxSizing: "border-box",
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "#fff7ef",
              border: "2px solid #f97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              boxShadow: "0 0 20px rgba(249, 115, 22, 0.2)",
              animation: "pulseRing 2s infinite",
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: "1.2rem",
              color: "#111827",
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
              color: "#6b7280",
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
                  background: "#ea580c",
                  border: "1px solid #ea580c",
                  borderRadius: "8px",
                  padding: "0.85rem 1rem",
                  color: "#ffffff",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(234, 88, 12, 0.22)",
                  transition: "all 180ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.background = "#c2410c";
                  e.currentTarget.style.borderColor = "#c2410c";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background = "#ea580c";
                  e.currentTarget.style.borderColor = "#ea580c";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.22)";
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 6px rgba(234, 88, 12, 0.2)";
                }}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={handleCancelApprovalWarning}
                style={{
                  background: "transparent",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  color: "#6b7280",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transform: "scale(1)",
                  transition: "transform 0.18s ease, border-color 0.2s ease, background 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.04)";
                  e.currentTarget.style.borderColor = "#d1d5db";
                  e.currentTarget.style.background = "#f9fafb";
                  e.currentTarget.style.color = "#374151";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#6b7280";
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
          background: "rgba(17, 24, 39, 0.7)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          animation: "fadeInToast 0.3s ease-out forwards",
          fontFamily: "'Poppins', sans-serif",
        }}>
          <div className="cw-m-modal" style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "24px",
            padding: "2rem",
            maxWidth: "900px",
            width: "95%",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.15)",
            animation: "scaleInToast 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            fontFamily: "'Poppins', sans-serif",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "#f97316", margin: 0 }}>
                  Upload New RRL Documents
                </h3>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "0.8rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
                  Add candidates to the current assessment batch. Duplicates are auto-removed.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9ca3af",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
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

    <ModernToast
      show={showSuccessToast}
      type="success"
      title="Synthesis Starting"
      message="Your validated documents are ready. Transitioning to Literature Synthesis..."
      onClose={() => setShowSuccessToast(false)}
      duration={2200}
    />

      {isInitialLoading ? (
        <div className="cw-loading-container" style={{ padding: isMobile ? "2rem 1rem" : "3.5rem 1rem" }}>
          <div className="cw-loading-card" style={{ padding: isMobile ? "2rem 1.5rem" : "2.75rem 2.5rem" }}>
            {/* Guaranteed Animated SVG Spinner with glowing center */}
            <div
              style={{
                position: "relative",
                width: "80px",
                height: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
              }}
            >
              <svg width="80" height="80" viewBox="0 0 50 50" style={{ position: "absolute", inset: 0 }}>
                <circle
                  cx="25"
                  cy="25"
                  r="20"
                  fill="none"
                  stroke="rgba(234, 88, 12, 0.12)"
                  strokeWidth="3.5"
                />
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
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "rgba(234, 88, 12, 0.09)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 16px rgba(234, 88, 12, 0.25)",
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
                color: "var(--cw-text-primary, #0f0e17)",
                margin: "0 0 0.4rem 0",
                letterSpacing: "-0.01em",
              }}
            >
              Loading AI Assessment
            </h3>
            <p
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.85rem",
                color: "var(--cw-text-muted, #6b7280)",
                lineHeight: 1.55,
                margin: "0 0 1.5rem 0",
                maxWidth: "420px",
                minHeight: "1.55em",
              }}
            >
              {loadingStatusText}
            </p>

            {/* Moving Progress Bar & Percentage Count */}
            <div
              style={{
                width: "280px",
                maxWidth: "85%",
                height: "8px",
                background: "var(--cw-border, #e5e7eb)",
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
                  width: `${loadingProgress}%`,
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
              <span style={{ color: "var(--cw-text-muted, #6b7280)" }}>Loading progress</span>
              <span style={{ color: "#ea580c", fontWeight: 700 }}>{loadingProgress}%</span>
            </div>
          </div>

          {/* Shimmering skeleton cards beneath previewing layout */}
          <div className="cw-loading-skeleton-preview" style={{ marginTop: "1.5rem", width: "100%", maxWidth: "520px", display: "flex", gap: "12px" }}>
            <div className="cw-loading-skeleton-card-left" />
            <div className="cw-loading-skeleton-card-right" />
          </div>
        </div>
      ) : (
        <>
          {!hasAssessedDocs ? (
            /* Full-screen content display: ONLY Metric Weight Customization card */
            <div
              style={{
                width: "100%",
                maxWidth: "100%",
                margin: "0 auto",
                padding: isMobile ? "0 4px 80px 4px" : "4px 0 100px 0",
                boxSizing: "border-box",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                justifyContent: "flex-start",
                animation: "fadeInToast 0.35s ease-out forwards",
              }}
            >
              <MetricWeightCustomization
                sessionId={resolvedSessionId}
                documents={documents}
                onAssessmentTriggered={(assessedDocIds) => {
                  setHasEverAssessed(true);
                  try {
                    localStorage.setItem(`citewise_has_assessed_${resolvedSessionId}`, "true");
                  } catch {}
                  insightsCacheRef.current.clear();
                  setIsInsightsLoading(true);
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
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                margin: "0 auto",
                padding: 0,
                paddingBottom: isMobile ? "80px" : "100px",
                boxSizing: "border-box",
                flex: 1,
                display: isMobile ? "flex" : "grid",
                flexDirection: "column",
                gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "420px minmax(0, 1fr)",
                gap: isMobile ? "16px" : "14px",
                minHeight: 0,
                alignItems: isMobile ? "stretch" : "start",
                background: "transparent",
                animation: "fadeInToast 0.35s ease-out forwards",
              }}
            >
              {/* Sidebar with active card, quick nav, and collapsed customization panel */}
              <div style={isMobile ? { display: "contents" } : { display: "flex", flexDirection: "column", gap: isMobile ? "16px" : "14px", minHeight: 0 }}>
                <div style={{ order: 0, minWidth: 0 }} data-guide="citewise-active-doc">
                  <DocumentActiveCard
                    documents={documents}
                    currentIndex={currentIndex}
                    onNavigate={(idx) => setCurrentIndex(Math.max(0, Math.min(documents.length - 1, idx)))}
                  />
                </div>
                <div style={{ order: 2, minWidth: 0 }} data-guide="citewise-quick-nav">
                  <QuickNavigationList
                    documents={documents}
                    currentIndex={currentIndex}
                    onSelect={setCurrentIndex}
                    onApprovalToggle={handleApprovalToggle}
                    onBatchApprove={handleBatchApprove}
                    onDelete={handleDeleteDocument}
                  />
                </div>
                <div style={{ order: 3, minWidth: 0 }}>
                  <MetricWeightCustomization
                    sessionId={resolvedSessionId}
                    documents={documents}
                    onAssessmentTriggered={(assessedDocIds) => {
                      setHasEverAssessed(true);
                      try {
                        localStorage.setItem(`citewise_has_assessed_${resolvedSessionId}`, "true");
                      } catch {}
                      insightsCacheRef.current.clear();
                      setIsInsightsLoading(true);
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
                    isHero={false}
                  />
                </div>
              </div>

              {/* Main Assessment Panel */}
              <div style={{ order: 1, minWidth: 0 }} data-guide="citewise-assessment-panel">
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
              </div>
            </div>
          )}

          <ValidationSummaryFooter
            approvedCount={batchStats.approvedCount}
            totalCount={batchStats.totalCount}
            averageScore={batchStats.averageScore}
            onProceed={handleProceed}
          />
        </>
      )}
    </div>
  );
}