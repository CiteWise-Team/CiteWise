function FilledDocumentIcon() {
  return (
    <svg
      width="14"
      height="18"
      viewBox="0 0 14 18"
      fill="none"
      style={{ marginRight: "0.25rem", color: "#e4e4f0" }}
    >
      <path
        d="M2 0C0.9 0 0.01 0.9 0.01 2L0 16C0 17.1 0.89 18 1.99 18H12C13.1 18 14 17.1 14 16V6L8 0H2ZM8 7V1.5L12.5 6H8Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function UploadStatusBar({ readyCount, totalCount, statusMessage, uploadState }) {
  const statusColor = {
    ready: "#5b5bd6",
    success: "#5b5bd6",
    uploading: "#5b5bd6",
    error: "#e05555",
    warning: "#e0a835",
  }[uploadState] || "rgba(240, 236, 230, 0.4)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(0, 0, 0, 0.15)",
        border: "1px solid #3a3a55",
        borderRadius: "8px",
        padding: "0.75rem 1.25rem",
        fontSize: "0.85rem",
        fontFamily: "'Poppins', sans-serif",
        minHeight: "44px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#e4e4f0" }}>
        <FilledDocumentIcon />
        <span style={{ fontWeight: 600 }}>Files: {totalCount ?? readyCount}</span>
      </div>
      <div style={{ fontWeight: 700, color: statusColor, display: "flex", alignItems: "center", gap: "4px" }}>
        {uploadState === "ready" ? "✓ Ready" : statusMessage}
      </div>
    </div>
  );
}