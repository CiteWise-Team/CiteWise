// module3/synthesis-draft/components/DraftVersionHistory.jsx
//
// Req 7: Draft versioning. Every generation and every saved edit is recorded
// as a version. Users can restore a previous version, compare two versions
// side-by-side, or delete versions.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import * as store from "../../../lib/citewiseStore";
import { ChevronDown, ChevronUp, MoreHorizontal, RotateCcw, GitCompare, Trash2 } from "lucide-react";
import { useTheme } from "../../../../context/ThemeContext";

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
  const { isDark } = useTheme();
  const [versions, setVersions] = useState(() => store.getDraftVersions(sessionId));
  const [compare, setCompare] = useState(null); // { a, b }
  const [pickA, setPickA] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // { version, top, left }

  useEffect(() => {
    if (!activeMenu) return;
    const handleClose = () => setActiveMenu(null);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    window.addEventListener("click", handleClose);
    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("click", handleClose);
    };
  }, [activeMenu]);

  useEffect(() => {
    const unsub = store.subscribe(({ name }) => {
      if (name === "draftVersions") setVersions(store.getDraftVersions(sessionId));
    });
    return unsub;
  }, [sessionId]);

  useEffect(() => {
    setVersions(store.getDraftVersions(sessionId));
  }, [sessionId, currentContent]);

  const handleToggleMenu = (e, v) => {
    e.stopPropagation();
    if (activeMenu?.version?.id === v.id) {
      setActiveMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = 145;

    // Position at the right side of the 3 dots button
    let left = rect.right + 8;
    // If not enough room on the right side of the screen, place to the left of the button
    if (left + menuWidth > window.innerWidth - 12) {
      left = Math.max(12, rect.left - menuWidth - 8);
    }

    // Align with the top of the button
    let top = rect.top - 6;
    if (top + menuHeight > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - menuHeight - 12);
    }
    if (top < 12) top = 12;

    setActiveMenu({ version: v, top, left });
  };

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
        background: "var(--cw-bg-surface, #ffffff)",
        border: "1px solid var(--cw-border, #e5e7eb)",
        borderRadius: "16px",
        overflow: isOpen ? "visible" : "hidden",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div 
        className="workflow-card-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
          padding: "1.125rem 1.5rem",
          background: "var(--cw-bg-surface-elevated, #f9fafb)",
          borderBottom: isOpen ? "1px solid var(--cw-border, #e5e7eb)" : "none",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "1.05rem",
              color: "var(--cw-text-primary, #0f0e17)",
              letterSpacing: "0.01em",
            }}
          >
            Version History
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.72rem", color: "#6b7280", fontFamily: "'Poppins', sans-serif" }}>{versions.length} saved</span>
          <span style={{ display: "inline-flex", alignItems: "center", color: "var(--cw-text-muted, #6b7280)" }}>
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
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
              <div
                className="workflow-scrollable"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  maxHeight: "310px",
                  overflowY: versions.length > 5 ? "auto" : "visible",
                  paddingRight: versions.length > 5 ? "4px" : "0px",
                }}
              >
                {versions.map((v) => {
                  const isCurrent = v.content === currentContent;
                  return (
                    <div
                      key={v.id}
                      style={{
                        background: isCurrent 
                          ? (isDark ? "rgba(249, 115, 22, 0.15)" : "#fff7ef") 
                          : (isDark ? "rgba(255, 255, 255, 0.04)" : "#f9fafb"),
                        border: `1px solid ${isCurrent ? "#f97316" : (isDark ? "rgba(255, 255, 255, 0.08)" : "#e5e7eb")}`,
                        borderRadius: "8px",
                        padding: "10px 12px",
                        position: "relative",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: "0.82rem", color: isDark ? "#f9fafb" : "#111827", fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>
                            {v.label} {isCurrent && <span style={{ color: "#f97316", fontSize: "0.68rem", fontWeight: 700 }}>(current)</span>}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: isDark ? "#9ca3af" : "#6b7280", fontFamily: "'Poppins', sans-serif", marginTop: 2 }}>
                            {v.source === "edited" ? "Manual edit" : "Generated"} · {fmt(v.timestamp)}
                          </div>
                        </div>

                        {/* 3 dots menu button */}
                        <button
                          type="button"
                          title="Version options"
                          aria-label="Version options"
                          onClick={(e) => handleToggleMenu(e, v)}
                          style={{
                            background: activeMenu?.version?.id === v.id 
                              ? (isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)") 
                              : "transparent",
                            border: `1px solid ${activeMenu?.version?.id === v.id ? (isDark ? "rgba(255, 255, 255, 0.25)" : "#d1d5db") : "transparent"}`,
                            borderRadius: "6px",
                            padding: "4px 6px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: activeMenu?.version?.id === v.id
                              ? (isDark ? "#ffffff" : "#111827")
                              : (isDark ? "#cbd5e1" : "#6b7280"),
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";
                            e.currentTarget.style.color = isDark ? "#ffffff" : "#111827";
                          }}
                          onMouseLeave={(e) => {
                            if (activeMenu?.version?.id !== v.id) {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = isDark ? "#cbd5e1" : "#6b7280";
                            }
                          }}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating 3-dots Menu rendered via Portal to the right of the button */}
      {activeMenu && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: `${activeMenu.top}px`,
            left: `${activeMenu.left}px`,
            background: isDark ? "#15141f" : "#ffffff",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: isDark
              ? "0 16px 36px rgba(0, 0, 0, 0.55)"
              : "0 16px 36px rgba(0, 0, 0, 0.12)",
            zIndex: 99999,
            minWidth: "155px",
            padding: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            animation: "cwFadeIn 0.15s ease-out",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Restore */}
          <button
            type="button"
            disabled={activeMenu.version.content === currentContent}
            onClick={() => {
              if (activeMenu.version.content !== currentContent) {
                onRestore?.(activeMenu.version);
                setActiveMenu(null);
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: activeMenu.version.content === currentContent
                ? (isDark ? "#6b7280" : "#9ca3af")
                : (isDark ? "#f3f4f6" : "#1f2937"),
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.82rem",
              fontWeight: 500,
              cursor: activeMenu.version.content === currentContent ? "not-allowed" : "pointer",
              opacity: activeMenu.version.content === currentContent ? 0.45 : 1,
              textAlign: "left",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (activeMenu.version.content !== currentContent) {
                e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.09)" : "rgba(0, 0, 0, 0.05)";
                e.currentTarget.style.color = isDark ? "#ffffff" : "#111827";
              }
            }}
            onMouseLeave={(e) => {
              if (activeMenu.version.content !== currentContent) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = isDark ? "#f3f4f6" : "#1f2937";
              }
            }}
          >
            <RotateCcw size={15} />
            <span>Restore</span>
          </button>

          {/* Compare */}
          <button
            type="button"
            onClick={() => {
              handleCompareClick(activeMenu.version);
              setActiveMenu(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "none",
              background: pickA?.id === activeMenu.version.id 
                ? (isDark ? "rgba(249, 115, 22, 0.2)" : "#fff7ef") 
                : "transparent",
              color: pickA?.id === activeMenu.version.id 
                ? "#ea580c" 
                : (isDark ? "#f3f4f6" : "#1f2937"),
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.82rem",
              fontWeight: pickA?.id === activeMenu.version.id ? 600 : 500,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (pickA?.id !== activeMenu.version.id) {
                e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.09)" : "rgba(0, 0, 0, 0.05)";
                e.currentTarget.style.color = isDark ? "#ffffff" : "#111827";
              }
            }}
            onMouseLeave={(e) => {
              if (pickA?.id !== activeMenu.version.id) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = isDark ? "#f3f4f6" : "#1f2937";
              }
            }}
          >
            <GitCompare size={15} />
            <span>{pickA?.id === activeMenu.version.id ? "Selected" : "Compare"}</span>
          </button>

          {/* Divider */}
          <div
            style={{
              height: "1px",
              background: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
              margin: "3px 4px",
            }}
          />

          {/* Delete */}
          <button
            type="button"
            onClick={() => {
              store.removeDraftVersion(sessionId, activeMenu.version.id);
              setActiveMenu(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: isDark ? "#ef4444" : "#dc2626",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.82rem",
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "rgba(239, 68, 68, 0.16)" : "#fef2f2";
              e.currentTarget.style.color = isDark ? "#fca5a5" : "#b91c1c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = isDark ? "#ef4444" : "#dc2626";
            }}
          >
            <Trash2 size={15} />
            <span>Delete</span>
          </button>
        </div>,
        document.body
      )}

      {compare && (
        <div
          onClick={() => setCompare(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.7)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "min(24px, 3vw)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark ? "var(--cw-bg-surface-elevated, #1e2638)" : "#ffffff", 
              border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e5e7eb", 
              borderRadius: "16px",
              width: "min(1000px, 95vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: isDark ? "0 20px 60px rgba(0, 0, 0, 0.55)" : "0 20px 60px rgba(0, 0, 0, 0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.125rem 1.5rem",
                background: isDark ? "rgba(0, 0, 0, 0.2)" : "#f9fafb",
                borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e5e7eb",
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
                  color: isDark ? "#9ca3af" : "#6b7280",
                  border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e5e7eb",
                  borderRadius: "6px",
                  padding: "4px 12px",
                  cursor: "pointer",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = isDark ? "#ffffff" : "#374151";
                  e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.25)" : "#d1d5db";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isDark ? "#9ca3af" : "#6b7280";
                  e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "#e5e7eb";
                }}
              >
                ✕
              </button>
            </div>
            <div className="cw-m-one-col cw-m-scroll-y" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, overflow: "hidden", flex: 1 }}>
              {[compare.a, compare.b].map((v, i) => (
                <div key={i} style={{ padding: 16, overflowY: "auto", borderLeft: i === 1 ? (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e5e7eb") : "none" }}>
                  <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#f97316", fontFamily: "'Poppins', sans-serif", marginBottom: 8 }}>
                    {v.label} · {fmt(v.timestamp)}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem", color: isDark ? "#f9fafb" : "#1f2937", fontFamily: "'Poppins', sans-serif", lineHeight: 1.6 }}>
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