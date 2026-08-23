export default function ApprovedSourceList({ documents, loading }) {

  return (
    <div
      style={{
        background: "#1e1e2f",
        border: "1px solid #3a3a55",
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <span
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: "1.05rem",
          color: "#5b5bd6",
          letterSpacing: "0.01em",
        }}
      >
        Source Documents ({documents.length})
      </span>

      <div style={{ height: "1px", background: "#3a3a55" }} />

      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "40px 20px",
            background: "rgba(0, 0, 0, 0.15)",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "2px solid #3a3a55",
              borderTop: "2px solid #5b5bd6",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ color: "#a1a1b5", fontSize: "0.85rem" }}>
            Loading documents...
          </span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : documents.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "#a1a1b5",
            fontSize: "0.85rem",
            background: "rgba(0, 0, 0, 0.15)",
            borderRadius: "8px",
          }}
        >
          No approved documents yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {documents.map((doc, idx) => (
            <div
              key={idx}
              style={{
                background: "rgba(0, 0, 0, 0.15)",
                border: "1px solid #3a3a55",
                borderRadius: "8px",
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "border-color 0.2s ease",
              }}
            >
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "#e4e4f0",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  maxWidth: "220px",
                }}
                title={doc.fileName || doc.name}
              >
                {doc.fileName || doc.name}
              </span>

              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: "#5b5bd6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="#e4e4f0"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

