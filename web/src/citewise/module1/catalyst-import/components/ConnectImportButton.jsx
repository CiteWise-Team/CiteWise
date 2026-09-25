export default function ConnectImportButton({ onClick, isLoading }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        fontSize: "0.875rem",
        fontWeight: "700",
        fontFamily: "'Poppins', sans-serif",
        letterSpacing: "0.01em",
        padding: "0.55rem 1.25rem",
        cursor: isLoading ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: isLoading ? 0.7 : 1,
        boxShadow: "0 4px 12px rgba(249, 115, 22, 0.28), 0 1px 2px rgba(249, 115, 22, 0.15)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          e.currentTarget.style.background = "linear-gradient(135deg, #fb8c3a 0%, #f97316 100%)";
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(249, 115, 22, 0.4), 0 2px 4px rgba(249, 115, 22, 0.2)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          e.currentTarget.style.background = "linear-gradient(135deg, #f97316 0%, #ea580c 100%)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(249, 115, 22, 0.28), 0 1px 2px rgba(249, 115, 22, 0.15)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
      onMouseDown={(e) => {
        if (!isLoading) e.currentTarget.style.transform = "translateY(1px)";
      }}
      onMouseUp={(e) => {
        if (!isLoading) e.currentTarget.style.transform = "translateY(-1px)";
      }}
    >
      {/* Soft shine sweeping across on hover */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: "-75%",
          width: "50%",
          height: "100%",
          background: "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
          transform: "skewX(-20deg)",
          transition: "left 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: "none",
        }}
        className="connect-import-shine"
      />

      {/* Spinner / link icon */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "14px",
          height: "14px",
          flexShrink: 0,
        }}
      >
        {isLoading ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              width: "14px",
              height: "14px",
              animation: "connect-import-spin 0.8s linear infinite",
            }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: "14px", height: "14px" }}
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
      </span>

      {isLoading ? "Connecting..." : "Connect & Import"}

      <style>{`
        @keyframes connect-import-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes connect-import-shine {
          from { left: -75%; }
          to   { left: 125%; }
        }
        button:hover .connect-import-shine {
          animation: connect-import-shine 0.9s ease-out;
        }
      `}</style>
    </button>
  );
}