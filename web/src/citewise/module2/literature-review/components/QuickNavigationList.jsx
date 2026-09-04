import { useState, useEffect, useRef } from "react";

export default function QuickNavigationList({
  documents = [],
  currentIndex = 0,
  onSelect,
  onApprovalToggle,
  onDelete,
}) {
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, index: null, name: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const totalCount = documents.length;
  const approvedCount = documents.filter((d) => !!d.approved).length;
  const highCount = documents.filter((d) => {
    const score = d.relevancyScore;
    return (
      (typeof score === "number" && score >= 80) ||
      d.relevanceLevel === "High" ||
      d.relevanceLevel === "high"
    );
  }).length;
  const pendingCount = documents.filter(
    (d) => !d.approved || (d.rawStatus && d.rawStatus !== "complete")
  ).length;

  const filteredDocs = documents
    .map((doc, originalIndex) => ({ doc, originalIndex }))
    .filter(({ doc }) => {
      if (activeFilter === "approved" && !doc.approved) return false;
      if (activeFilter === "high") {
        const score = doc.relevancyScore;
        const isHigh =
          (typeof score === "number" && score >= 80) ||
          doc.relevanceLevel === "High" ||
          doc.relevanceLevel === "high";
        if (!isHigh) return false;
      }
      if (activeFilter === "pending") {
        const isPending = !doc.approved || (doc.rawStatus && doc.rawStatus !== "complete");
        if (!isPending) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (doc.name || "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });

  const activeItemRef = useRef(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [currentIndex]);

  return (
    <div
      style={{
        background: "#1e1e2f",
        border: "1px solid #3a3a55",
        borderRadius: "16px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
        height: "500px",
        maxHeight: "540px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Pinned Top Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", flexShrink: 0 }}>
        {/* Section Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Hamburger icon */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "16px",
                    height: "2px",
                    background: "#5b5bd6",
                    borderRadius: "1px",
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "14px",
                fontWeight: "700",
                color: "#5b5bd6",
              }}
            >
              Quick Navigation
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              color: "#a1a1b5",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 500,
            }}
          >
            {filteredDocs.length} of {totalCount} papers
          </span>
        </div>

        {/* Search Input Bar */}
        <div style={{ position: "relative", width: "100%" }}>
          <input
            type="text"
            placeholder="Search papers by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(0, 0, 0, 0.25)",
              border: "1px solid #3a3a55",
              borderRadius: "8px",
              padding: "7px 28px 7px 10px",
              color: "#e4e4f0",
              fontSize: "12px",
              fontFamily: "'Poppins', sans-serif",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s ease",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#5b5bd6")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#3a3a55")}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#a1a1b5",
                cursor: "pointer",
                padding: "2px",
                fontSize: "12px",
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips / Tabs */}
        <div
          style={{
            display: "flex",
            gap: "5px",
            flexWrap: "wrap",
          }}
        >
          {[
            { id: "all", label: `All (${totalCount})` },
            { id: "approved", label: `Approved (${approvedCount})` },
            { id: "high", label: `High (${highCount})` },
            { id: "pending", label: `Pending (${pendingCount})` },
          ].map((tab) => {
            const isSelected = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                style={{
                  background: isSelected ? "#5b5bd6" : "rgba(0, 0, 0, 0.2)",
                  color: isSelected ? "#ffffff" : "#a1a1b5",
                  border: `1px solid ${isSelected ? "#5b5bd6" : "#3a3a55"}`,
                  borderRadius: "12px",
                  padding: "3px 8px",
                  fontSize: "11px",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: isSelected ? 600 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "#5b5bd6";
                    e.currentTarget.style.color = "#e4e4f0";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "#3a3a55";
                    e.currentTarget.style.color = "#a1a1b5";
                  }
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Document List (Scrollable) */}
      <div
        className="citewise-queue-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          paddingRight: "4px",
        }}
      >
        {filteredDocs.length === 0 ? (
          <div
            style={{
              padding: "16px 8px",
              textAlign: "center",
              color: "#a1a1b5",
              fontSize: "12px",
              fontFamily: "'Poppins', sans-serif",
              background: "rgba(0, 0, 0, 0.1)",
              borderRadius: "8px",
              border: "1px dashed #3a3a55",
            }}
          >
            No papers match current search / filter.
          </div>
        ) : (
          filteredDocs.map(({ doc, originalIndex }) => {
            const isActive = originalIndex === currentIndex;
            return (
              <div
                key={doc.id || doc.name || originalIndex}
                ref={isActive ? activeItemRef : null}
                onClick={() => onSelect && onSelect(originalIndex)}
                style={{
                  background: isActive ? "rgba(91, 91, 214, 0.18)" : "rgba(0, 0, 0, 0.2)",
                  border: `1px solid ${isActive ? "#5b5bd6" : "rgba(58, 58, 85, 0.6)"}`,
                  borderLeft: isActive ? "3px solid #6f6fe0" : "1px solid rgba(58, 58, 85, 0.6)",
                  borderRadius: "8px",
                  padding: "7px 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = "#5b5bd6";
                    e.currentTarget.style.background = "rgba(91, 91, 214, 0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = "rgba(58, 58, 85, 0.6)";
                    e.currentTarget.style.background = "rgba(0, 0, 0, 0.2)";
                  }
                }}
              >
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "12px",
                      color: isActive ? "#ffffff" : "#e4e4f0",
                      fontWeight: isActive ? "600" : "500",
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={doc.name}
                  >
                    {doc.name}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {typeof doc.relevancyScore === "number" ? (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color: doc.relevancyScore >= 80 ? "#4caf82" : doc.relevancyScore >= 50 ? "#e0a835" : "#a1a1b5",
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      >
                        {Math.round(doc.relevancyScore)}% relevance
                      </span>
                    ) : (
                      <span style={{ fontSize: "10px", color: "rgba(240, 236, 230, 0.35)", fontFamily: "'Poppins', sans-serif" }}>
                        {doc.rawStatus === "complete" ? "Analyzed" : "Pending"}
                      </span>
                    )}
                    {doc.approved && (
                      <span style={{ fontSize: "9px", color: "#4caf82", fontWeight: 700, textTransform: "uppercase", fontFamily: "'Poppins', sans-serif" }}>
                        ✓ Approved
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons (Delete) if needed, styled minimally */}
                {onDelete && (
                  <span className="quick-nav-tooltip-anchor">
                    <span className="quick-nav-tooltip" role="tooltip">Remove this document</span>
                    <button
                      type="button"
                      aria-label={`Delete ${doc.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({ show: true, index: originalIndex, name: doc.name });
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(240, 236, 230, 0.4)",
                        fontSize: "13px",
                        lineHeight: 1,
                        cursor: "pointer",
                        padding: "3px 5px",
                        borderRadius: "4px",
                        flexShrink: 0,
                        transition: "color 0.15s, transform 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#e05555";
                        e.currentTarget.style.transform = "scale(1.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "rgba(240, 236, 230, 0.4)";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      ✕
                    </button>
                  </span>
                )}

                {/* Status indicator circle */}
                <span className="quick-nav-tooltip-anchor">
                  <span className="quick-nav-tooltip" role="tooltip">
                    {doc.approved ? "Click to unapprove this document" : "Click to approve this document"}
                  </span>
                  <input
                    type="checkbox"
                    className="quick-nav-approval-checkbox"
                    checked={!!doc.approved}
                    aria-label={`${doc.approved ? "Unapprove" : "Approve"} ${doc.name}`}
                    onChange={() => onApprovalToggle && onApprovalToggle(originalIndex)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </span>
              </div>
            );
          })
        )}
      </div>

      {deleteConfirm.show && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(14, 12, 10, 0.75)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10001,
          animation: "fadeInToast 0.3s ease-out forwards",
        }}>
          <div style={{
            background: "#1e1e2f",
            border: "1px solid rgba(91, 91, 214, 0.25)",
            borderRadius: "20px",
            padding: "2rem",
            maxWidth: "460px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(91, 91, 214, 0.1)",
            animation: "scaleInToast 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.25rem",
          }}>
            {/* Trash Warning Icon */}
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "rgba(91, 91, 214, 0.1)",
              border: "2px solid #5b5bd6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(91, 91, 214, 0.2)",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5b5bd6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </div>

            {/* Title & Body */}
            <div>
              <h3 style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: "1.2rem",
                color: "#e4e4f0",
                margin: "0 0 0.5rem 0",
              }}>
                Remove Document?
              </h3>
              <p style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.85rem",
                color: "#a1a1b5",
                lineHeight: "1.5",
                margin: 0,
              }}>
                Are you sure you want to remove <strong style={{ color: "#5b5bd6" }}>"{deleteConfirm.name}"</strong>? This will permanently delete it from the current active assessment batch.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
              width: "100%",
              marginTop: "0.5rem",
            }}>
              <button
                type="button"
                onClick={() => setDeleteConfirm({ show: false, index: null, name: "" })}
                style={{
                  background: "transparent",
                  border: "1px solid #3a3a55",
                  borderRadius: "10px",
                  color: "#a1a1b5",
                  padding: "0.75rem 1rem",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#a1a1b5";
                  e.currentTarget.style.color = "#e4e4f0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#3a3a55";
                  e.currentTarget.style.color = "#a1a1b5";
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(deleteConfirm.index);
                  setDeleteConfirm({ show: false, index: null, name: "" });
                }}
                style={{
                  background: "#5b5bd6",
                  border: "none",
                  borderRadius: "10px",
                  color: "#e4e4f0",
                  padding: "0.75rem 1rem",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 4px 12px rgba(91, 91, 214, 0.25)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e06c45";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#5b5bd6";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Remove File
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Scrollbar Styling */}
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
    </div>
  );
}
