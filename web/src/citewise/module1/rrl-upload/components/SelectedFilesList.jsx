function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusConfig = {
  queued: { label: "Ready", color: "#5b5bd6", bg: "rgba(91, 91, 214, 0.12)" },
  uploading: { label: "Uploading", color: "#5b5bd6", bg: "rgba(91, 91, 214, 0.18)" },
  extracting: { label: "Extracting", color: "#5b5bd6", bg: "rgba(91, 91, 214, 0.18)" },
  uploaded: { label: "Uploaded", color: "#4caf82", bg: "rgba(76,175,130,0.15)" },
  failed: { label: "Failed", color: "#e05555", bg: "rgba(224,85,85,0.15)" },
  invalid: { label: "Rejected", color: "#e05555", bg: "rgba(224,85,85,0.15)" },
  duplicate: { label: "Duplicate", color: "#e0a835", bg: "rgba(224,168,53,0.15)" },
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
          color: "rgba(240, 236, 230, 0.4)",
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
                background: "rgba(0, 0, 0, 0.22)",
                border: "1px solid rgba(58, 58, 85, 0.7)",
                borderRadius: "8px",
                padding: "0.45rem 0.65rem",
                gap: "0.5rem",
                transition: "border-color 0.15s ease, background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#5b5bd6";
                e.currentTarget.style.background = "rgba(91, 91, 214, 0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(58, 58, 85, 0.7)";
                e.currentTarget.style.background = "rgba(0, 0, 0, 0.22)";
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#e4e4f0",
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
                <p style={{ fontSize: "0.68rem", color: "rgba(240, 236, 230, 0.45)", margin: "2px 0 0 0", fontFamily: "'Poppins', sans-serif" }}>
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
                      background: "rgba(224, 85, 85, 0.18)",
                      border: "1px solid rgba(224, 85, 85, 0.4)",
                      color: "#fca5a5",
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
                      e.currentTarget.style.background = "#e05555";
                      e.currentTarget.style.borderColor = "#e05555";
                      e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(224, 85, 85, 0.18)";
                      e.currentTarget.style.borderColor = "rgba(224, 85, 85, 0.4)";
                      e.currentTarget.style.color = "#fca5a5";
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
                      color: "rgba(240, 236, 230, 0.35)",
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
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#e05555")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240, 236, 230, 0.35)")}
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
          background: rgba(0, 0, 0, 0.12);
          border-radius: 4px;
        }
        .citewise-queue-scroll::-webkit-scrollbar-thumb {
          background: rgba(91, 91, 214, 0.35);
          border-radius: 4px;
        }
        .citewise-queue-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(91, 91, 214, 0.65);
        }
      `}</style>
    </>
  );
}