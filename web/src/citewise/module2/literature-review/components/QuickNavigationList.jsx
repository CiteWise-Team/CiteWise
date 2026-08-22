import { useState } from "react";

export default function QuickNavigationList({
  documents = [],
  currentIndex = 0,
  onSelect,
  onApprovalToggle,
  onDelete,
}) {
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, index: null, name: "" });
  return (
    <div
      style={{
        background: "#1e1e2f",
        border: "1px solid #3a3a55",
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
        /* Grow naturally with content, but never exceed the column height */
        maxHeight: '100%',
        minHeight: 0,
        overflowY: 'auto',
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "6px",
        }}
      >
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
            fontSize: "15px",
            fontWeight: "700",
            color: "#5b5bd6",
          }}
        >
          Quick Navigation
        </span>
      </div>

      {/* Document List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {documents.map((doc, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={doc.id || doc.name || index}
              onClick={() => onSelect && onSelect(index)}
              style={{
                background: "rgba(0, 0, 0, 0.15)",
                border: `1px solid ${isActive ? "#5b5bd6" : "#3a3a55"}`,
                borderRadius: "8px",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "#5b5bd6";
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.25)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "#3a3a55";
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.15)";
                }
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: "13px",
                    color: isActive ? "#e4e4f0" : "#a1a1b5",
                    fontWeight: isActive ? "600" : "500",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {doc.name}
                </span>
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
                      setDeleteConfirm({ show: true, index, name: doc.name });
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#a1a1b5",
                      fontSize: "14px",
                      lineHeight: 1,
                      cursor: "pointer",
                      padding: "4px 6px",
                      borderRadius: "4px",
                      flexShrink: 0,
                      transition: "color 0.15s, transform 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#e05555";
                      e.currentTarget.style.transform = "scale(1.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#a1a1b5";
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
                  onChange={() => onApprovalToggle && onApprovalToggle(index)}
                  onClick={(e) => e.stopPropagation()}
                />
              </span>
            </div>
          );
        })}
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
    </div>
  );
}
