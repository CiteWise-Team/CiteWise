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
      {generationStatus !== "complete" ? (
        <button
          onClick={onSynthesize}
          disabled={generationStatus === "generating" || !hasApprovedDocuments}
          style={{
            ...styles.button,
            background: (generationStatus === "generating" || !hasApprovedDocuments) 
              ? "rgba(0, 0, 0, 0.15)" 
              : "#D85A30",
            color: (generationStatus === "generating" || !hasApprovedDocuments) 
              ? "#8a8278" 
              : "#f0ece6",
            cursor: (generationStatus === "generating" || !hasApprovedDocuments) 
              ? "not-allowed" 
              : "pointer",
          }}
          onMouseEnter={(e) => {
            if (generationStatus !== "generating" && hasApprovedDocuments) {
              e.currentTarget.style.background = "#e96439";
            }
          }}
          onMouseLeave={(e) => {
            if (generationStatus !== "generating" && hasApprovedDocuments) {
              e.currentTarget.style.background = "#D85A30";
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
          onMouseEnter={(e) => (e.currentTarget.style.background = "#e96439")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#D85A30")}
        >
          Clear & Regenerate
        </button>
      )}
    </>
  );
}

const styles = {
  button: {
    background: "#D85A30",
    color: "#f0ece6",
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
    animation: "progress-bar-stripes 0.8s linear infinite",
  },
};