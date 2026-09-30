import { useRef, useEffect } from "react";

export default function ExportDraftDropdown({ isOpen, onToggle, onExport, onCopy, isEnabled, isExportingPdf = false }) {
  const dropdownRef = useRef(null);

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
    color: "#111827",
    padding: "10px 16px",
    textAlign: "left",
    width: "100%",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontFamily: "'Poppins', sans-serif",
    display: "block",
    transition: "background 0.2s ease",
  };

  const isButtonDisabled = !isEnabled || isExportingPdf;

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        onClick={() => !isExportingPdf && onToggle(!isOpen)}
        disabled={isButtonDisabled}
        style={{
          background: !isButtonDisabled
            ? "#ea580c"
            : "#f3f4f6",
          color: !isButtonDisabled ? "#ffffff" : "#9ca3af",
          border: !isButtonDisabled ? "1px solid #ea580c" : "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "8px 16px",
          cursor: !isButtonDisabled ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontFamily: "'Poppins', sans-serif",
          fontSize: "0.85rem",
          fontWeight: "700",
          boxShadow: !isButtonDisabled ? "0 2px 8px rgba(234, 88, 12, 0.22)" : "none",
          transition: "all 180ms ease",
        }}
        onMouseEnter={(e) => {
          if (isButtonDisabled) return;
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.background = "#c2410c";
          e.currentTarget.style.borderColor = "#c2410c";
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
        }}
        onMouseLeave={(e) => {
          if (isButtonDisabled) return;
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.background = "#ea580c";
          e.currentTarget.style.borderColor = "#ea580c";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.22)";
        }}
        onMouseDown={(e) => {
          if (!isButtonDisabled) {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 6px rgba(234, 88, 12, 0.2)";
          }
        }}
        onMouseUp={(e) => {
          if (!isButtonDisabled) e.currentTarget.style.transform = "translateY(-1px)";
        }}
      >
        {isExportingPdf ? (
          <>
            <svg
              style={{
                width: "12px",
                height: "12px",
                animation: "spinPdf 0.8s linear infinite",
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
            </svg>
            <span>Preparing PDF...</span>
          </>
        ) : (
          <>
            Export
            <svg
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
              style={{
                transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                transition: "transform 0.2s ease",
              }}
            >
              <path
                d="M1 1L5 5L9 1"
                stroke={isEnabled ? "#ffffff" : "#9ca3af"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </button>

      {isOpen && !isExportingPdf && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            zIndex: 200,
            width: "200px",
            overflow: "hidden",
            animation: "slideIn 0.15s ease",
          }}
        >
          <button
            onClick={() => onExport("PDF")}
            style={dropdownItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fff7ef")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Export as PDF (.pdf)
          </button>
          <button
            onClick={() => onExport("DOCX")}
            style={dropdownItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fff7ef")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Export as Word (.docx)
          </button>
          <button
            onClick={() => onExport("TXT")}
            style={dropdownItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fff7ef")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Export as Plain Text (.txt)
          </button>
          <div style={{ height: "1px", background: "#e5e7eb" }} />
          <button
            onClick={onCopy}
            style={{ ...dropdownItemStyle, color: "#f97316", fontWeight: 600 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fff7ef")}
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