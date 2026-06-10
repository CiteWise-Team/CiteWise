export default function ActionCard({
  title,
  subtitle,
  icon,
  color,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="w-100 h-100 border-0 rounded-4 p-5 text-white shadow-lg
        text-center d-flex flex-column align-items-center justify-content-center"
      style={{
        minHeight: "220px",
        backgroundColor: color,
        transition: "transform 0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      <div
        className="rounded-circle d-flex align-items-center justify-content-center mb-3"
        style={{
          width: 64,
          height: 64,
          background: "rgba(255,255,255,0.2)",
        }}
      >
        <span className="material-symbols-outlined fs-1">
          {icon}
        </span>
      </div>

      <h4 className="fw-bold">{title}</h4>
      <p className="opacity-75 mb-0">{subtitle}</p>
    </button>
  );
}
