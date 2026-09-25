import citeWiseLogo from "../../../assets/citewise-logo.png";

const STEPS = ["Data Import", "AI Assessment", "Generate Introduction"];

export default function GlobalNavigationBar({ currentStep = 0, maxUnlockedStep = 0, onNavigate, onLogoClick, onBack }) {
  return (
    <nav
      style={{
        // ✨ Warm cream background that blends with the page gradient
        background: "linear-gradient(180deg, #fffaf5 0%, #fff5ec 100%)",
        borderBottom: "1px solid rgba(249, 115, 22, 0.15)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        width: "100%",
        backdropFilter: "blur(10px)",
        boxShadow: "0 1px 3px rgba(249, 115, 22, 0.04), 0 4px 20px rgba(249, 115, 22, 0.05)",
      }}
    >
      <div
        style={{
          width: "100%",
          padding: "0 clamp(1rem, 4vw, 4rem)",
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
            className="navbar-brand-icon-box"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "9px",
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(249, 115, 22, 0.08)",
              transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease, border-color 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08) rotate(5deg)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(249, 115, 22, 0.2)";
              e.currentTarget.style.borderColor = "#f97316";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(249, 115, 22, 0.08)";
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
          >
            <img
              src={citeWiseLogo}
              alt="CiteWise"
              style={{ width: "22px", height: "22px", objectFit: "contain" }}
            />
          </div>
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "#111827",
              letterSpacing: "-0.01em",
              userSelect: "none",
            }}
          >
            Cite<span style={{ color: "#f97316" }}>Wise</span>
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
                title={!isClickable ? "Complete the previous step to unlock" : undefined}
                style={{
                  position: "relative",
                  background: "none",
                  border: "none",
                  cursor: isClickable ? "pointer" : "not-allowed",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive
                    ? "#111827"
                    : isPast
                      ? "#6b7280"
                      : isClickable
                        ? "#9ca3af"
                        : "#d1d5db",
                  padding: "0 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                  transition: "color 0.2s ease, transform 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive && isClickable) {
                    e.currentTarget.style.color = "#f97316";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && isClickable) {
                    e.currentTarget.style.color = isPast ? "#6b7280" : "#9ca3af";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
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
                    opacity: isClickable ? 1 : 0.6,
                    background: isActive
                      ? "#f97316"
                      : isPast
                        ? "rgba(249, 115, 22, 0.15)"
                        : "rgba(107, 114, 128, 0.1)",
                    color: isActive
                      ? "#fff"
                      : isPast
                        ? "#f97316"
                        : "#9ca3af",
                    transition: "background 0.2s ease, color 0.2s ease, opacity 0.2s ease",
                    boxShadow: isActive ? "0 2px 6px rgba(249, 115, 22, 0.3)" : "none",
                  }}
                >
                  {isPast ? "✓" : index + 1}
                </span>
                {label}
                {/* Active underline */}
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: "1.5rem",
                    right: "1.5rem",
                    height: "2px",
                    borderRadius: "2px 2px 0 0",
                    background: "linear-gradient(90deg, #f97316, #fb8c3a)",
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "scaleX(1)" : "scaleX(0.6)",
                    transformOrigin: "center",
                    transition: "opacity 0.25s ease, transform 0.25s ease",
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Back to groups */}
        {onBack && (
          <button
            onClick={onBack}
            type="button"
            title="Return to your workspaces"
            aria-label="Return to your workspaces"
            style={{
              flexShrink: 0,
              background: "transparent",
              border: "1px solid rgba(249, 115, 22, 0.45)",
              borderRadius: "8px",
              padding: "6px 14px",
              color: "#f97316",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.8rem",
              fontWeight: 600,
              lineHeight: 1.2,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              minHeight: "34px",
              whiteSpace: "nowrap",
              transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(249, 115, 22, 0.1)";
              e.currentTarget.style.borderColor = "#f97316";
              e.currentTarget.style.color = "#ea580c";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.45)";
              e.currentTarget.style.color = "#f97316";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span aria-hidden="true">←</span>
            <span>Groups</span>
          </button>
        )}
      </div>
    </nav>
  );
}