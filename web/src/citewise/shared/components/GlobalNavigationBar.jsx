const STEPS = ["Data Import", "AI Assessment", "Generate Introduction"];

export default function GlobalNavigationBar({ currentStep = 0, maxUnlockedStep = 0, onNavigate, onLogoClick, onBack }) {
  return (
    <nav
      style={{
        background: "#1e1e2f",
        borderBottom: "1px solid #3a3a55",
        position: "sticky",
        top: 0,
        zIndex: 100,
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 2.5rem",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        {/* Logo */}
        <div
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", flexShrink: 0 }}
          onClick={onLogoClick}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "9px",
              background: "#25253a",
              border: "1px solid rgba(91,91,214,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.25s ease, box-shadow 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08) rotate(5deg)";
              e.currentTarget.style.boxShadow = "0 0 16px rgba(91,91,214,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#5b5bd6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#5b5bd6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#5b5bd6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
            </svg>
          </div>
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "#e4e4f0",
              letterSpacing: "-0.01em",
              userSelect: "none",
            }}
          >
            CiteWise
          </span>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", alignItems: "stretch", height: "64px" }}>
          {STEPS.map((label, index) => {
            const isActive = index === currentStep;
            const isPast = index < currentStep;
            const isClickable = index <= maxUnlockedStep;
            return (
              <button
                key={label}
                onClick={() => isClickable && onNavigate?.(index)}
                disabled={!isClickable}
                style={{
                  position: "relative",
                  background: "none",
                  border: "none",
                  cursor: isClickable ? "pointer" : "not-allowed",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive
                    ? "#e4e4f0"
                    : isPast
                    ? "rgba(228,228,240,0.7)"
                    : isClickable
                    ? "rgba(228,228,240,0.4)"
                    : "rgba(228,228,240,0.22)",
                  padding: "0 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive && isClickable) e.currentTarget.style.color = "#e4e4f0";
                }}
                onMouseLeave={(e) => {
                  if (!isActive && isClickable)
                    e.currentTarget.style.color = isPast
                      ? "rgba(228,228,240,0.7)"
                      : "rgba(228,228,240,0.4)";
                }}
              >
                {/* Step number badge */}
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    flexShrink: 0,
                    background: isActive
                      ? "#5b5bd6"
                      : isPast
                      ? "rgba(91,91,214,0.25)"
                      : "rgba(228,228,240,0.08)",
                    color: isActive ? "#fff" : isPast ? "#5b5bd6" : "rgba(228,228,240,0.35)",
                    transition: "background 0.2s ease, color 0.2s ease",
                  }}
                >
                  {isPast ? "✓" : index + 1}
                </span>
                {label}
                {/* Active underline */}
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: "1.5rem",
                      right: "1.5rem",
                      height: "2px",
                      borderRadius: "2px 2px 0 0",
                      background: "#5b5bd6",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Back to groups */}
        {onBack && (
          <button
            onClick={onBack}
            style={{
              flexShrink: 0,
              background: "transparent",
              border: "1px solid rgba(91,91,214,0.4)",
              borderRadius: "8px",
              padding: "6px 14px",
              color: "#5b5bd6",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(91,91,214,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            ← Groups
          </button>
        )}
      </div>
    </nav>
  );
}
