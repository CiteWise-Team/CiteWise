export default function UploadAllButton({ onClick, isUploading, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isUploading}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.6rem",
        background: "#D85A30",
        color: "#f0ece6",
        border: "none",
        borderRadius: "8px",
        fontSize: "0.9rem",
        fontWeight: 700,
        padding: "0.75rem 1.5rem",
        cursor: (disabled || isUploading) ? "not-allowed" : "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        width: "100%",
        opacity: (disabled || isUploading) ? 0.5 : 1,
        boxShadow: "0 4px 12px rgba(216, 90, 48, 0.25)",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isUploading) {
          e.currentTarget.style.background = "#e96439";
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(216, 90, 48, 0.4)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isUploading) {
          e.currentTarget.style.background = "#D85A30";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(216, 90, 48, 0.25)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
      onMouseDown={(e) => {
        if (!disabled && !isUploading) {
          e.currentTarget.style.transform = "translateY(1px)";
        }
      }}
      onMouseUp={(e) => {
        if (!disabled && !isUploading) {
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transform: isUploading ? "translateY(-2px)" : "none", transition: "transform 0.5s infinite alternate" }}
      >
        <polyline points="16 16 12 12 8 16" />
        <line x1="12" y1="12" x2="12" y2="21" />
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
      </svg>
      {isUploading ? "Uploading..." : "Upload All"}
    </button>
  );
}