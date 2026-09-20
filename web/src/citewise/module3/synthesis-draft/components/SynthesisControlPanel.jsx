// module3/synthesis-draft/components/SynthesisControlPanel.jsx
import DraftIntroductionButton from "./DraftIntroductionButton";

export default function SynthesisControlPanel({ 
  generationStatus, 
  generationProgress, 
  statusText, 
  onSynthesize, 
  onRegenerate,
  onErrorDetails,
  hasApprovedDocuments,
  approvedCount
}) {
  const isError = generationStatus === "error";

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>Synthesis Control</span>
      </div>

      <div style={styles.cardBody}>
        {/* Generation Status Box */}
        <div style={{ ...styles.statusBox, ...(isError ? styles.statusBoxError : {}) }}>
          <div style={styles.statusHeaderRow}>
            <span style={isError ? styles.statusLabelError : styles.statusLabel}>
              {isError ? "Notice" : "Generation Status"}
            </span>
            {isError && onErrorDetails && (
              <button
                type="button"
                onClick={onErrorDetails}
                style={styles.viewDetailsBtn}
                title="View error explanation and recommended actions"
              >
                View Details
              </button>
            )}
          </div>
          <span style={isError ? styles.statusTextError : styles.statusText}>
            {generationStatus === "generating" && <span style={styles.statusDot} />}
            {isError && <span style={{ marginRight: 6 }}>⚠️</span>}
            {isError ? "Generation could not complete" : statusText}
          </span>

          {generationStatus === "generating" && (
            <div style={styles.progressBarContainer}>
              <div style={{ ...styles.progressBarFill, width: `${generationProgress}%` }} />
            </div>
          )}
        </div>

        {/* Warning if no approved documents */}
        {!hasApprovedDocuments && generationStatus === "idle" && (
          <div style={styles.warningBox}>
            <span style={styles.warningText}>⚠️ No approved documents found. Please approve documents in AI Assessment first.</span>
          </div>
        )}

        {/* Draft Introduction Button */}
        <DraftIntroductionButton
          generationStatus={generationStatus}
          generationProgress={generationProgress}
          onSynthesize={onSynthesize}
          onRegenerate={onRegenerate}
          hasApprovedDocuments={hasApprovedDocuments}
          approvedCount={approvedCount}
        />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  card: {
    background: "#1e1e2f",
    border: "1px solid #3a3a55",
    borderRadius: "16px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  cardHeader: {
    background: "rgba(0, 0, 0, 0.15)",
    borderBottom: "1px solid #3a3a55",
    padding: "16px 20px",
  },
  cardTitle: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: "1.05rem",
    color: "#5b5bd6",
    letterSpacing: "0.01em",
  },
  cardBody: {
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  statusBox: {
    background: "#25253a",
    border: "1px solid #3a3a55",
    borderRadius: "10px",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  statusBoxError: {
    background: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
  },
  statusHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: "0.7rem",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#a1a1b5",
  },
  statusLabelError: {
    fontSize: "0.7rem",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#f87171",
  },
  statusText: {
    fontSize: "0.85rem",
    color: "#e4e4f0",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  statusTextError: {
    fontSize: "0.85rem",
    color: "#fca5a5",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
  },
  viewDetailsBtn: {
    background: "rgba(239, 68, 68, 0.2)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    borderRadius: "6px",
    color: "#fca5a5",
    fontSize: "0.72rem",
    fontWeight: "600",
    padding: "2px 8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#6f6fe0",
    display: "inline-block",
    animation: "pulse 1.2s infinite",
  },
  progressBarContainer: {
    width: "100%",
    height: "4px",
    background: "#15151f",
    borderRadius: "2px",
    marginTop: "8px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    background: "#6f6fe0",
    borderRadius: "2px",
    transition: "width 0.4s ease",
  },
  warningBox: {
    background: "rgba(91, 91, 214, 0.15)",
    border: "1px solid rgba(91, 91, 214, 0.3)",
    borderRadius: "8px",
    padding: "10px 12px",
  },
  warningText: {
    fontSize: "0.75rem",
    color: "#5b5bd6",
  },
};