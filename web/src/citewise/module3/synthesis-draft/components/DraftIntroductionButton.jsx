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
              : "#ea580c",
            border: (generationStatus === "generating" || !hasApprovedDocuments)
              ? "1px solid #e5e7eb"
              : "1px solid #ea580c",
            color: (generationStatus === "generating" || !hasApprovedDocuments) 
              ? "#9ca3af" 
              : "#ffffff",
            cursor: (generationStatus === "generating" || !hasApprovedDocuments) 
              ? "not-allowed" 
              : "pointer",
            boxShadow: (generationStatus === "generating" || !hasApprovedDocuments)
              ? "none"
              : "0 2px 8px rgba(234, 88, 12, 0.22)",
          }}
          onMouseEnter={(e) => {
            if (generationStatus !== "generating" && hasApprovedDocuments) {
              e.currentTarget.style.background = "#c2410c";
              e.currentTarget.style.borderColor = "#c2410c";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
            }
          }}
          onMouseLeave={(e) => {
            if (generationStatus !== "generating" && hasApprovedDocuments) {
              e.currentTarget.style.background = "#ea580c";
              e.currentTarget.style.borderColor = "#ea580c";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.22)";
            }
          }}
          onMouseDown={(e) => {
            if (generationStatus !== "generating" && hasApprovedDocuments) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(234, 88, 12, 0.2)";
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
            background: "#ea580c",
            border: "1px solid #ea580c",
            color: "#ffffff",
            boxShadow: "0 2px 8px rgba(234, 88, 12, 0.22)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#c2410c";
            e.currentTarget.style.borderColor = "#c2410c";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#ea580c";
            e.currentTarget.style.borderColor = "#ea580c";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.22)";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 6px rgba(234, 88, 12, 0.2)";
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
    background: "#ea580c",
    color: "#ffffff",
    border: "1px solid #ea580c",
    borderRadius: "8px",
    padding: "13px",
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
    fontSize: "0.875rem",
    fontWeight: "700",
    transition: "all 180ms ease",
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