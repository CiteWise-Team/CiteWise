import React, { useState, useEffect } from 'react';
import EvidenceExcerptList from './EvidenceExcerptList';
import SemanticScoreDashboard from './SemanticScoreDashboard';
import UploadNewPDFButton from './UploadNewPDFButton';
import RrlUsagePanel from './RrlUsagePanel';
import * as store from '../../../lib/citewiseStore';
import { apiFetch } from '../../../../api/http';

const PANEL_HEADER_PADDING = '1.125rem 1.5rem';
const PANEL_CONTENT_PADDING = '24px';

// Global cache to prevent re-fetching when switching tabs
const insightsCache = new Map();

// ── Shared style tokens ─────────────────────────────────────────
const panelStyle = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '32px',
  flex: 1,
  minWidth: 0,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
  overflow: 'hidden',
};

const panelHeaderStyle = {
  padding: PANEL_HEADER_PADDING,
  background: 'linear-gradient(180deg, #fff2e0 0%, #ffe9d1 100%)',
  borderBottom: '1px solid rgba(249, 115, 22, 0.18)',
};

const AIAssessmentPanel = ({
  documentId,
  sessionId,
  insights: externalInsights,
  isLoading: externalLoading,
  error: externalError,
  onAssess: externalAssess,
  onUploadPDF: externalUploadPDF,
  onPdfUploaded: externalPdfUploaded,
  onUploadClick,
  assessmentTimedOut = false,
  docStatus,
  metricWeights,
}) => {
  const useExternal = externalInsights !== undefined || externalLoading !== undefined;

  const [insights, setInsights] = useState(() => {
    if (useExternal) return externalInsights;
    if (documentId && insightsCache.has(documentId)) return insightsCache.get(documentId);
    return null;
  });

  const [loading, setLoading] = useState(() => {
    if (useExternal) return externalLoading;
    if (documentId && insightsCache.has(documentId)) return false;
    return true;
  });

  const [error, setError] = useState(useExternal ? externalError : null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const resolvedInsights = useExternal ? externalInsights : insights;
  const resolvedLoading = useExternal ? Boolean(externalLoading) : loading;
  const resolvedError = useExternal ? externalError : error;
  // Re-render the recomputed overall score when the user changes weight prefs.
  const [prefsVersion, setPrefsVersion] = useState(0);

  useEffect(() => {
    const unsub = store.subscribe(({ name }) => {
      if (name === "scorePrefs") setPrefsVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  // Sync state if props change (when external insights provided)
  useEffect(() => {
    if (useExternal) {
      setInsights(externalInsights);
      setLoading(externalLoading);
      setError(externalError);
    }
  }, [useExternal, externalInsights, externalLoading, externalError]);

  // Polling / fetch logic
  useEffect(() => {
    if (!documentId || useExternal) return;

    // Immediately load from cache when documentId changes
    if (insightsCache.has(documentId)) {
      setInsights(insightsCache.get(documentId));
      setLoading(false);
    } else {
      setInsights(null);
      setLoading(true);
    }

    let pollTimeout = null;
    let isMounted = true;

    const fetchInsights = async () => {
      if (isMounted && !pollTimeout && !insightsCache.has(documentId)) setLoading(true);
      try {
        const { res: response, data } = await apiFetch(`/api/v1/documents/${documentId}/insights`);

        if (response.status === 404) {
          if (isMounted) {
            setInsights(null);
            setError(null);
            setLoading(true);
            pollTimeout = setTimeout(fetchInsights, 5000);
          }
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch document insights');
        }

        if (isMounted) {
          insightsCache.set(documentId, data);
          setInsights(data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchInsights();

    return () => {
      isMounted = false;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [documentId, refreshKey, useExternal]);

  const handleAssess = async () => {
    if (!documentId || isAssessing) return;

    setIsAssessing(true);
    setError(null);

    try {
      if (externalAssess) {
        await externalAssess();
        return;
      }

      const { res: response } = await apiFetch(`/api/v1/documents/${documentId}/assess`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start assessment');
      }

      insightsCache.delete(documentId);
      setInsights(null);
      setLoading(true);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAssessing(false);
    }
  };

  // Helper to map API data to the format expected by the new child components
  const getMappedData = () => {
    if (!resolvedInsights) return null;
    const responseScores = resolvedInsights.scores || {};
    return {
      excerpts: Array.isArray(resolvedInsights.evidenceExcerpts)
        ? resolvedInsights.evidenceExcerpts.map((e) => ({
            criterion: e.criterion || null,
            quoteText: e.quoteText || e.quote || e.text || "",
            pageNumber: e.pageNumber ?? e.page ?? null,
            relevanceLevel: e.relevanceLevel || e.relevance || null,
            evidenceType: e.evidenceType || e.type || null,
            displayOrder: e.displayOrder ?? null,
          }))
        : [],
      scores: {
        gapAlignment: resolvedInsights.gapAlignmentScore ?? resolvedInsights.gapAlignment ?? responseScores.gapAlignment ?? responseScores.gapAlignmentScore ?? 0,
        methodology: resolvedInsights.methodologyScore ?? resolvedInsights.methodology ?? responseScores.methodology ?? responseScores.methodologyScore ?? 0,
        theoretical: resolvedInsights.theoreticalScore ?? resolvedInsights.theory ?? responseScores.theoretical ?? responseScores.theory ?? responseScores.theoreticalScore ?? responseScores.theoryScore ?? 0,
        citation: resolvedInsights.citationScore ?? resolvedInsights.citationQuality ?? responseScores.citation ?? responseScores.citationQuality ?? responseScores.citationScore ?? 0,
        overall: resolvedInsights.overallScore ?? resolvedInsights.overall ?? responseScores.overall ?? responseScores.overallScore ?? resolvedInsights.averageOverallScore ?? null,
      },
      recommendationStatus: resolvedInsights.recommendationStatus || resolvedInsights.recommendation || null,
      confidenceLevel: resolvedInsights.confidenceLevel || null,
      relevanceLevel: resolvedInsights.relevanceLevel || null,
      mismatchFlags: Array.isArray(resolvedInsights.mismatchFlags) ? resolvedInsights.mismatchFlags : [],
      weaknessFlags: Array.isArray(resolvedInsights.weaknessFlags) ? resolvedInsights.weaknessFlags : [],
      validationFlags: Array.isArray(resolvedInsights.validationFlags) ? resolvedInsights.validationFlags : [],
    };
  };

  const mappedData = getMappedData();

  // Recompute overall from user weight prefs
  void prefsVersion;
  if (mappedData) {
    const prefs = store.getScorePrefs(sessionId);
    const recomputed = store.recomputeOverall(mappedData.scores, prefs);
    if (recomputed != null) {
      mappedData.scores = { ...mappedData.scores, overall: recomputed };
    }
  }

  // --- Helper: Panel header with both buttons ---
  const PanelHeader = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <h2
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: '22px',
          fontWeight: '700',
          color: '#f97316',
          margin: 0,
        }}
      >
        AI Assessment Panel
      </h2>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {documentId && (
          <button
            onClick={handleAssess}
            disabled={isAssessing}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: '#f97316',
              border: '1px solid #f97316',
              borderRadius: '8px',
              fontFamily: "'Poppins', sans-serif",
              fontSize: '14px',
              fontWeight: '600',
              cursor: isAssessing ? 'wait' : 'pointer',
              opacity: isAssessing ? 0.75 : 1,
              boxShadow: isAssessing ? '0 0 12px rgba(249, 115, 22, 0.35)' : 'none',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              if (!isAssessing) {
                e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
              }
            }}
            onMouseOut={(e) => {
              if (!isAssessing) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {isAssessing ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <line x1="12" y1="2" x2="12" y2="6"></line>
                  <line x1="12" y1="18" x2="12" y2="22"></line>
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                  <line x1="2" y1="12" x2="6" y2="12"></line>
                  <line x1="18" y1="12" x2="22" y2="12"></line>
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                Assessing...
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              </span>
            ) : resolvedInsights ? 'Reassess' : 'Assess Selected'}
          </button>
        )}
        <UploadNewPDFButton onClick={onUploadClick || externalUploadPDF} />
      </div>
    </div>
  );

  // --- Empty state (no document selected) ---
  if (!documentId && !useExternal) {
    return (
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <PanelHeader />
        </div>
        <div style={{ padding: PANEL_CONTENT_PADDING }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', flexDirection: 'column', gap: '12px' }}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '13px',
                color: '#6b7280',
                margin: 0,
              }}
            >
              Select a document to view AI insights.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Loading state ---
  if (resolvedLoading || isAssessing) {
    return (
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <PanelHeader />
        </div>
        <div style={{ padding: PANEL_CONTENT_PADDING, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              fontFamily: "'Poppins', sans-serif",
              fontSize: '13px',
              color: '#6b7280',
              letterSpacing: '0.5px',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', color: '#f97316' }}>
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
            {isAssessing ? 'Starting assessment...' : 'Analyzing document content...'}
          </div>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (resolvedError) {
    return (
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <PanelHeader />
        </div>
        <div style={{ padding: PANEL_CONTENT_PADDING }}>
          <div
            style={{
              background: 'rgba(220, 38, 38, 0.06)',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <h3
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '16px',
                color: '#dc2626',
                margin: '0 0 8px 0',
              }}
            >
              Analysis Error
            </h3>
            <p
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '13px',
                color: '#374151',
                margin: 0,
              }}
            >
              {resolvedError}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- No insights available ---
  if (!resolvedInsights || !mappedData) {
    let waitingMessage = 'No insights available yet. Click "Assess Selected" to start the AI assessment.';
    if (docStatus === 'pending') {
      waitingMessage = 'Not yet assessed. Click "Assess Selected" to start the AI assessment.';
    } else if (assessmentTimedOut) {
      waitingMessage = 'Assessment did not return results. Check backend logs and your n8n Code node (it may be returning empty {}). Click Assess Selected to try again.';
    }
    return (
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <PanelHeader />
        </div>
        <div style={{ padding: PANEL_CONTENT_PADDING, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', textAlign: 'center' }}>
          <p
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: '13px',
              color: '#6b7280',
            }}
          >
            {waitingMessage}
          </p>
        </div>
      </div>
    );
  }

  // --- Success state ---
  return (
    <div style={panelStyle}>
      <div style={panelHeaderStyle}>
        <PanelHeader />
      </div>
      <div style={{ padding: `0 ${PANEL_CONTENT_PADDING} ${PANEL_CONTENT_PADDING} ${PANEL_CONTENT_PADDING}` }}>
        <EvidenceExcerptList excerpts={mappedData.excerpts} />
        <div style={{ height: '35px' }} />
        <SemanticScoreDashboard
          scores={mappedData.scores}
          recommendationStatus={mappedData.recommendationStatus}
          confidenceLevel={mappedData.confidenceLevel}
          relevanceLevel={mappedData.relevanceLevel}
          mismatchFlags={mappedData.mismatchFlags}
          weaknessFlags={mappedData.weaknessFlags}
          validationFlags={mappedData.validationFlags}
          metricWeights={metricWeights}
        />
        <RrlUsagePanel
          sessionId={sessionId}
          documentId={documentId}
          excerpts={mappedData.excerpts}
        />
      </div>
    </div>
  );
};

export default AIAssessmentPanel;