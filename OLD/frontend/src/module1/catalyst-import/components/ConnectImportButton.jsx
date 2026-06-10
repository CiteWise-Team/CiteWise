export default function ConnectImportButton({ onClick, isLoading }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        background: "#D85A30",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        fontSize: "0.875rem",
        fontWeight: "700",
        fontFamily: "'Poppins', sans-serif",
        padding: "0.55rem 1.25rem",
        cursor: isLoading ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: isLoading ? 0.6 : 1,
        boxShadow: "0 4px 12px rgba(216, 90, 48, 0.25)",
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          e.currentTarget.style.background = "#e96439";
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(216, 90, 48, 0.4)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          e.currentTarget.style.background = "#D85A30";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(216, 90, 48, 0.25)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
      onMouseDown={(e) => {
        if (!isLoading) {
          e.currentTarget.style.transform = "translateY(1px)";
        }
      }}
      onMouseUp={(e) => {
        if (!isLoading) {
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
    >
      {/* Premium SVG Link Icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          width: "14px",
          height: "14px",
          transform: isLoading ? "rotate(90deg)" : "none",
          transition: "transform 0.4s ease",
        }}
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      {isLoading ? "Connecting..." : "Connect & Import"}
    </button>
  );
}