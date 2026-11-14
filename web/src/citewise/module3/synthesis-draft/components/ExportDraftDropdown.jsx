import { useRef, useEffect, useState } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import { Download, Loader2 } from "lucide-react";

export default function ExportDraftDropdown({ isOpen, onToggle, onExport, onCopy, isEnabled, isExportingPdf = false }) {
  const dropdownRef = useRef(null);
  const { isDark } = useTheme();
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onToggle(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onToggle]);

  const dropdownItemStyle = {
    background: "transparent",
    border: "none",
    color: isDark ? "#f9fafb" : "#111827",
    padding: "8px 12px",
    borderRadius: "8px",
    textAlign: "left",
    width: "100%",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 500,
    fontFamily: "'Poppins', sans-serif",
    display: "block",
    transition: "background 0.18s ease, color 0.18s ease",
  };

  const isButtonDisabled = !isEnabled || isExportingPdf;
  const tooltipLabel = isExportingPdf ? "Preparing PDF..." : "Export Draft";

  return (
    <div style={{ position: "relative", display: "inline-flex" }} ref={dropdownRef}>
      <button
        type="button"
        title="Export Draft"
        aria-label="Export Draft"
        onClick={() => !isExportingPdf && onToggle(!isOpen)}
        disabled={isButtonDisabled}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          padding: 0,
          background: isOpen
            ? (isDark ? "rgba(249, 115, 22, 0.22)" : "#fff7ed")
            : (isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)"),
          color: isButtonDisabled
            ? (isDark ? "#4b5563" : "#cbd5e1")
            : (isOpen || hovered)
              ? "#ea580c"
              : (isDark ? "#cbd5e1" : "#4b5563"),
          border: isOpen
            ? "1px solid #ea580c"
            : (isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.08)"),
          cursor: isButtonDisabled ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: isButtonDisabled ? 0.45 : 1,
          transition: "all 0.18s ease",
          transform: hovered && !isButtonDisabled ? "scale(1.06)" : "scale(1)",
        }}
      >
        {isExportingPdf ? (
          <span
            className="cw-spinning"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "15px",
              height: "15px",
              transformOrigin: "center center",
            }}
          >
            <Loader2 size={15} />
          </span>
        ) : (
          <Download size={15} />
        )}
      </button>

      {/* Floating tooltip on hover (outside container) */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 10px)",
            right: "50%",
            transform: "translateX(50%)",
            background: isDark ? "#1e293b" : "#0f172a",
            color: "#ffffff",
            fontSize: "0.74rem",
            fontWeight: 600,
            fontFamily: "'Poppins', sans-serif",
            padding: "5px 10px",
            borderRadius: "6px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.6)" : "0 8px 20px rgba(0,0,0,0.25)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(0, 0, 0, 0.1)",
            zIndex: 9999,
          }}
        >
          {tooltipLabel}
        </div>
      )}

      {isOpen && !isExportingPdf && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            backgroundColor: isDark ? "#15141f" : "#ffffff",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "6px",
            minWidth: "210px",
            boxShadow: isDark ? "0 16px 36px rgba(0, 0, 0, 0.55)" : "0 16px 36px rgba(0, 0, 0, 0.12)",
            zIndex: 1050,
            overflow: "hidden",
            animation: "slideIn 0.15s ease",
          }}
        >
          <button
            onClick={() => onExport("PDF")}
            style={dropdownItemStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "rgba(249, 115, 22, 0.14)" : "#fff7ef";
              e.currentTarget.style.color = "#ea580c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = isDark ? "#f9fafb" : "#111827";
            }}
          >
            Export as PDF (.pdf)
          </button>
          <button
            onClick={() => onExport("DOCX")}
            style={dropdownItemStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "rgba(249, 115, 22, 0.14)" : "#fff7ef";
              e.currentTarget.style.color = "#ea580c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = isDark ? "#f9fafb" : "#111827";
            }}
          >
            Export as Word (.docx)
          </button>
          <button
            onClick={() => onExport("TXT")}
            style={dropdownItemStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "rgba(249, 115, 22, 0.14)" : "#fff7ef";
              e.currentTarget.style.color = "#ea580c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = isDark ? "#f9fafb" : "#111827";
            }}
          >
            Export as Plain Text (.txt)
          </button>
          <div style={{ height: "1px", background: isDark ? "rgba(255, 255, 255, 0.08)" : "#e5e7eb", margin: "4px 0" }} />
          <button
            onClick={onCopy}
            style={{ ...dropdownItemStyle, color: "#f97316", fontWeight: 600 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? "rgba(249, 115, 22, 0.14)" : "#fff7ef")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Copy to Clipboard
          </button>
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spinPdf {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}