// Req 9: approval is a checkbox (per adviser feedback to replace AI-assessment
// switches/buttons with checkboxes where appropriate).
function ApprovalToggle({ isApproved, onToggle }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(0, 0, 0, 0.15)",
        border: "1px solid #3a3a55",
        borderRadius: "12px",
        padding: "16px 20px",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: "14px",
          fontWeight: "700",
          color: "#5b5bd6",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        Approve this RRL
      </span>

      <input
        type="checkbox"
        checked={!!isApproved}
        onChange={onToggle}
        style={{
          width: "22px",
          height: "22px",
          accentColor: "#5b5bd6",
          cursor: "pointer",
          flexShrink: 0,
        }}
      />
    </label>
  );
}

export default function DocumentActiveCard({
  documents = [],
  currentIndex = 0,
  onNavigate,
  onApprovalToggle,
}) {
  const hasDocs = documents.length > 0;

  if (!hasDocs) {
    return (
      <div
        style={{
          background: "#1e1e2f",
          border: "1px solid #3a3a55",
          borderRadius: "16px",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
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
            background: "rgba(0, 0, 0, 0.15)",
            borderBottom: "1px solid #3a3a55",
          }}
        >
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "15px",
              fontWeight: "700",
              color: "#a1a1b5",
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
            background: "rgba(91, 91, 214, 0.1)",
            border: "1px solid rgba(91, 91, 214, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#5b5bd6"
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
            color: "#a1a1b5",
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
        background: "#1e1e2f",
        border: "1px solid #3a3a55",
        borderRadius: "16px",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
        overflow: "hidden",
      }}
    >
      {/* Header: doc count + pagination */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 0,
          padding: "1.125rem 1.5rem",
          background: "rgba(0, 0, 0, 0.15)",
          borderBottom: "1px solid #3a3a55",
        }}
      >
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "15px",
            fontWeight: "700",
            color: "#5b5bd6",
          }}
        >
          Document {currentIndex + 1} of {documents.length}
        </span>

        <div style={{ display: "flex", gap: "10px" }}>
          {["‹", "›"].map((arrow, i) => (
            <button
              key={arrow}
              onClick={() => onNavigate && onNavigate(i === 0 ? currentIndex - 1 : currentIndex + 1)}
              style={{
                background: "#5b5bd6",
                border: "1px solid #5b5bd6",
                color: "#ffffff",
                cursor: "pointer",
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                fontSize: "22px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                padding: 0,
                boxShadow: "0 0 10px rgba(91, 91, 214, 0.35)",
                transition: "transform 0.15s, opacity 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.2)";
                e.currentTarget.style.boxShadow = "0 0 14px rgba(91, 91, 214, 0.55)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 0 10px rgba(91, 91, 214, 0.35)";
              }}
            >
              {arrow}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 20px 20px 20px" }}>

        {/* Separator removed as requested */}

        {/* Document Info - Flat layout */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "20px",
            padding: "0 4px",
          }}
        >
        {/* PDF folding dog-ear icon */}
        <div
          style={{
            position: "relative",
            width: "36px",
            height: "46px",
            background: "#5b5bd6",
            borderRadius: "4px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: "6px",
            flexShrink: 0,
          }}
        >
          {/* Dog-ear triangle overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 0,
              height: 0,
              borderStyle: "solid",
              borderWidth: "0 10px 10px 0",
              borderColor: "transparent transparent #1e1e2f #1e1e2f",
              borderTopRightRadius: "4px",
            }}
          />
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "9px",
              fontWeight: "900",
              color: "#e4e4f0",
              letterSpacing: "0.2px",
            }}
          >
            PDF
          </span>
        </div>

        <div>
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "15px",
              fontWeight: "600",
              color: "#e4e4f0",
              marginBottom: "3px",
            }}
          >
            {doc.name}
          </div>
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "12px",
              color: "#a1a1b5",
            }}
          >
            {doc.size} - {doc.pages} pages
          </div>
        </div>
      </div>

        {/* Approval Toggle */}
        <ApprovalToggle
          isApproved={doc.approved}
          onToggle={() => onApprovalToggle && onApprovalToggle(currentIndex)}
        />
      </div>
    </div>
  );
}