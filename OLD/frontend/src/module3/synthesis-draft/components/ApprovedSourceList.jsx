export default function ApprovedSourceList({ documents, loading }) {
  const guardedDocuments = documents.filter((doc) => shouldWarnAboutSource(doc));

  return (
    <div
      style={{
        background: "#1E1C19",
        border: "1px solid #3A3630",
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
          color: "#D98A21",
          letterSpacing: "0.01em",
        }}
      >
        Source Documents ({documents.length})
      </span>

      <div style={{ height: "1px", background: "#3A3630" }} />
      {!loading && guardedDocuments.length > 0 && (
        <div style={styles.guardrailNotice}>
          <span style={styles.guardrailTitle}>Synthesis guardrail active</span>
          <span style={styles.guardrailText}>
            {guardedDocuments.length} approved source{guardedDocuments.length === 1 ? "" : "s"} may be minimized or excluded during generation because of low relevance.
          </span>
        </div>
      )}

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
              border: "2px solid #3A3630",
              borderTop: "2px solid #D85A30",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ color: "#8a8278", fontSize: "0.85rem" }}>
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
            color: "#8a8278",
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
                border: "1px solid #3A3630",
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
                  color: "#f0ece6",
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
                  background: "#D85A30",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="#f0ece6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {shouldWarnAboutSource(doc) && (
                <span style={styles.sourceWarning}>May be minimized</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function shouldWarnAboutSource(doc) {
  const score = Number(doc?.relevancyScore ?? doc?.overallScore);
  const recommendation = String(doc?.recommendationStatus || "").trim().toLowerCase();
  const relevance = String(doc?.relevanceLevel || "").trim().toLowerCase();
  return (Number.isFinite(score) && score < 60)
    || recommendation === "low relevance"
    || relevance === "low";
}

const styles = {
  guardrailNotice: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    background: "rgba(216, 90, 48, 0.12)",
    border: "1px solid rgba(216, 90, 48, 0.28)",
    borderRadius: "8px",
    padding: "10px 12px",
  },
  guardrailTitle: {
    color: "#D98A21",
    fontSize: "0.75rem",
    fontWeight: 700,
  },
  guardrailText: {
    color: "#f0ece6",
    fontSize: "0.75rem",
    lineHeight: 1.45,
  },
  sourceWarning: {
    color: "#D98A21",
    fontSize: "0.68rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
    marginLeft: "8px",
  },
};
