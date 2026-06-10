function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusConfig = {
  queued: { label: "Ready", color: "#D98A21", bg: "rgba(217, 138, 33, 0.12)" },
  uploading: { label: "Uploading", color: "#D98A21", bg: "rgba(217, 138, 33, 0.18)" },
  uploaded: { label: "Uploaded", color: "#4caf82", bg: "rgba(76,175,130,0.15)" },
  failed: { label: "Failed", color: "#e05555", bg: "rgba(224,85,85,0.15)" },
  invalid: { label: "Rejected", color: "#e05555", bg: "rgba(224,85,85,0.15)" },
  duplicate: { label: "Duplicate", color: "#e0a835", bg: "rgba(224,168,53,0.15)" },
};

export default function SelectedFilesList({ files, onRemove }) {
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
    <ul
      style={{
        flex: 1,
        overflowY: "auto",
        listStyle: "none",
        padding: "0.75rem",
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
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
              background: "rgba(0, 0, 0, 0.15)",
              border: "1px solid #3A3630",
              borderRadius: "8px",
              padding: "0.5rem 0.75rem",
              gap: "0.5rem",
              transition: "border-color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#D98A21")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#3A3630")}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#f0ece6",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "180px",
                  margin: 0,
                }}
                title={item.name}
              >
                {item.name}
              </p>
              <p style={{ fontSize: "0.7rem", color: "rgba(240, 236, 230, 0.4)", margin: "2px 0 0 0" }}>
                {formatFileSize(item.size)} · {item.message}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  background: cfg.bg,
                  color: cfg.color,
                }}
              >
                {cfg.label}
              </span>
              {item.status !== "uploading" && (
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(240, 236, 230, 0.4)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    padding: "0.2rem",
                    borderRadius: "4px",
                    transition: "color 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    outline: "none",
                  }}
                  onClick={() => onRemove(item.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#e05555")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240, 236, 230, 0.4)")}
                >
                  ✕
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}