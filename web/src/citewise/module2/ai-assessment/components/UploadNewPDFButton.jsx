export default function UploadNewPDFButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "#ea580c",
        border: "1px solid #ea580c",
        borderRadius: "8px",
        padding: "10px 20px",
        cursor: "pointer",
        transition: "all 180ms ease",
        boxShadow: "0 2px 8px rgba(234, 88, 12, 0.22)",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#c2410c";
        e.currentTarget.style.borderColor = "#c2410c";
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#ea580c";
        e.currentTarget.style.borderColor = "#ea580c";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.22)";
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 6px rgba(234, 88, 12, 0.2)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
    >
      {/* Upload icon */}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect
          x="2"
          y="2"
          width="14"
          height="14"
          rx="2"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
        <path
          d="M9 12V6M9 6L6.5 8.5M9 6L11.5 8.5"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: "14px",
          fontWeight: "700",
          color: "#ffffff",
          whiteSpace: "nowrap",
          letterSpacing: "0.2px",
        }}
      >
        Upload New PDF
      </span>
    </button>
  );
}