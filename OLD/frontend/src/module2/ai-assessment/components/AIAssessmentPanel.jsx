import React, { useState, useEffect } from 'react';
import EvidenceExcerptList from './EvidenceExcerptList';
import SemanticScoreDashboard from './SemanticScoreDashboard';
import UploadNewPDFButton from './UploadNewPDFButton';

const PANEL_HEADER_PADDING = '1.125rem 1.5rem';
const PANEL_CONTENT_PADDING = '24px';

const AIAssessmentPanel = ({
  documentId,
  insights: externalInsights,
  isLoading: externalLoading,
  onAssess: externalAssess,
  assessmentTimedOut = false,
  onUploadClick,
  onUploadNew,
}) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const useExternal = externalInsights !== undefined || externalLoading !== undefined;
  const resolvedInsights = useExternal ? externalInsights : insights;
  const resolvedLoading = useExternal ? Boolean(externalLoading) : loading;
  const resolvedError = useExternal ? null : error;

  // Polling / fetch logic (identical to first file)
  useEffect(() => {
    if (!documentId || useExternal) return;

    let pollTimeout = null;
    let isMounted = true;

    const fetchInsights = async () => {
      if (isMounted && !pollTimeout) setLoading(true);
      try {
        const response = await fetch(`/api/v1/documents/${documentId}/insights`);

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

        const data = await response.json();
        if (isMounted) {
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

      const response = await fetch(`/api/v1/documents/${documentId}/assess`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start assessment');
      }

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
          color: '#D98A21',
          margin: 0,
        }}
      >
        AI Assessment Panel
      </h2>
      <div style={{ display: 'flex', gap: '12px' }}>

        <UploadNewPDFButton onClick={onUploadClick || onUploadNew} />
      </div>
    </div>
  );

  // --- Empty state (no document selected) ---
  if (!documentId && !useExternal) {
    return (
      <div
        style={{
          background: '#1E1C19',
          border: '1px solid #3A3630',
          borderRadius: '16px',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          flex: 1,
          minWidth: 0,
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: PANEL_HEADER_PADDING, background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid #3A3630' }}>
          <PanelHeader />
        </div>
        <div style={{ padding: PANEL_CONTENT_PADDING }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', flexDirection: 'column', gap: '12px' }}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8a8278"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '13px',
                color: '#8a8278',
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

  // --- Loading state (initial fetch or refetch after assess) ---
  if (resolvedLoading || isAssessing) {
    return (
      <div
        style={{
          background: '#1E1C19',
          border: '1px solid #3A3630',
          borderRadius: '16px',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          flex: 1,
          minWidth: 0,
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: PANEL_HEADER_PADDING, background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid #3A3630' }}>
          <PanelHeader />
        </div>
        <div style={{ padding: PANEL_CONTENT_PADDING, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <div
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '13px',
              color: '#8a8278',
              letterSpacing: '0.5px',
            }}
          >
            {isAssessing ? 'Starting assessment...' : 'Analyzing document content...'}
          </div>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (resolvedError) {
    return (
      <div
        style={{
          background: '#1E1C19',
          border: '1px solid #3A3630',
          borderRadius: '16px',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          flex: 1,
          minWidth: 0,
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: PANEL_HEADER_PADDING, background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid #3A3630' }}>
          <PanelHeader />
        </div>
        <div style={{ padding: PANEL_CONTENT_PADDING }}>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.15)',
              border: '1px solid #5a2a2a',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <h3
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '16px',
                color: '#D98A21',
                margin: '0 0 8px 0',
              }}
            >
              Analysis Error
            </h3>
            <p
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '13px',
                color: '#f0ece6',
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

  // --- No insights available (e.g., still processing or assessment failed) ---
  if (!resolvedInsights || !mappedData) {
    const waitingMessage = assessmentTimedOut
      ? 'Assessment did not return results. Check backend logs and your n8n Code node (it may be returning empty {}). Click Assess PDF to try again.'
      : 'No insights available yet. The document may still be processing.';
    return (
      <div
        style={{
          background: '#1E1C19',
          border: '1px solid #3A3630',
          borderRadius: '16px',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          flex: 1,
          minWidth: 0,
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: PANEL_HEADER_PADDING, background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid #3A3630' }}>
          <PanelHeader />
        </div>
        <div style={{ padding: PANEL_CONTENT_PADDING, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', textAlign: 'center' }}>
          <p
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '13px',
              color: '#8a8278',
            }}
          >
            {waitingMessage}
          </p>
        </div>
      </div>
    );
  }

  // --- Success state: show excerpts and scores using layout from file 2 ---
  return (
    <div
      style={{
        background: '#1E1C19',
        border: '1px solid #3A3630',
        borderRadius: '16px',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        flex: 1,
        minWidth: 0,
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: PANEL_HEADER_PADDING, background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid #3A3630' }}>
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
        />
      </div>
    </div>
  );
};

export default AIAssessmentPanel;
