export default function WorkspaceIDInput({ value, onChange, placeholder = "Input Workspace ID..." }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "8px",
        color: "#f0ece6",
        fontSize: "0.875rem",
        fontFamily: "'Poppins', sans-serif",
        padding: "0.5rem 1rem",
        width: "240px",
        outline: "none",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#D98A21";
        e.currentTarget.style.boxShadow = "0 0 0 2px rgba(217, 138, 33, 0.2)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}