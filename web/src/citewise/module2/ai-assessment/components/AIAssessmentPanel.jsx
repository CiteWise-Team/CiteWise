import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
  background: 'var(--cw-bg-surface, #ffffff)',
  border: '1px solid var(--cw-border, #e5e7eb)',
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
  background: 'var(--cw-bg-surface-elevated, #f9fafb)',
  borderBottom: '1px solid var(--cw-border, #e5e7eb)',
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
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  // Re-render the recomputed overall score when the user changes weight prefs.
  const [prefsVersion, setPrefsVersion] = useState(0);

  // Synchronized active loading progression
  const [panelProgress, setPanelProgress] = useState(25);
  const [panelStatusText, setPanelStatusText] = useState("Analyzing document content...");

  useEffect(() => {
    if (!resolvedLoading && !isAssessing) {
      setPanelProgress(25);
      return;
    }
    setPanelProgress(25);
    setPanelStatusText(
      isAssessing
        ? "Submitting document for AI evaluation..."
        : "Reading document excerpts & methodology..."
    );

    const t1 = setTimeout(() => {
      setPanelProgress(52);
      setPanelStatusText(
        isAssessing
          ? "Evaluating study relevance & findings..."
          : "Extracting key research arguments & evidence..."
      );
    }, 600);

    const t2 = setTimeout(() => {
      setPanelProgress(78);
      setPanelStatusText(
        isAssessing
          ? "Calibrating alignment metrics & scoring..."
          : "Synthesizing document insights..."
      );
    }, 1300);

    const t3 = setTimeout(() => {
      setPanelProgress(94);
      setPanelStatusText("Finalizing assessment report...");
    }, 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [resolvedLoading, isAssessing, documentId]);

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
        width: '100%',
      }}
    >
      <div>
        <h2
          className="workflow-card-header-title cw-panel-title"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '1.05rem',
            fontWeight: '700',
            color: 'var(--cw-text-primary, #0f0e17)',
            margin: 0,
            letterSpacing: '0.01em',
          }}
        >
          AI Assessment Panel
        </h2>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        {documentId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAssess();
            }}
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
                e.currentTarget.style.background = 'rgba(234, 88, 12, 0.1)';
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
                <svg width="14" height="14" viewBox="0 0 50 50">
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="5"
                  />
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="50 70"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 25 25"
                      to="360 25 25"
                      dur="0.8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>
                Assessing...
              </span>
            ) : resolvedInsights ? 'Reassess' : 'Assess Selected'}
          </button>
        )}
        <div onClick={(e) => e.stopPropagation()}>
          <UploadNewPDFButton onClick={onUploadClick || externalUploadPDF} />
        </div>
        <span style={{ color: "var(--cw-text-muted, #6b7280)", display: "inline-flex", alignItems: "center" }}>
          {isPanelOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </div>
    </div>
  );

  // --- Empty state (no document selected) ---
  if (!documentId && !useExternal) {
    return (
      <div style={{ ...panelStyle, gap: isPanelOpen ? '32px' : 0 }} className="citewise-card">
        <div
          className="workflow-card-header cw-panel-header"
          onClick={() => setIsPanelOpen((o) => !o)}
          style={{
            ...panelHeaderStyle,
            cursor: 'pointer',
            userSelect: 'none',
            borderBottom: isPanelOpen ? '1px solid var(--cw-border, #e5e7eb)' : 'none',
          }}
        >
          <PanelHeader />
        </div>
        {isPanelOpen && (
          <div className="cw-panel-content" style={{ padding: PANEL_CONTENT_PADDING }}>
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
        )}
      </div>
    );
  }

  // --- Loading state ---
  if (resolvedLoading || isAssessing) {
    return (
      <div style={{ ...panelStyle, gap: isPanelOpen ? '32px' : 0 }} className="citewise-card">
        <div
          className="workflow-card-header cw-panel-header"
          onClick={() => setIsPanelOpen((o) => !o)}
          style={{
            ...panelHeaderStyle,
            cursor: 'pointer',
            userSelect: 'none',
            borderBottom: isPanelOpen ? '1px solid var(--cw-border, #e5e7eb)' : 'none',
          }}
        >
          <PanelHeader />
        </div>
        {isPanelOpen && (
          <div className="cw-panel-content" style={{ padding: PANEL_CONTENT_PADDING, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2.5rem 1.5rem',
              maxWidth: '460px',
              width: '100%',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            {/* Guaranteed Animated SVG Spinner with glowing center */}
            <div
              style={{
                position: 'relative',
                width: '76px',
                height: '76px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <svg width="76" height="76" viewBox="0 0 50 50" style={{ position: 'absolute', inset: 0 }}>
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
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(234, 88, 12, 0.09)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(234, 88, 12, 0.25)',
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
                fontSize: '1.2rem',
                fontWeight: 700,
                color: 'var(--cw-text-primary, #0f0e17)',
                margin: '0 0 0.35rem 0',
                letterSpacing: '-0.01em',
              }}
            >
              {isAssessing ? 'Running AI Assessment' : 'Analyzing Document Content'}
            </h3>
            <p
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '0.85rem',
                color: 'var(--cw-text-muted, #6b7280)',
                lineHeight: 1.55,
                margin: '0 0 1.5rem 0',
                maxWidth: '400px',
                minHeight: '1.55em',
              }}
            >
              {panelStatusText}
            </p>

            {/* Moving Progress Bar & Percentage Count */}
            <div
              style={{
                width: '280px',
                maxWidth: '85%',
                height: '8px',
                background: 'var(--cw-border, #e5e7eb)',
                borderRadius: '999px',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.08)',
                margin: '0 auto 0.6rem auto',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${panelProgress}%`,
                  background: 'linear-gradient(90deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
                  borderRadius: '999px',
                  transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 0 10px rgba(234, 88, 12, 0.45)',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '280px',
                maxWidth: '85%',
                margin: '0 auto',
                fontSize: '0.75rem',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              <span style={{ color: 'var(--cw-text-muted, #6b7280)' }}>Assessment progress</span>
              <span style={{ color: '#ea580c', fontWeight: 700 }}>{panelProgress}%</span>
            </div>

            {/* Shimmering skeleton cards beneath previewing layout */}
            <div className="cw-loading-skeleton-preview" style={{ marginTop: '1.5rem', width: '100%', maxWidth: '380px', display: 'flex', gap: '10px' }}>
              <div className="cw-loading-skeleton-card-left" style={{ height: '48px' }} />
              <div className="cw-loading-skeleton-card-right" style={{ height: '48px' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
  }

  // --- Error state ---
  if (resolvedError) {
    return (
      <div style={{ ...panelStyle, gap: isPanelOpen ? '32px' : 0 }} className="citewise-card">
        <div
          className="workflow-card-header cw-panel-header"
          onClick={() => setIsPanelOpen((o) => !o)}
          style={{
            ...panelHeaderStyle,
            cursor: 'pointer',
            userSelect: 'none',
            borderBottom: isPanelOpen ? '1px solid var(--cw-border, #e5e7eb)' : 'none',
          }}
        >
          <PanelHeader />
        </div>
        {isPanelOpen && (
          <div className="cw-panel-content" style={{ padding: PANEL_CONTENT_PADDING }}>
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
        )}
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
      <div style={{ ...panelStyle, gap: isPanelOpen ? '32px' : 0 }} className="citewise-card">
        <div
          className="workflow-card-header cw-panel-header"
          onClick={() => setIsPanelOpen((o) => !o)}
          style={{
            ...panelHeaderStyle,
            cursor: 'pointer',
            userSelect: 'none',
            borderBottom: isPanelOpen ? '1px solid var(--cw-border, #e5e7eb)' : 'none',
          }}
        >
          <PanelHeader />
        </div>
        {isPanelOpen && (
          <div className="cw-panel-content" style={{ padding: PANEL_CONTENT_PADDING, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', textAlign: 'center' }}>
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
        )}
      </div>
    );
  }

  // --- Success state ---
  return (
    <div style={{ ...panelStyle, gap: isPanelOpen ? '32px' : 0 }} className="citewise-card">
      <div
        className="workflow-card-header cw-panel-header"
        onClick={() => setIsPanelOpen((o) => !o)}
        style={{
          ...panelHeaderStyle,
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: isPanelOpen ? '1px solid var(--cw-border, #e5e7eb)' : 'none',
        }}
      >
        <PanelHeader />
      </div>
      {isPanelOpen && (
        <div className="cw-panel-content" style={{ padding: `0 ${PANEL_CONTENT_PADDING} ${PANEL_CONTENT_PADDING} ${PANEL_CONTENT_PADDING}` }}>
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
      )}
    </div>
  );
};

export default AIAssessmentPanel;