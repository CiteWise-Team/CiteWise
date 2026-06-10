import React from 'react';

// Map relevance level to the exact string expected by the design
const RELEVANCE_COLORS = {
  High: "#D85A30",
  Medium: "#D98A21",
  Low: "#8a8278",
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
  const color = RELEVANCE_COLORS[relevanceDisplay] || "#8a8278";

  return (
    <div
      style={{
        display: "flex",
        gap: "14px",
        padding: "18px 16px",
        borderBottom: "1px solid #3A3630",
      }}
    >
      {/* Index number box */}
      <div
        style={{
          width: "32px",
          height: "32px",
          border: "1px solid #3A3630",
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
            fontFamily: "'Geist Mono', monospace",
            fontSize: "12px",
            color: "#8a8278",
            fontWeight: "600",
          }}
        >
          {index}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {criterion && (
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: '#8a8278', marginBottom: 6 }}>
            {criterion}
            {evidenceType ? <span style={{ marginLeft: 8, color: '#8a8278' }}>· {evidenceType}</span> : null}
          </div>
        )}

        <p
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "13px",
            color: "#f0ece6",
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
              fontFamily: "'Geist Mono', monospace",
              fontSize: "11px",
              color: "#8a8278",
            }}
          >
            Page {page}
          </span>
          <span style={{ color: "#8a8278", fontSize: "11px" }}>·</span>
          <span
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: "11px",
              color: "#8a8278",
            }}
          >
            Relevance: {" "}
            <span
              style={{
                color: color,
                fontWeight: "600",
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
  // Same empty check as first file
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D98A21" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.89a.5.5 0 0 0 .22.96h11.34a.5.5 0 0 0 .22-.96l-1.78-.89a2 2 0 0 1-1.11-1.79V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.76z" />
          </svg>
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "16px",
              fontWeight: "700",
              color: "#D98A21",
            }}
          >
            Highlighted Evidence Excerpts
          </span>
        </div>
        {/* Scrollable container with empty message */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.15)",
            border: "1px solid #3A3630",
            borderRadius: "10px",
            padding: "0 20px",
            maxHeight: "320px",
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "#333028 rgba(0, 0, 0, 0.15)",
          }}
        >
          <div
            style={{
              padding: "32px 0",
              textAlign: "center",
              fontFamily: "'Geist Mono', monospace",
              fontSize: "12px",
              color: "#8a8278",
            }}
          >
            No evidence excerpts available.
          </div>
        </div>
      </div>
    );
  }

  // Map from first file's shape to the display format
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
      {/* Section Header (same as file 2) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "8px",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D98A21" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.89a.5.5 0 0 0 .22.96h11.34a.5.5 0 0 0 .22-.96l-1.78-.89a2 2 0 0 1-1.11-1.79V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.76z" />
        </svg>
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "16px",
            fontWeight: "700",
            color: "#D98A21",
          }}
        >
          Highlighted Evidence Excerpts
        </span>
      </div>

      {/* Scrollable list */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.15)",
          border: "1px solid #3A3630",
          borderRadius: "10px",
          padding: "0 20px",
          maxHeight: "320px",
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "#333028 rgba(0, 0, 0, 0.15)",
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