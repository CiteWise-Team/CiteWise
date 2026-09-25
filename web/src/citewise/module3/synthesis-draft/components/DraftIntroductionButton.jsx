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
              ? "#f3f4f6" 
              : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            color: (generationStatus === "generating" || !hasApprovedDocuments) 
              ? "#9ca3af" 
              : "#ffffff",
            cursor: (generationStatus === "generating" || !hasApprovedDocuments) 
              ? "not-allowed" 
              : "pointer",
            boxShadow: (generationStatus === "generating" || !hasApprovedDocuments)
              ? "none"
              : "0 4px 12px rgba(249, 115, 22, 0.25)",
          }}
          onMouseEnter={(e) => {
            if (generationStatus !== "generating" && hasApprovedDocuments) {
              e.currentTarget.style.background = "linear-gradient(135deg, #fb8c3a 0%, #f97316 100%)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(249, 115, 22, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            if (generationStatus !== "generating" && hasApprovedDocuments) {
              e.currentTarget.style.background = "linear-gradient(135deg, #f97316 0%, #ea580c 100%)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(249, 115, 22, 0.25)";
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
          style={{
            ...styles.button,
            background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            color: "#ffffff",
            boxShadow: "0 4px 12px rgba(249, 115, 22, 0.25)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "linear-gradient(135deg, #fb8c3a 0%, #f97316 100%)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(249, 115, 22, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "linear-gradient(135deg, #f97316 0%, #ea580c 100%)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(249, 115, 22, 0.25)";
          }}
        >
          Clear Draft
        </button>
      )}
    </>
  );
}

const styles = {
  button: {
    background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "14px",
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
    fontSize: "0.875rem",
    fontWeight: "700",
    transition: "background 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease",
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
    border: "2px solid rgba(255,255,255,0.35)",
    borderTop: "2px solid #ffffff",
    borderRadius: "50%",
    animation: "citewise-spin 0.8s linear infinite",
  },
};