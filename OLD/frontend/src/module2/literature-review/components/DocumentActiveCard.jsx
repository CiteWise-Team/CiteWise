import { useState } from "react";

function ApprovalToggle({ isApproved, onToggle }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(0, 0, 0, 0.15)",
        border: "1px solid #3A3630",
        borderRadius: "12px",
        padding: "16px 20px",
      }}
    >
      <span
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: "14px",
          fontWeight: "700",
          color: "#D98A21",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        Approval Status
      </span>

      {/* Toggle Switch */}
      <div
        onClick={onToggle}
        style={{
          width: "54px",
          height: "28px",
          borderRadius: "14px",
          background: "#12100e",
          border: "1px solid #3A3630",
          position: "relative",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: isApproved ? "#D85A30" : "#3A3630",
            position: "absolute",
            top: "3px",
            left: isApproved ? "29px" : "3px",
            transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s",
            boxShadow: isApproved ? "0 0 8px rgba(216, 90, 48, 0.4)" : "none",
          }}
        />
      </div>
    </div>
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
          background: "#1E1C19",
          border: "1px solid #3A3630",
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
            borderBottom: "1px solid #3A3630",
          }}
        >
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "15px",
              fontWeight: "700",
              color: "#8a8278",
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
            background: "rgba(217, 138, 33, 0.1)",
            border: "1px solid rgba(217, 138, 33, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#D98A21"
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
            color: "#8a8278",
            lineHeight: "1.5",
          }}>
            Upload PDF candidates using the orange button to view and manage their AI assessments.
          </span>
        </div>
      </div>
    );
  }

  const doc = documents[currentIndex];

  return (
    <div
      style={{
        background: "#1E1C19",
        border: "1px solid #3A3630",
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
          borderBottom: "1px solid #3A3630",
        }}
      >
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "15px",
            fontWeight: "700",
            color: "#D98A21",
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
                background: "#D85A30",
                border: "1px solid #D85A30",
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
                boxShadow: "0 0 10px rgba(216, 90, 48, 0.35)",
                transition: "transform 0.15s, opacity 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.2)";
                e.currentTarget.style.boxShadow = "0 0 14px rgba(216, 90, 48, 0.55)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 0 10px rgba(216, 90, 48, 0.35)";
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
            background: "#D85A30",
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
              borderColor: "transparent transparent #1E1C19 #1E1C19",
              borderTopRightRadius: "4px",
            }}
          />
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "9px",
              fontWeight: "900",
              color: "#f0ece6",
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
              color: "#f0ece6",
              marginBottom: "3px",
            }}
          >
            {doc.name}
          </div>
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "12px",
              color: "#8a8278",
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