// module3/synthesis-draft/components/DraftIntroductionButton.jsx
export default function DraftIntroductionButton({ 
  generationStatus, 
  generationProgress, 
  onSynthesize, 
  onRegenerate,
  hasApprovedDocuments,
  approvedCount 
}) {
  return (
    <>
      <style>{`@keyframes citewise-spin { to { transform: rotate(360deg); } }`}</style>
      {generationStatus !== "complete" ? (
        <button
          onClick={onSynthesize}
          disabled={generationStatus === "generating" || !hasApprovedDocuments}
          style={{
            ...styles.button,
            background: (generationStatus === "generating" || !hasApprovedDocuments) 
              ? "rgba(0, 0, 0, 0.15)" 
              : "#5b5bd6",
            color: (generationStatus === "generating" || !hasApprovedDocuments) 
              ? "#a1a1b5" 
              : "#e4e4f0",
            cursor: (generationStatus === "generating" || !hasApprovedDocuments) 
              ? "not-allowed" 
              : "pointer",
          }}
          onMouseEnter={(e) => {
            if (generationStatus !== "generating" && hasApprovedDocuments) {
              e.currentTarget.style.background = "#6f6fe0";
            }
          }}
          onMouseLeave={(e) => {
            if (generationStatus !== "generating" && hasApprovedDocuments) {
              e.currentTarget.style.background = "#5b5bd6";
            }
          }}
        >
          {generationStatus === "generating" ? (
            <>
              <span style={styles.spinnerIcon} />
              Synthesizing... Please wait ({generationProgress}%)
            </>
          ) : (
            `Draft Introduction (${approvedCount} document${approvedCount !== 1 ? 's' : ''})`
          )}
        </button>
      ) : (
        <button
          onClick={onRegenerate}
          style={styles.button}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#6f6fe0")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#5b5bd6")}
        >
          Clear Draft
        </button>
      )}
    </>
  );
}

const styles = {
  button: {
    background: "#5b5bd6",
    color: "#e4e4f0",
    border: "none",
    borderRadius: "10px",
    padding: "14px",
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
    fontSize: "0.875rem",
    fontWeight: "700",
    transition: "background 0.2s ease, transform 0.1s ease",
    textAlign: "center",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  spinnerIcon: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid white",
    borderRadius: "50%",
    // `progress-bar-stripes` is Bootstrap's keyframe: it animates
    // background-position-x, so this ring sat perfectly still instead of spinning.
    animation: "citewise-spin 0.8s linear infinite",
  },
};