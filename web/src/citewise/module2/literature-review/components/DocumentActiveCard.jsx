export default function DocumentActiveCard({
  documents = [],
  currentIndex = 0,
  onNavigate,
}) {
  const hasDocs = documents.length > 0;

  if (!hasDocs) {
    return (
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "16px",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        {/* Header: No documents */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 0,
            padding: "1.125rem 1.5rem",
            background: "linear-gradient(180deg, #fff2e0 0%, #ffe9d1 100%)",
            borderBottom: "1px solid rgba(249, 115, 22, 0.18)",
          }}
        >
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "15px",
              fontWeight: "700",
              color: "#f97316",
            }}
          >
            No documents uploaded
          </span>
        </div>

        <div style={{ padding: "2rem 1.5rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "#fff7ef",
            border: "1px solid #fed7aa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f97316",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <span style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "0.85rem",
            color: "#6b7280",
            lineHeight: "1.5",
          }}>
            Upload PDF candidates using the upload button to view and manage their AI assessments.
          </span>
        </div>
      </div>
    );
  }

  const doc = documents[currentIndex];

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          gap: "14px",
        }}
      >
        {/* PDF folding dog-ear icon */}
        <div
          style={{
            position: "relative",
            width: "36px",
            height: "46px",
            background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            borderRadius: "4px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: "6px",
            flexShrink: 0,
            boxShadow: "0 2px 6px rgba(249, 115, 22, 0.25)",
          }}
        >
          {/* Dog-ear triangle overlay — matches white card bg */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 0,
              height: 0,
              borderStyle: "solid",
              borderWidth: "0 10px 10px 0",
              borderColor: "transparent transparent #ffffff #ffffff",
              borderTopRightRadius: "4px",
            }}
          />
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "9px",
              fontWeight: "900",
              color: "#ffffff",
              letterSpacing: "0.2px",
            }}
          >
            PDF
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "14px",
              fontWeight: "600",
              color: "#111827",
              marginBottom: "4px",
              wordWrap: "break-word",
              whiteSpace: "normal",
            }}
          >
            {doc.name}
          </div>
          {doc.title && doc.title !== doc.name && (
            <div
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "12px",
                color: "#6b7280",
                marginBottom: "4px",
                fontStyle: "italic",
                wordWrap: "break-word",
                whiteSpace: "normal",
              }}
            >
              {doc.title}
            </div>
          )}
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "12px",
              color: "#9ca3af",
            }}
          >
            {doc.size}
          </div>
        </div>
      </div>
    </div>
  );
}