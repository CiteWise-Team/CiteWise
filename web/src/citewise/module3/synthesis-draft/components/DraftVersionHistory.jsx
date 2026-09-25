// module3/synthesis-draft/components/DraftVersionHistory.jsx
//
// Req 7: Draft versioning. Every generation and every saved edit is recorded
// as a version. Users can restore a previous version, compare two versions
// side-by-side, or delete versions.

import { useEffect, useState } from "react";
import * as store from "../../../lib/citewiseStore";
import { ChevronDown, ChevronRight } from "lucide-react";

function fmt(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function DraftVersionHistory({ sessionId, currentContent, onRestore }) {
  const [versions, setVersions] = useState(() => store.getDraftVersions(sessionId));
  const [compare, setCompare] = useState(null); // { a, b }
  const [pickA, setPickA] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsub = store.subscribe(({ name }) => {
      if (name === "draftVersions") setVersions(store.getDraftVersions(sessionId));
    });
    return unsub;
  }, [sessionId]);

  useEffect(() => {
    setVersions(store.getDraftVersions(sessionId));
  }, [sessionId, currentContent]);

  const handleCompareClick = (v) => {
    if (!pickA) {
      setPickA(v);
    } else if (pickA.id === v.id) {
      setPickA(null);
    } else {
      setCompare({ a: pickA, b: v });
      setPickA(null);
    }
  };

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div 
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
          padding: "1.125rem 1.5rem",
          background: "#f9fafb",
          borderBottom: isOpen ? "1px solid #e5e7eb" : "none",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "1.05rem",
              color: "#f97316",
              letterSpacing: "0.01em",
            }}
          >
            Version History
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.72rem", color: "#6b7280", fontFamily: "'Poppins', sans-serif" }}>{versions.length} saved</span>
          {isOpen ? <ChevronDown size={18} color="#f97316" /> : <ChevronRight size={18} color="#9ca3af" />}
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "8px", maxHeight: 260, overflowY: "auto" }}>
          {versions.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: "0.8rem", fontFamily: "'Poppins', sans-serif", margin: 0, fontStyle: "italic" }}>
              No versions yet. Generate or edit the draft to create one.
            </p>
          ) : (
            <>
              {pickA && (
                <div style={{ fontSize: "0.72rem", color: "#f97316", fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>
                  Comparing from "{pickA.label}" — pick a second version…
                </div>
              )}
              {versions.map((v) => {
                const isCurrent = v.content === currentContent;
                return (
                  <div
                    key={v.id}
                    style={{
                      background: isCurrent ? "#fff7ef" : "#f9fafb",
                      border: `1px solid ${isCurrent ? "#f97316" : "#e5e7eb"}`,
                      borderRadius: "8px",
                      padding: "8px 10px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "0.8rem", color: "#111827", fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>
                          {v.label} {isCurrent && <span style={{ color: "#f97316", fontSize: "0.66rem" }}>(current)</span>}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "#6b7280", fontFamily: "'Poppins', sans-serif" }}>
                          {v.source === "edited" ? "Manual edit" : "Generated"} · {fmt(v.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button
                        onClick={() => onRestore?.(v)}
                        disabled={isCurrent}
                        style={{
                          background: "transparent",
                          color: isCurrent ? "#9ca3af" : "#f97316",
                          border: `1px solid ${isCurrent ? "#e5e7eb" : "rgba(249, 115, 22, 0.45)"}`,
                          borderRadius: "6px",
                          padding: "3px 10px",
                          fontSize: "0.7rem",
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 600,
                          cursor: isCurrent ? "not-allowed" : "pointer",
                          opacity: isCurrent ? 0.5 : 1,
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isCurrent) {
                            e.currentTarget.style.background = "rgba(249, 115, 22, 0.1)";
                            e.currentTarget.style.borderColor = "#f97316";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isCurrent) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.45)";
                          }
                        }}
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleCompareClick(v)}
                        style={{
                          background: "transparent",
                          color: pickA?.id === v.id ? "#f97316" : "#374151",
                          border: `1px solid ${pickA?.id === v.id ? "#f97316" : "#e5e7eb"}`,
                          borderRadius: "6px",
                          padding: "3px 10px",
                          fontSize: "0.7rem",
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f9fafb";
                          e.currentTarget.style.borderColor = "#f97316";
                          e.currentTarget.style.color = "#f97316";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.borderColor = pickA?.id === v.id ? "#f97316" : "#e5e7eb";
                          e.currentTarget.style.color = pickA?.id === v.id ? "#f97316" : "#374151";
                        }}
                      >
                        {pickA?.id === v.id ? "Selected" : "Compare"}
                      </button>
                      <button
                        onClick={() => store.removeDraftVersion(sessionId, v.id)}
                        style={{
                          background: "transparent",
                          color: "#dc2626",
                          border: "1px solid rgba(220, 38, 38, 0.4)",
                          borderRadius: "6px",
                          padding: "3px 10px",
                          fontSize: "0.7rem",
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(220, 38, 38, 0.08)";
                          e.currentTarget.style.borderColor = "#dc2626";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.4)";
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {compare && (
        <div
          onClick={() => setCompare(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.6)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "16px",
              width: "min(1000px, 95vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.125rem 1.5rem",
                background: "#f9fafb",
borderBottom: "1px solid #e5e7eb",
              }}
            >
              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  color: "#f97316",
                  letterSpacing: "0.01em",
                }}
              >
                Compare versions
              </span>
              <button
                onClick={() => setCompare(null)}
                style={{
                  background: "transparent",
                  color: "#6b7280",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  padding: "4px 12px",
                  cursor: "pointer",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#374151";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#6b7280";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, overflow: "hidden", flex: 1 }}>
              {[compare.a, compare.b].map((v, i) => (
                <div key={i} style={{ padding: 16, overflowY: "auto", borderLeft: i === 1 ? "1px solid #e5e7eb" : "none" }}>
                  <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#f97316", fontFamily: "'Poppins', sans-serif", marginBottom: 8 }}>
                    {v.label} · {fmt(v.timestamp)}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem", color: "#1f2937", fontFamily: "'Poppins', sans-serif", lineHeight: 1.6 }}>
                    {v.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}