const STEPS = ["Data Import", "AI Assessment", "Generate Introduction"];

export default function GlobalNavigationBar({ currentStep = 0, maxUnlockedStep = 0, onNavigate, onLogoClick }) {
  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    }
  };

  return (
    <nav
      style={{
        background: "#1E1C19",
        borderBottom: "1px solid #3A3630",
        position: "sticky",
        top: 0,
        zIndex: 100,
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 2rem",
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo Block - Clickable */}
        <div 
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          onClick={handleLogoClick}
        >
          {/* Elite Premium SVG Isometric Diamond Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#3A3630",
              marginRight: "10px",
              border: "1px solid rgba(217, 138, 33, 0.2)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08) rotate(5deg)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1) rotate(0deg)")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="#D98A21"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="#D85A30"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="#D98A21"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
            </svg>
          </div>

          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "1.15rem",
              color: "#f0ece6",
              letterSpacing: "-0.01em",
              userSelect: "none",
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            CiteWise
          </span>
        </div>

        {/* Step tabs */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 0, height: "60px" }}>
          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isPast = index < currentStep;
            const isClickable = index <= maxUnlockedStep;
            return (
              <button
                key={step}
                onClick={() => isClickable && onNavigate?.(index)}
                disabled={!isClickable}
                aria-disabled={!isClickable}
                style={{
                  background: "none",
                  border: "none",
                  cursor: isClickable ? "pointer" : "not-allowed",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive
                    ? "#f0ece6"
                    : isPast
                      ? "rgba(240, 236, 230, 0.8)"
                      : isClickable
                        ? "rgba(240, 236, 230, 0.4)"
                        : "rgba(240, 236, 230, 0.22)",
                  padding: "0 20px",
                  transition: "all 0.25s ease",
                  whiteSpace: "nowrap",
                  opacity: isClickable ? 1 : 0.78,
                }}
                onMouseEnter={(e) => {
                  if (!isActive && isClickable) {
                    e.currentTarget.style.color = "#f0ece6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && isClickable) {
                    e.currentTarget.style.color = isPast ? "rgba(240, 236, 230, 0.8)" : "rgba(240, 236, 230, 0.4)";
                  }
                }}
              >
                {step}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}