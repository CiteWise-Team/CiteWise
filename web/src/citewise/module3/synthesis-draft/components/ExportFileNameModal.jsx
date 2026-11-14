import React, { useState, useEffect, useRef } from "react";
import { Download, FileText, X, Loader2 } from "lucide-react";
import { useTheme } from "../../../../context/ThemeContext";

const FORMAT_CONFIG = {
  PDF: {
    label: "PDF Document",
    extension: ".pdf",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.25)",
  },
  DOCX: {
    label: "Word Document",
    extension: ".docx",
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.25)",
  },
  TXT: {
    label: "Plain Text",
    extension: ".txt",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.25)",
  },
};

export default function ExportFileNameModal({
  isOpen,
  format = "PDF",
  defaultFileName = "citewise_synthesis",
  onClose,
  onConfirm,
  isExporting = false,
}) {
  const { isDark } = useTheme();
  const [fileName, setFileName] = useState(defaultFileName);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFileName(defaultFileName);
      // Auto-select text so user can immediately type or keep default
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 60);
    }
  }, [isOpen, defaultFileName]);

  if (!isOpen) return null;

  const currentCfg = FORMAT_CONFIG[format] || FORMAT_CONFIG.PDF;

  const handleSubmit = (e) => {
    e?.preventDefault();
    const sanitized = (fileName || defaultFileName).trim().replace(/[\\/:*?"<>|]/g, "_");
    onConfirm?.(sanitized || "citewise_synthesis");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose?.();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed",
        inset: 0,
        background: isDark ? "rgba(10, 9, 16, 0.82)" : "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "16px",
        animation: "fadeInModal 0.18s ease-out forwards",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) onClose?.();
      }}
    >
      <style>{`
        @keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleInModal {
          from { transform: scale(0.93) translateY(8px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          background: isDark ? "var(--cw-bg-surface-elevated, #1a2233)" : "#ffffff",
          borderRadius: "20px",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e5e7eb",
          boxShadow: isDark
            ? "0 24px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(234, 88, 12, 0.15)"
            : "0 24px 60px rgba(0, 0, 0, 0.18), 0 0 30px rgba(234, 88, 12, 0.1)",
          width: "100%",
          maxWidth: "440px",
          padding: "26px 26px 24px",
          position: "relative",
          animation: "scaleInModal 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          fontFamily: "'Poppins', sans-serif",
          boxSizing: "border-box",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          disabled={isExporting}
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: "none",
            color: isDark ? "#94a3b8" : "#64748b",
            cursor: isExporting ? "not-allowed" : "pointer",
            padding: "6px",
            borderRadius: "8px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!isExporting) {
              e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9";
              e.currentTarget.style.color = isDark ? "#ffffff" : "#0f172a";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = isDark ? "#94a3b8" : "#64748b";
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "18px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: currentCfg.bg,
              border: `1px solid ${currentCfg.border}`,
              color: currentCfg.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: "2px",
            }}
          >
            <FileText size={22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 700,
                color: isDark ? "#f9fafb" : "#111827",
                lineHeight: 1.3,
              }}
            >
              Export as {currentCfg.label}
            </h3>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: "0.82rem",
                color: isDark ? "#94a3b8" : "#6b7280",
              }}
            >
              Choose a file name for your exported introduction.
            </p>
          </div>
        </div>

        {/* File Name Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "22px" }}>
            <label
              htmlFor="export-filename-input"
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: isDark ? "#cbd5e1" : "#374151",
                marginBottom: "8px",
              }}
            >
              File Name
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: isDark ? "rgba(15, 14, 23, 0.6)" : "#f8fafc",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #cbd5e1",
                borderRadius: "10px",
                overflow: "hidden",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              }}
              onFocus={() => {
                // outline handled by parent focus-within
              }}
            >
              <input
                id="export-filename-input"
                ref={inputRef}
                type="text"
                disabled={isExporting}
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="citewise_synthesis"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  padding: "10px 14px",
                  fontSize: "0.92rem",
                  fontFamily: "'Poppins', sans-serif",
                  color: isDark ? "#f9fafb" : "#0f172a",
                  minWidth: 0,
                }}
              />
              <span
                style={{
                  padding: "6px 12px",
                  marginRight: "6px",
                  background: currentCfg.bg,
                  color: currentCfg.color,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: `1px solid ${currentCfg.border}`,
                  letterSpacing: "0.5px",
                  userSelect: "none",
                }}
              >
                {currentCfg.extension}
              </span>
            </div>
            <p
              style={{
                margin: "6px 2px 0",
                fontSize: "0.75rem",
                color: isDark ? "#64748b" : "#94a3b8",
              }}
            >
              File will be saved as:{" "}
              <strong style={{ color: isDark ? "#e2e8f0" : "#334155" }}>
                {(fileName.trim() || defaultFileName).replace(/[\\/:*?"<>|]/g, "_")}
                {currentCfg.extension}
              </strong>
            </p>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              disabled={isExporting}
              onClick={onClose}
              style={{
                padding: "9px 18px",
                borderRadius: "9px",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #cbd5e1",
                background: isDark ? "rgba(255, 255, 255, 0.05)" : "#ffffff",
                color: isDark ? "#cbd5e1" : "#475569",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.88rem",
                fontWeight: 600,
                cursor: isExporting ? "not-allowed" : "pointer",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                if (!isExporting) {
                  e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.1)" : "#f1f5f9";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.05)" : "#ffffff";
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isExporting}
              style={{
                padding: "9px 22px",
                borderRadius: "9px",
                border: "none",
                background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                color: "#ffffff",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: isExporting ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.18s ease",
                opacity: isExporting ? 0.8 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isExporting) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 18px rgba(234, 88, 12, 0.45)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
              }}
              onMouseDown={(e) => {
                if (!isExporting) e.currentTarget.style.transform = "translateY(1px)";
              }}
            >
              {isExporting ? (
                <>
                  <span
                    className="cw-spinning"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "15px",
                      height: "15px",
                    }}
                  >
                    <Loader2 size={15} />
                  </span>
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={15} strokeWidth={2.5} />
                  Export
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
