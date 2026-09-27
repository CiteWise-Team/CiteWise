export default function UploadNewPDFButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
        border: "none",
        borderRadius: "8px",
        padding: "12px 22px",
        cursor: "pointer",
        transition: "background 0.2s ease, transform 0.15s ease, box-shadow 0.15s ease",
        boxShadow: "0 4px 12px rgba(249, 115, 22, 0.25)",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "linear-gradient(135deg, #fb8c3a 0%, #f97316 100%)";
        e.currentTarget.style.transform = "scale(1.06)";
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(249, 115, 22, 0.45)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "linear-gradient(135deg, #f97316 0%, #ea580c 100%)";
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(249, 115, 22, 0.25)";
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.97)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1.06)";
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