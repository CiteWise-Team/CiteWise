// module3/synthesis-draft/components/SynthesisControlPanel.jsx
import DraftIntroductionButton from "./DraftIntroductionButton";

export default function SynthesisControlPanel({ 
  generationStatus, 
  generationProgress, 
  statusText, 
  onSynthesize, 
  onRegenerate,
  hasApprovedDocuments,
  approvedCount
}) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>Synthesis Control</span>
      </div>

      <div style={styles.cardBody}>
        {/* Generation Status Box */}
        <div style={styles.statusBox}>
          <span style={styles.statusLabel}>Generation Status</span>
          <span style={styles.statusText}>
            {generationStatus === "generating" && <span style={styles.statusDot} />}
            {statusText}
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
    background: "#1E1C19",
    border: "1px solid #3A3630",
    borderRadius: "16px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  cardHeader: {
    background: "rgba(0, 0, 0, 0.15)",
    borderBottom: "1px solid #3A3630",
    padding: "16px 20px",
  },
  cardTitle: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: "1.05rem",
    color: "#D98A21",
    letterSpacing: "0.01em",
  },
  cardBody: {
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  statusBox: {
    background: "#33302b",
    border: "1px solid #3A3630",
    borderRadius: "10px",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  statusLabel: {
    fontSize: "0.7rem",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#8a8278",
  },
  statusText: {
    fontSize: "0.85rem",
    color: "#f0ece6",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#e07b39",
    display: "inline-block",
    animation: "pulse 1.2s infinite",
  },
  progressBarContainer: {
    width: "100%",
    height: "4px",
    background: "#1a1714",
    borderRadius: "2px",
    marginTop: "8px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    background: "#e07b39",
    borderRadius: "2px",
    transition: "width 0.4s ease",
  },
  warningBox: {
    background: "rgba(216, 90, 48, 0.15)",
    border: "1px solid rgba(216, 90, 48, 0.3)",
    borderRadius: "8px",
    padding: "10px 12px",
  },
  warningText: {
    fontSize: "0.75rem",
    color: "#D98A21",
  },
};