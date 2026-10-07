// module3/synthesis-draft/components/DraftIntroductionButton.jsx
import { useTheme } from "../../../../context/ThemeContext";
import { Sparkles, RotateCcw, Loader2 } from "lucide-react";

export default function DraftIntroductionButton({ 
  generationStatus, 
  generationProgress = 0, 
  statusText,
  onSynthesize, 
  onRegenerate,
  hasApprovedDocuments,
  approvedCount 
}) {
  const { isDark } = useTheme();
  const isGenerating = generationStatus === "generating";
  const isDisabled = isGenerating || !hasApprovedDocuments;

  return (
    <>
      {generationStatus !== "complete" ? (
        <button
          type="button"
          onClick={onSynthesize}
          disabled={isDisabled}
          style={{
            ...styles.button,
            position: "relative",
            overflow: "hidden",
            background: isGenerating
              ? "linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #f97316 100%)"
              : isDisabled 
                ? (isDark ? "rgba(255, 255, 255, 0.06)" : "#f3f4f6") 
                : "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
            backgroundSize: isGenerating ? "200% 200%" : "auto",
            animation: isGenerating ? "citewise-btn-flow 2.5s ease infinite" : "none",
            border: isGenerating
              ? "1px solid #ea580c"
              : isDisabled
                ? (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e5e7eb")
                : "1px solid #ea580c",
            color: isDisabled && !isGenerating 
              ? (isDark ? "#6b7280" : "#9ca3af") 
              : "#ffffff",
            cursor: isDisabled 
              ? (isGenerating ? "wait" : "not-allowed") 
              : "pointer",
            boxShadow: isGenerating
              ? (isDark ? "0 4px 20px rgba(234, 88, 12, 0.45)" : "0 4px 18px rgba(234, 88, 12, 0.35)")
              : isDisabled
                ? "none"
                : "0 2px 8px rgba(234, 88, 12, 0.25)",
          }}
          onMouseEnter={(e) => {
            if (!isGenerating && hasApprovedDocuments) {
              e.currentTarget.style.background = "#c2410c";
              e.currentTarget.style.borderColor = "#c2410c";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isGenerating && hasApprovedDocuments) {
              e.currentTarget.style.background = "linear-gradient(135deg, #ea580c 0%, #f97316 100%)";
              e.currentTarget.style.borderColor = "#ea580c";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.25)";
            }
          }}
        >
          {isGenerating ? (
            <>
              <span
                className="cw-spinning"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "18px",
                  height: "18px",
                  transformOrigin: "center center",
                  animation: "cw-spin 0.85s linear infinite",
                  flexShrink: 0,
                }}
              >
                <Loader2 size={18} />
              </span>
              <span style={{ letterSpacing: "0.01em" }}>
                Drafting Output... {generationProgress > 0 ? `${generationProgress}%` : ""}
              </span>
              {/* Internal subtle progress track */}
              <div 
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  height: "3px",
                  width: `${Math.max(5, generationProgress)}%`,
                  background: "#ffffff",
                  opacity: 0.85,
                  transition: "width 0.35s ease",
                  boxShadow: "0 0 6px #ffffff",
                }}
              />
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Draft Introduction ({approvedCount} document{approvedCount !== 1 ? 's' : ''})</span>
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={onRegenerate}
          style={{
            ...styles.button,
            background: isDark ? "rgba(255, 255, 255, 0.05)" : "#ffffff",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #d1d5db",
            color: isDark ? "#f3f4f6" : "#374151",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? "rgba(220, 38, 38, 0.15)" : "#fef2f2";
            e.currentTarget.style.borderColor = "#dc2626";
            e.currentTarget.style.color = "#dc2626";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.05)" : "#ffffff";
            e.currentTarget.style.borderColor = isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #d1d5db";
            e.currentTarget.style.color = isDark ? "#f3f4f6" : "#374151";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <RotateCcw size={15} />
          <span>Clear Draft</span>
        </button>
      )}
    </>
  );
}

const styles = {
  button: {
    borderRadius: "10px",
    padding: "13px 16px",
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
    userSelect: "none",
  },
};