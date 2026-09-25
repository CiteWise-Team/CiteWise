import React from 'react';

// Map relevance level to theme colors
const RELEVANCE_COLORS = {
  High: "#f97316",    // orange — strongest signal
  Medium: "#d97706",  // amber
  Low: "#6b7280",     // gray
};

const getRelevanceDisplay = (level) => {
  if (!level) return "Unknown";
  const normalized = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
  return normalized === "High" || normalized === "Medium" || normalized === "Low"
    ? normalized
    : "Unknown";
};

const ExcerptItem = ({ index, quote, page, relevance, criterion, evidenceType }) => {
  const relevanceDisplay = getRelevanceDisplay(relevance);
  const color = RELEVANCE_COLORS[relevanceDisplay] || "#6b7280";

  return (
    <div
      style={{
        display: "flex",
        gap: "14px",
        padding: "18px 16px",
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      {/* Index number box */}
      <div
        style={{
          width: "32px",
          height: "32px",
          background: "#fff7ef",
          border: "1px solid #fed7aa",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: "2px",
        }}
      >
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "12px",
            color: "#f97316",
            fontWeight: "700",
          }}
        >
          {index}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {criterion && (
          <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: '#6b7280', marginBottom: 6, fontWeight: 600, letterSpacing: '0.02em' }}>
            {criterion}
            {evidenceType ? <span style={{ marginLeft: 8, color: '#9ca3af', fontWeight: 500 }}>· {evidenceType}</span> : null}
          </div>
        )}

        <p
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "13px",
            color: "#1f2937",
            lineHeight: "1.65",
            margin: "0 0 8px 0",
            fontStyle: "italic",
          }}
        >
          "{quote}"
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "11px",
              color: "#9ca3af",
            }}
          >
            Page {page}
          </span>
          <span style={{ color: "#d1d5db", fontSize: "11px" }}>·</span>
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "11px",
              color: "#9ca3af",
            }}
          >
            Relevance: {" "}
            <span
              style={{
                color: color,
                fontWeight: "700",
              }}
            >
              {relevanceDisplay}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

const EvidenceExcerptList = ({ excerpts }) => {
  // Empty state
  if (!excerpts || excerpts.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* Header always visible */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "8px",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.89a.5.5 0 0 0 .22.96h11.34a.5.5 0 0 0 .22-.96l-1.78-.89a2 2 0 0 1-1.11-1.79V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.76z" />
          </svg>
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "16px",
              fontWeight: "700",
              color: "#f97316",
            }}
          >
            Highlighted Evidence Excerpts
          </span>
        </div>
        {/* Empty message container */}
        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "0 20px",
            maxHeight: "320px",
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "#e5e7eb #f9fafb",
          }}
        >
          <div
            style={{
              padding: "32px 0",
              textAlign: "center",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "12px",
              color: "#9ca3af",
              fontStyle: "italic",
            }}
          >
            No evidence excerpts available.
          </div>
        </div>
      </div>
    );
  }

  // Map excerpts to display format
  const items = excerpts.map((excerpt, idx) => ({
    id: idx,
    quote: excerpt.quoteText || excerpt.quote || "",
    page: excerpt.pageNumber || excerpt.page || "N/A",
    relevance: excerpt.relevanceLevel || excerpt.relevance || "Unknown",
    criterion: excerpt.criterion || null,
    evidenceType: excerpt.evidenceType || null,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "8px",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.89a.5.5 0 0 0 .22.96h11.34a.5.5 0 0 0 .22-.96l-1.78-.89a2 2 0 0 1-1.11-1.79V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.76z" />
        </svg>
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "16px",
            fontWeight: "700",
            color: "#f97316",
          }}
        >
          Highlighted Evidence Excerpts
        </span>
      </div>

      {/* Scrollable list */}
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "0 20px",
          maxHeight: "320px",
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "#e5e7eb #f9fafb",
        }}
      >
        {items.map((item, i) => (
          <ExcerptItem
            key={i}
            index={i + 1}
            quote={item.quote}
            page={item.page}
            relevance={item.relevance}
            criterion={item.criterion}
            evidenceType={item.evidenceType}
          />
        ))}
      </div>
    </div>
  );
};

export default EvidenceExcerptList;