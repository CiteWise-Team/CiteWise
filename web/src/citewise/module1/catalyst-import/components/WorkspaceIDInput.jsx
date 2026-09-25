export default function WorkspaceIDInput({ value, onChange, placeholder = "Input Workspace ID..." }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        color: "#111827",
        fontSize: "0.875rem",
        fontFamily: "'Poppins', sans-serif",
        padding: "0.5rem 1rem",
        width: "240px",
        outline: "none",
        transition: "border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#f97316";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(249, 115, 22, 0.15)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "#e5e7eb";
        e.currentTarget.style.boxShadow = "none";
      }}
      onMouseEnter={(e) => {
        if (document.activeElement !== e.currentTarget) {
          e.currentTarget.style.borderColor = "#d1d5db";
        }
      }}
      onMouseLeave={(e) => {
        if (document.activeElement !== e.currentTarget) {
          e.currentTarget.style.borderColor = "#e5e7eb";
        }
      }}
    />
  );
}