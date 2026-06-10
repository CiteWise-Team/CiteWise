import { useRef, useEffect } from "react";

export default function ExportDraftDropdown({ isOpen, onToggle, onExport, onCopy, isEnabled }) {
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
    color: "#e4e4f0",
    padding: "10px 16px",
    textAlign: "left",
    width: "100%",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontFamily: "'Poppins', sans-serif",
    display: "block",
    transition: "background 0.2s ease",
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        onClick={() => onToggle(!isOpen)}
        disabled={!isEnabled}
        style={{
          background: isEnabled ? "#5b5bd6" : "rgba(0, 0, 0, 0.15)",
          color: isEnabled ? "#e4e4f0" : "#a1a1b5",
          border: "none",
          borderRadius: "8px",
          padding: "8px 16px",
          cursor: isEnabled ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontFamily: "'Poppins', sans-serif",
          fontSize: "0.85rem",
          fontWeight: "700",
          transition: "background 0.18s ease, transform 0.18s ease, box-shadow 0.22s ease",
        }}
        onMouseEnter={(e) => {
          if (!isEnabled) return;
          e.currentTarget.style.transform = "scale(1.04)";
          e.currentTarget.style.background = "#6f6fe0";
          e.currentTarget.style.boxShadow = "0 10px 28px rgba(91, 91, 214,0.35), 0 0 40px rgba(91, 91, 214,0.22)";
        }}
        onMouseLeave={(e) => {
          if (!isEnabled) return;
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.background = "#5b5bd6";
          e.currentTarget.style.boxShadow = "none";
        }}
        onMouseDown={(e) => { if (isEnabled) e.currentTarget.style.transform = "scale(0.98)"; }}
        onMouseUp={(e) => { if (isEnabled) e.currentTarget.style.transform = "scale(1.04)"; }}
      >
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
            stroke={isEnabled ? "#e4e4f0" : "#a1a1b5"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "#25253a",
            border: "1px solid #3a3a55",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
            zIndex: 200,
            width: "200px",
            overflow: "hidden",
            animation: "slideIn 0.15s ease",
          }}
        >
          <button
            onClick={() => onExport("PDF")}
            style={dropdownItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#302b27")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Export as PDF (.pdf)
          </button>
          <button
            onClick={() => onExport("DOCX")}
            style={dropdownItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#302b27")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Export as Word (.docx)
          </button>
          <button
            onClick={() => onExport("TXT")}
            style={dropdownItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#302b27")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Export as Plain Text (.txt)
          </button>
          <div style={{ height: "1px", background: "#3a3a55" }} />
          <button
            onClick={onCopy}
            style={{ ...dropdownItemStyle, color: "#6f6fe0" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#302b27")}
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
      `}</style>
    </div>
  );
}