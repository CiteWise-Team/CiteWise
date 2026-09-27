function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusConfig = {
  queued: { label: "Ready", color: "#f97316", bg: "rgba(249, 115, 22, 0.1)" },
  uploading: { label: "Uploading", color: "#f97316", bg: "rgba(249, 115, 22, 0.15)" },
  extracting: { label: "Extracting", color: "#f97316", bg: "rgba(249, 115, 22, 0.15)" },
  uploaded: { label: "Uploaded", color: "#16a34a", bg: "rgba(22, 163, 74, 0.12)" },
  failed: { label: "Failed", color: "#dc2626", bg: "rgba(220, 38, 38, 0.12)" },
  invalid: { label: "Rejected", color: "#dc2626", bg: "rgba(220, 38, 38, 0.12)" },
  duplicate: { label: "Duplicate", color: "#d97706", bg: "rgba(217, 119, 6, 0.12)" },
};

export default function SelectedFilesList({ files, onRemove, onRetry }) {
  if (!files.length) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          padding: "2rem",
          textAlign: "center",
          color: "#9ca3af",
          fontSize: "0.85rem",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        [No Files Selected]
      </div>
    );
  }

  return (
    <>
      <ul
        className="citewise-queue-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          listStyle: "none",
          padding: "0.6rem",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.45rem",
        }}
      >
        {files.map((item) => {
          const cfg = statusConfig[item.status] || statusConfig.queued;
          return (
            <li
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "0.45rem 0.65rem",
                gap: "0.5rem",
                transition: "border-color 0.15s ease, background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#f97316";
                e.currentTarget.style.background = "rgba(249, 115, 22, 0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.background = "#ffffff";
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#111827",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "220px",
                    margin: 0,
                    fontFamily: "'Poppins', sans-serif",
                  }}
                  title={item.name}
                >
                  {item.name}
                </p>
                <p style={{ fontSize: "0.68rem", color: "#6b7280", margin: "2px 0 0 0", fontFamily: "'Poppins', sans-serif" }}>
                  {formatFileSize(item.size)} · {item.message}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    padding: "0.18rem 0.45rem",
                    borderRadius: "4px",
                    background: cfg.bg,
                    color: cfg.color,
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {cfg.label}
                </span>
                {item.status === "failed" && onRetry && (
                  <button
                    type="button"
                    title="Retry upload"
                    onClick={() => onRetry(item.id)}
                    style={{
                      background: "rgba(220, 38, 38, 0.1)",
                      border: "1px solid rgba(220, 38, 38, 0.3)",
                      color: "#dc2626",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      cursor: "pointer",
                      padding: "0.18rem 0.45rem",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      transition: "all 0.15s ease",
                      outline: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#dc2626";
                      e.currentTarget.style.borderColor = "#dc2626";
                      e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)";
                      e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.3)";
                      e.currentTarget.style.color = "#dc2626";
                    }}
                  >
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    Retry
                  </button>
                )}
                {item.status !== "uploading" && (
                  <button
                    type="button"
                    title="Remove file"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#9ca3af",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                      padding: "0.15rem",
                      borderRadius: "4px",
                      transition: "color 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      outline: "none",
                    }}
                    onClick={() => onRemove(item.id)}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <style>{`
        .citewise-queue-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .citewise-queue-scroll::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 4px;
        }
        .citewise-queue-scroll::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.3);
          border-radius: 4px;
        }
        .citewise-queue-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.6);
        }
      `}</style>
    </>
  );
}