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
        background: "#f97316",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        fontSize: "0.9rem",
        fontWeight: 700,
        padding: "0.75rem 1.5rem",
        cursor: (disabled || isUploading) ? "not-allowed" : "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        width: "100%",
        opacity: (disabled || isUploading) ? 0.5 : 1,
        boxShadow: "0 4px 12px rgba(249, 115, 22, 0.25)",
        fontFamily: "'Poppins', sans-serif",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isUploading) {
          e.currentTarget.style.background = "#ea6a0f";
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(249, 115, 22, 0.4)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isUploading) {
          e.currentTarget.style.background = "#f97316";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(249, 115, 22, 0.25)";
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
      <style>{`
        @keyframes citewise-upload-bob {
          from { transform: translateY(1px); }
          to   { transform: translateY(-3px); }
        }
      `}</style>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={
          isUploading
            ? { animation: "citewise-upload-bob 0.9s ease-in-out infinite alternate" }
            : { transform: "none", transition: "transform 0.3s ease" }
        }
      >
        <polyline points="16 16 12 12 8 16" />
        <line x1="12" y1="12" x2="12" y2="21" />
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
      </svg>
      {isUploading ? "Uploading..." : "Upload All"}
    </button>
  );
}