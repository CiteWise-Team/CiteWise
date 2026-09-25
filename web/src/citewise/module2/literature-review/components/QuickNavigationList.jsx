import { useState, useEffect, useRef } from "react";

export default function QuickNavigationList({
  documents = [],
  currentIndex = 0,
  onSelect,
  onApprovalToggle,
  onDelete,
  onBatchApprove, // ✨ NEW: optional callback for batch approve
}) {
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, index: null, name: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  // ✨ Set of originalIndexes the user has circle-selected for approval
  const [selectedForApproval, setSelectedForApproval] = useState(() => new Set());

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

  // ✨ Toggle circle selection for one doc
  const handleCircleClick = (e, originalIndex, doc) => {
    e.stopPropagation();

    // Already approved → immediate unapprove (safe action, no confirm needed)
    if (doc.approved) {
      onApprovalToggle && onApprovalToggle(originalIndex);
      // Also clear from selection if it was pending
      setSelectedForApproval((prev) => {
        const next = new Set(prev);
        next.delete(originalIndex);
        return next;
      });
      return;
    }

    // Toggle selection for batch approval
    setSelectedForApproval((prev) => {
      const next = new Set(prev);
      if (next.has(originalIndex)) {
        next.delete(originalIndex);
      } else {
        next.add(originalIndex);
      }
      return next;
    });
  };

  // ✨ Clear all selections
  const handleClearSelection = () => {
    setSelectedForApproval(new Set());
  };

  // ✨ Approve everything the user circle-selected
  const handleApproveSelected = () => {
    if (selectedForApproval.size === 0) return;
    const indices = Array.from(selectedForApproval);

    // Prefer the batch callback if provided (single API call in parent)
    if (onBatchApprove) {
      onBatchApprove(indices);
    } else {
      // Fallback: fire individual toggles one by one
      indices.forEach((idx) => onApprovalToggle && onApprovalToggle(idx));
    }

    setSelectedForApproval(new Set());
  };

  const selectionCount = selectedForApproval.size;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
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
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "16px",
                    height: "2px",
                    background: "#f97316",
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
                color: "#f97316",
              }}
            >
              Quick Navigation
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              color: "#6b7280",
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
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "7px 28px 7px 10px",
              color: "#111827",
              fontSize: "12px",
              fontFamily: "'Poppins', sans-serif",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#f97316";
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(249, 115, 22, 0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.boxShadow = "none";
            }}
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
                color: "#9ca3af",
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
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
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
                  background: isSelected ? "#f97316" : "#ffffff",
                  color: isSelected ? "#ffffff" : "#6b7280",
                  border: `1px solid ${isSelected ? "#f97316" : "#e5e7eb"}`,
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
                    e.currentTarget.style.borderColor = "#f97316";
                    e.currentTarget.style.color = "#f97316";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.color = "#6b7280";
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
              color: "#9ca3af",
              fontSize: "12px",
              fontFamily: "'Poppins', sans-serif",
              background: "#f9fafb",
              borderRadius: "8px",
              border: "1px dashed #e5e7eb",
              fontStyle: "italic",
            }}
          >
            No papers match current search / filter.
          </div>
        ) : (
          filteredDocs.map(({ doc, originalIndex }) => {
            const isActive = originalIndex === currentIndex;
            const isSelectedForApproval = selectedForApproval.has(originalIndex);

            return (
              <div
                key={doc.id || doc.name || originalIndex}
                ref={isActive ? activeItemRef : null}
                onClick={() => onSelect && onSelect(originalIndex)}
                style={{
                  background: isSelectedForApproval
                    ? "#fff2e0"
                    : isActive
                    ? "#fff7ef"
                    : "#ffffff",
                  border: `1px solid ${
                    isSelectedForApproval
                      ? "#f97316"
                      : isActive
                      ? "#f97316"
                      : "#e5e7eb"
                  }`,
                  borderLeft: isSelectedForApproval
                    ? "3px solid #f97316"
                    : isActive
                    ? "3px solid #f97316"
                    : "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  width: "100%",
                  boxSizing: "border-box",
                  boxShadow: isSelectedForApproval
                    ? "0 0 0 3px rgba(249, 115, 22, 0.15)"
                    : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !isSelectedForApproval) {
                    e.currentTarget.style.borderColor = "#f97316";
                    e.currentTarget.style.background = "#fffbf5";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && !isSelectedForApproval) {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.background = "#ffffff";
                  }
                }}
              >
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "12px",
                      color: isActive ? "#111827" : "#374151",
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
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    {typeof doc.relevancyScore === "number" ? (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color:
                            doc.relevancyScore >= 80
                              ? "#16a34a"
                              : doc.relevancyScore >= 50
                              ? "#d97706"
                              : "#6b7280",
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      >
                        {Math.round(doc.relevancyScore)}% relevance
                      </span>
                    ) : (
                      <span style={{ fontSize: "10px", color: "#9ca3af", fontFamily: "'Poppins', sans-serif" }}>
                        {doc.rawStatus === "complete" ? "Analyzed" : "Pending"}
                      </span>
                    )}
                    {doc.approved && (
                      <span
                        style={{
                          fontSize: "9px",
                          color: "#16a34a",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          fontFamily: "'Poppins', sans-serif",
                          letterSpacing: "0.03em",
                        }}
                      >
                        ✓ Approved
                      </span>
                    )}
                    {isSelectedForApproval && !doc.approved && (
                      <span
                        style={{
                          fontSize: "9px",
                          color: "#f97316",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          fontFamily: "'Poppins', sans-serif",
                          letterSpacing: "0.03em",
                        }}
                      >
                        ● Ready to approve
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                {onDelete && (
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
                      color: "#9ca3af",
                      fontSize: "13px",
                      lineHeight: 1,
                      cursor: "pointer",
                      padding: "3px 5px",
                      borderRadius: "4px",
                      flexShrink: 0,
                      transition: "color 0.15s, transform 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#dc2626";
                      e.currentTarget.style.transform = "scale(1.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#9ca3af";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    ✕
                  </button>
                )}

                {/* ✨ Clickable circle (multi-select) */}
                <button
                  type="button"
                  aria-label={
                    doc.approved
                      ? `Unapprove ${doc.name}`
                      : isSelectedForApproval
                      ? `Deselect ${doc.name}`
                      : `Select ${doc.name} for approval`
                  }
                  onClick={(e) => handleCircleClick(e, originalIndex, doc)}
                  title={
                    doc.approved
                      ? "Click to unapprove"
                      : isSelectedForApproval
                      ? "Selected — click again to deselect"
                      : "Click to add to selection"
                  }
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    border: doc.approved
                      ? "2px solid #16a34a"
                      : isSelectedForApproval
                      ? "2px solid #f97316"
                      : "2px solid #d1d5db",
                    background: doc.approved
                      ? "#16a34a"
                      : isSelectedForApproval
                      ? "#fff7ef"
                      : "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                    transition: "all 0.2s ease",
                    boxShadow: doc.approved
                      ? "0 0 0 3px rgba(22, 163, 74, 0.15)"
                      : isSelectedForApproval
                      ? "0 0 0 3px rgba(249, 115, 22, 0.2)"
                      : "0 1px 3px rgba(0, 0, 0, 0.08)",
                  }}
                  onMouseEnter={(e) => {
                    if (!doc.approved && !isSelectedForApproval) {
                      e.currentTarget.style.borderColor = "#f97316";
                      e.currentTarget.style.background = "#fff7ef";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!doc.approved && !isSelectedForApproval) {
                      e.currentTarget.style.borderColor = "#d1d5db";
                      e.currentTarget.style.background = "#ffffff";
                    }
                  }}
                >
                  {doc.approved ? (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : isSelectedForApproval ? (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* ✨ Bottom Approve button (multi-select aware) */}
      <div
        style={{
          flexShrink: 0,
          paddingTop: "10px",
          borderTop: "1px solid #f3f4f6",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {/* Small helper line above the button */}
        {selectionCount > 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              fontSize: "0.7rem",
              fontFamily: "'Poppins', sans-serif",
              color: "#9a3412",
            }}
          >
            <span>
              <strong style={{ color: "#f97316" }}>{selectionCount}</strong> paper{selectionCount !== 1 ? "s" : ""} selected
            </span>
            <button
              type="button"
              onClick={handleClearSelection}
              style={{
                background: "none",
                border: "none",
                color: "#6b7280",
                fontSize: "0.68rem",
                fontFamily: "'Poppins', sans-serif",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "4px",
                textDecoration: "underline",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
            >
              Clear
            </button>
          </div>
        ) : (
          <div
            style={{
              fontSize: "0.68rem",
              fontFamily: "'Poppins', sans-serif",
              color: "#9ca3af",
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            Click the circle next to one or more papers to select them.
          </div>
        )}

        <button
          type="button"
          onClick={handleApproveSelected}
          disabled={selectionCount === 0}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "11px 16px",
            borderRadius: "10px",
            border: "none",
            background:
              selectionCount === 0
                ? "#f3f4f6"
                : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            color: selectionCount === 0 ? "#9ca3af" : "#ffffff",
            fontFamily: "'Poppins', sans-serif",
            fontSize: "0.85rem",
            fontWeight: 700,
            letterSpacing: "0.02em",
            cursor: selectionCount === 0 ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            boxShadow:
              selectionCount === 0
                ? "none"
                : "0 4px 12px rgba(249, 115, 22, 0.25)",
          }}
          onMouseEnter={(e) => {
            if (selectionCount === 0) return;
            e.currentTarget.style.background =
              "linear-gradient(135deg, #fb8c3a 0%, #f97316 100%)";
            e.currentTarget.style.boxShadow =
              "0 6px 16px rgba(249, 115, 22, 0.4)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            if (selectionCount === 0) return;
            e.currentTarget.style.background =
              "linear-gradient(135deg, #f97316 0%, #ea580c 100%)";
            e.currentTarget.style.boxShadow =
              "0 4px 12px rgba(249, 115, 22, 0.25)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          title={
            selectionCount === 0
              ? "Select one or more papers first"
              : `Approve ${selectionCount} paper${selectionCount !== 1 ? "s" : ""}`
          }
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {selectionCount === 0
            ? "Approve Selected Papers"
            : `Approve ${selectionCount} Paper${selectionCount !== 1 ? "s" : ""}`}
        </button>
      </div>

      {deleteConfirm.show && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(17, 24, 39, 0.6)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10001,
          animation: "fadeInToast 0.3s ease-out forwards",
        }}>
          <div style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "20px",
            padding: "2rem",
            maxWidth: "460px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.15), 0 0 40px rgba(249, 115, 22, 0.08)",
            animation: "scaleInToast 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.25rem",
          }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#fff7ef",
              border: "2px solid #f97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(249, 115, 22, 0.2)",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </div>

            <div>
              <h3 style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: "1.2rem",
                color: "#111827",
                margin: "0 0 0.5rem 0",
              }}>
                Remove Document?
              </h3>
              <p style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.85rem",
                color: "#6b7280",
                lineHeight: "1.5",
                margin: 0,
              }}>
                Are you sure you want to remove <strong style={{ color: "#f97316" }}>"{deleteConfirm.name}"</strong>? This will permanently delete it from the current active assessment batch.
              </p>
            </div>

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
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  color: "#6b7280",
                  padding: "0.75rem 1rem",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#d1d5db";
                  e.currentTarget.style.color = "#374151";
                  e.currentTarget.style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.color = "#6b7280";
                  e.currentTarget.style.background = "transparent";
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
                  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  border: "none",
                  borderRadius: "10px",
                  color: "#ffffff",
                  padding: "0.75rem 1rem",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 4px 12px rgba(249, 115, 22, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, #fb8c3a 0%, #f97316 100%)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(249, 115, 22, 0.45)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, #f97316 0%, #ea580c 100%)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(249, 115, 22, 0.3)";
                }}
              >
                Remove File
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .citewise-queue-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .citewise-queue-scroll::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 4px;
        }
        .citewise-queue-scroll::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.3);
          border-radius: 4px;
        }
        .citewise-queue-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.6);
        }
      `}</style>
    </div>
  );
}