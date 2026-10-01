// module3/synthesis-draft/components/DraftVersionHistory.jsx
//
// Req 7: Draft versioning. Every generation and every saved edit is recorded
// as a version. Users can restore a previous version, compare two versions
// side-by-side, or delete versions.

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import * as store from "../../../lib/citewiseStore";
import { 
  ChevronDown, 
  ChevronUp, 
  MoreHorizontal, 
  RotateCcw, 
  GitCompare, 
  Trash2,
  X,
  Copy,
  Check,
  ArrowRight,
  Columns,
  FileCode,
  Clock,
  Sparkles
} from "lucide-react";
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

function countWords(str) {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

function computeLineDiff(textA, textB) {
  const linesA = (textA || "").split("\n");
  const linesB = (textB || "").split("\n");
  const na = linesA.length;
  const nb = linesB.length;
  
  if (textA === textB) {
    return linesA.map((line, idx) => ({ type: "same", line, lineA: idx + 1, lineB: idx + 1 }));
  }

  const maxLines = 600;
  const a = linesA.slice(0, maxLines);
  const b = linesB.slice(0, maxLines);
  const lenA = a.length;
  const lenB = b.length;

  const dp = Array.from({ length: lenA + 1 }, () => new Uint16Array(lenB + 1));
  for (let i = 0; i < lenA; i++) {
    for (let j = 0; j < lenB; j++) {
      if (a[i] === b[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const diff = [];
  let i = lenA, j = lenB;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      diff.unshift({ type: "same", line: a[i - 1], lineA: i, lineB: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: "added", line: b[j - 1], lineB: j });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.unshift({ type: "removed", line: a[i - 1], lineA: i });
      i--;
    }
  }
  return diff;
}

export default function DraftVersionHistory({ sessionId, currentContent, onRestore }) {
  const { isDark } = useTheme();
  const [versions, setVersions] = useState(() => store.getDraftVersions(sessionId));
  const [compare, setCompare] = useState(null); // { a, b }
  const [compareViewMode, setCompareViewMode] = useState("split"); // "split" | "diff"
  const [copiedKey, setCopiedKey] = useState(null);
  const [pickA, setPickA] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // { version, top, left }

  useEffect(() => {
    if (!compare) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setCompare(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [compare]);

  const handleCopyText = (key, text) => {
    try {
      navigator.clipboard.writeText(text || "");
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (e) {
      console.warn("Copy failed", e);
    }
  };

  const handleRestoreVersion = (v) => {
    if (onRestore) {
      onRestore(v.content);
    }
    setCompare(null);
  };

  const diffStats = useMemo(() => {
    if (!compare?.a || !compare?.b) return null;
    const wordsA = countWords(compare.a.content);
    const wordsB = countWords(compare.b.content);
    const charsA = (compare.a.content || "").length;
    const charsB = (compare.b.content || "").length;
    const wordDelta = wordsB - wordsA;
    const charDelta = charsB - charsA;
    const lineDiff = computeLineDiff(compare.a.content, compare.b.content);
    const addedCount = lineDiff.filter((d) => d.type === "added").length;
    const removedCount = lineDiff.filter((d) => d.type === "removed").length;
    return {
      wordsA,
      wordsB,
      charsA,
      charsB,
      wordDelta,
      charDelta,
      lineDiff,
      addedCount,
      removedCount,
    };
  }, [compare]);

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
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.72)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "16px",
            animation: "citewiseFadeIn 0.2s ease-out forwards",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark ? "#161522" : "#ffffff",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e2e8f0",
              borderRadius: "20px",
              width: "min(1120px, 95vw)",
              height: "min(800px, 90vh)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: isDark
                ? "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px rgba(234, 88, 12, 0.08)"
                : "0 25px 60px -15px rgba(0, 0, 0, 0.18), 0 0 30px rgba(234, 88, 12, 0.04)",
              animation: "citewiseModalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            {/* Header with Top-Left Aligned Icon Badge */}
            <div
              style={{
                padding: "20px 24px 16px 24px",
                borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #f1f5f9",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "14px",
                background: isDark ? "rgba(255, 255, 255, 0.015)" : "#ffffff",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, rgba(234, 88, 12, 0.18) 0%, rgba(249, 115, 22, 0.08) 100%)",
                    border: isDark ? "1px solid rgba(234, 88, 12, 0.35)" : "1px solid #fed7aa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ea580c",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  <GitCompare size={20} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: isDark ? "#ffffff" : "#0f172a",
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.3,
                    }}
                  >
                    Compare Draft Versions
                  </h3>
                  <p
                    style={{
                      margin: "3px 0 0 0",
                      color: isDark ? "#94a3b8" : "#64748b",
                      fontSize: "0.8rem",
                      fontFamily: "'Poppins', sans-serif",
                      lineHeight: 1.45,
                    }}
                  >
                    Comparing <strong style={{ color: isDark ? "#fed7aa" : "#ea580c" }}>{compare.a.label}</strong> with <strong style={{ color: isDark ? "#fed7aa" : "#ea580c" }}>{compare.b.label}</strong>
                  </p>
                </div>
              </div>

              {/* Header Right: View Switcher & Close */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "3px",
                    borderRadius: "10px",
                    background: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
                    border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCompareViewMode("split")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 11px",
                      borderRadius: "7px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      cursor: "pointer",
                      border: "none",
                      background: compareViewMode === "split"
                        ? (isDark ? "#ea580c" : "#ffffff")
                        : "transparent",
                      color: compareViewMode === "split"
                        ? (isDark ? "#ffffff" : "#ea580c")
                        : (isDark ? "#94a3b8" : "#64748b"),
                      boxShadow: compareViewMode === "split"
                        ? "0 2px 6px rgba(0, 0, 0, 0.12)"
                        : "none",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <Columns size={13} />
                    <span>Side-by-Side</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCompareViewMode("diff")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 11px",
                      borderRadius: "7px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      cursor: "pointer",
                      border: "none",
                      background: compareViewMode === "diff"
                        ? (isDark ? "#ea580c" : "#ffffff")
                        : "transparent",
                      color: compareViewMode === "diff"
                        ? (isDark ? "#ffffff" : "#ea580c")
                        : (isDark ? "#94a3b8" : "#64748b"),
                      boxShadow: compareViewMode === "diff"
                        ? "0 2px 6px rgba(0, 0, 0, 0.12)"
                        : "none",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <FileCode size={13} />
                    <span>Diff View</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setCompare(null)}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0",
                    background: isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
                    color: isDark ? "#94a3b8" : "#64748b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    padding: 0,
                    marginTop: "2px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.1)" : "#f1f5f9";
                    e.currentTarget.style.color = isDark ? "#ffffff" : "#0f172a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc";
                    e.currentTarget.style.color = isDark ? "#94a3b8" : "#64748b";
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Quick Metrics Sub-Toolbar */}
            {diffStats && (
              <div
                style={{
                  padding: "10px 24px",
                  background: isDark ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
                  borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid #f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      background: isDark ? "rgba(255, 255, 255, 0.05)" : "#ffffff",
                      border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
                      color: isDark ? "#cbd5e1" : "#475569",
                    }}
                  >
                    <span>{compare.a.label}</span>
                    <span style={{ color: isDark ? "#64748b" : "#94a3b8" }}>•</span>
                    <span style={{ color: "#ea580c" }}>{diffStats.wordsA} words</span>
                  </div>

                  <ArrowRight size={13} style={{ color: isDark ? "#64748b" : "#94a3b8" }} />

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      fontFamily: "'Poppins', sans-serif",
                      background: isDark ? "rgba(255, 255, 255, 0.05)" : "#ffffff",
                      border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
                      color: isDark ? "#cbd5e1" : "#475569",
                    }}
                  >
                    <span>{compare.b.label}</span>
                    <span style={{ color: isDark ? "#64748b" : "#94a3b8" }}>•</span>
                    <span style={{ color: "#ea580c" }}>{diffStats.wordsB} words</span>
                  </div>
                </div>

                {/* Net delta badge */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 9px",
                      borderRadius: "999px",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      fontFamily: "'Poppins', sans-serif",
                      background: diffStats.wordDelta >= 0
                        ? (isDark ? "rgba(16, 185, 129, 0.16)" : "#ecfdf5")
                        : (isDark ? "rgba(239, 68, 68, 0.16)" : "#fef2f2"),
                      color: diffStats.wordDelta >= 0
                        ? (isDark ? "#34d399" : "#059669")
                        : (isDark ? "#f87171" : "#dc2626"),
                      border: diffStats.wordDelta >= 0
                        ? (isDark ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid #a7f3d0")
                        : (isDark ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid #fecaca"),
                    }}
                  >
                    {diffStats.wordDelta >= 0 ? `+${diffStats.wordDelta}` : diffStats.wordDelta} words
                  </span>

                  {compareViewMode === "diff" && (
                    <span
                      style={{
                        fontSize: "0.74rem",
                        color: isDark ? "#94a3b8" : "#64748b",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      (+{diffStats.addedCount} / -{diffStats.removedCount} lines)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Comparison Main Area */}
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {compareViewMode === "split" ? (
                /* Side-by-side view */
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    height: "100%",
                    minHeight: 0,
                    overflow: "hidden",
                  }}
                >
                  {[
                    { version: compare.a, role: "Base Version", keyId: "a" },
                    { version: compare.b, role: "Compared Version", keyId: "b" },
                  ].map(({ version: v, role, keyId }, idx) => (
                    <div
                      key={keyId}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0,
                        height: "100%",
                        borderLeft: idx === 1 ? (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0") : "none",
                        background: isDark ? "#12111c" : "#ffffff",
                      }}
                    >
                      {/* Column sub-header */}
                      <div
                        style={{
                          padding: "12px 18px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #f1f5f9",
                          background: isDark ? "rgba(255, 255, 255, 0.02)" : "#fafafa",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontWeight: 700,
                                fontSize: "0.86rem",
                                color: isDark ? "#f3f4f6" : "#0f172a",
                              }}
                            >
                              {v.label}
                            </span>
                            <span
                              style={{
                                fontSize: "0.68rem",
                                fontWeight: 600,
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: isDark ? "rgba(234, 88, 12, 0.16)" : "#fff7ed",
                                color: "#ea580c",
                                fontFamily: "'Poppins', sans-serif",
                              }}
                            >
                              {role}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              marginTop: "2px",
                              fontSize: "0.72rem",
                              color: isDark ? "#64748b" : "#94a3b8",
                              fontFamily: "'Poppins', sans-serif",
                            }}
                          >
                            <Clock size={11} />
                            <span>{fmt(v.timestamp)}</span>
                          </div>
                        </div>

                        {/* Column actions */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => handleCopyText(keyId, v.content)}
                            title="Copy version content"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              fontFamily: "'Poppins', sans-serif",
                              cursor: "pointer",
                              border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0",
                              background: isDark ? "rgba(255, 255, 255, 0.04)" : "#ffffff",
                              color: isDark ? "#94a3b8" : "#64748b",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {copiedKey === keyId ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                            <span>{copiedKey === keyId ? "Copied" : "Copy"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRestoreVersion(v)}
                            title={`Restore ${v.label} as active draft`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 9px",
                              borderRadius: "6px",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              fontFamily: "'Poppins', sans-serif",
                              cursor: "pointer",
                              border: isDark ? "1px solid rgba(234, 88, 12, 0.4)" : "1px solid #fed7aa",
                              background: isDark ? "rgba(234, 88, 12, 0.12)" : "#fff7ed",
                              color: "#ea580c",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#ea580c";
                              e.currentTarget.style.color = "#ffffff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = isDark ? "rgba(234, 88, 12, 0.12)" : "#fff7ed";
                              e.currentTarget.style.color = "#ea580c";
                            }}
                          >
                            <RotateCcw size={12} />
                            <span>Restore</span>
                          </button>
                        </div>
                      </div>

                      {/* Content text */}
                      <div
                        style={{
                          flex: 1,
                          overflowY: "auto",
                          padding: "18px 20px",
                          whiteSpace: "pre-wrap",
                          fontSize: "0.86rem",
                          lineHeight: 1.7,
                          fontFamily: "'Poppins', sans-serif",
                          color: isDark ? "#f3f4f6" : "#1e293b",
                        }}
                      >
                        {v.content || (
                          <span style={{ color: isDark ? "#64748b" : "#94a3b8", fontStyle: "italic" }}>
                            (Empty draft content)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Unified Diff View */
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "14px 18px",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: "0.82rem",
                    lineHeight: 1.65,
                    background: isDark ? "#0f0e17" : "#fafafa",
                  }}
                >
                  {diffStats && diffStats.lineDiff.map((item, idx) => {
                    const isAdd = item.type === "added";
                    const isRem = item.type === "removed";

                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          background: isAdd
                            ? (isDark ? "rgba(16, 185, 129, 0.14)" : "rgba(16, 185, 129, 0.1)")
                            : isRem
                            ? (isDark ? "rgba(239, 68, 68, 0.14)" : "rgba(239, 68, 68, 0.08)")
                            : "transparent",
                          color: isAdd
                            ? (isDark ? "#34d399" : "#047857")
                            : isRem
                            ? (isDark ? "#f87171" : "#b91c1c")
                            : (isDark ? "#94a3b8" : "#475569"),
                          padding: "1px 8px",
                          borderRadius: "3px",
                          margin: "1px 0",
                        }}
                      >
                        {/* Line type badge */}
                        <span
                          style={{
                            width: "20px",
                            flexShrink: 0,
                            userSelect: "none",
                            fontWeight: 700,
                            color: isAdd ? "#10b981" : isRem ? "#ef4444" : "transparent",
                          }}
                        >
                          {isAdd ? "+" : isRem ? "-" : " "}
                        </span>

                        {/* Line content */}
                        <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {item.line || " "}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "14px 24px",
                borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #f1f5f9",
                background: isDark ? "rgba(255, 255, 255, 0.02)" : "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: "0.78rem",
                  color: isDark ? "#94a3b8" : "#64748b",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Tip: Click "Restore" on any version to make it your current active synthesis draft.
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setCompare(null)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "10px",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600,
                    fontSize: "0.84rem",
                    cursor: "pointer",
                    border: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #cbd5e1",
                    background: "transparent",
                    color: isDark ? "#cbd5e1" : "#64748b",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9";
                    e.currentTarget.style.color = isDark ? "#ffffff" : "#0f172a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = isDark ? "#cbd5e1" : "#64748b";
                  }}
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => handleRestoreVersion(compare.b)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "10px",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.84rem",
                    cursor: "pointer",
                    border: "none",
                    background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 4px 14px rgba(234, 88, 12, 0.3)",
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, #c2410c 0%, #ea580c 100%)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 18px rgba(234, 88, 12, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, #ea580c 0%, #f97316 100%)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.3)";
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Restore {compare.b.label}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes citewiseModalIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes citewiseFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}