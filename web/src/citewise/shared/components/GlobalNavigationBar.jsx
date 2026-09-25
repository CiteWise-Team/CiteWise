import citeWiseLogo from "../../../assets/citewise-logo.png";
import useIsMobile, { MOBILE_TABBAR_HEIGHT } from "../../../hooks/useIsMobile";

const STEPS = ["Data Import", "AI Assessment", "Generate Introduction"];
const MOBILE_STEP_LABELS = ["Import", "Assess", "Introduction"];

function MobileNavigation({ currentStep, maxUnlockedStep, onNavigate, onLogoClick, onBack }) {
  return (
    <>
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
            padding: "0 1rem",
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <button
            type="button"
            onClick={onLogoClick}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <span
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "9px",
                background: "#25253a",
                border: "1px solid rgba(91,91,214,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img src={citeWiseLogo} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />
            </span>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#e4e4f0" }}>
              CiteWise
            </span>
          </button>

          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#a1a1b5",
              whiteSpace: "nowrap",
            }}
          >
            Step {currentStep + 1} of {STEPS.length}
          </span>

          {onBack && (
            <button
              onClick={onBack}
              type="button"
              aria-label="Return to your workspaces"
              style={{
                background: "transparent",
                border: "1px solid rgba(91,91,214,0.55)",
                borderRadius: "8px",
                padding: "0 12px",
                color: "#a5b4fc",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                height: "40px",
              }}
            >
              <span aria-hidden="true">←</span>
              <span>Groups</span>
            </button>
          )}
        </div>
      </nav>

      <nav
        aria-label="CiteWise steps"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          background: "#1e1e2f",
          borderTop: "1px solid #3a3a55",
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -8px 24px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`, height: MOBILE_TABBAR_HEIGHT }}>
          {STEPS.map((label, index) => {
            const isActive = index === currentStep;
            const isPast = index < currentStep;
            const isClickable = index <= maxUnlockedStep;
            return (
              <button
                key={label}
                type="button"
                onClick={() => isClickable && onNavigate?.(index)}
                disabled={!isClickable}
                aria-current={isActive ? "step" : undefined}
                aria-label={label}
                style={{
                  position: "relative",
                  background: "none",
                  border: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  cursor: isClickable ? "pointer" : "not-allowed",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.7rem",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#e4e4f0" : isClickable ? "rgba(228,228,240,0.6)" : "rgba(228,228,240,0.25)",
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "25%",
                      right: "25%",
                      height: "3px",
                      borderRadius: "0 0 3px 3px",
                      background: "#5b5bd6",
                    }}
                  />
                )}
                <span
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    background: isActive ? "#5b5bd6" : isPast ? "rgba(91,91,214,0.25)" : "rgba(228,228,240,0.08)",
                    color: isActive ? "#fff" : isPast ? "#8b8bf0" : "rgba(228,228,240,0.35)",
                  }}
                >
                  {isPast ? "✓" : index + 1}
                </span>
                {MOBILE_STEP_LABELS[index]}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default function GlobalNavigationBar({ currentStep = 0, maxUnlockedStep = 0, onNavigate, onLogoClick, onBack }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileNavigation
        currentStep={currentStep}
        maxUnlockedStep={maxUnlockedStep}
        onNavigate={onNavigate}
        onLogoClick={onLogoClick}
        onBack={onBack}
      />
    );
  }

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
            type="button"
            title="Return to your workspaces"
            aria-label="Return to your workspaces"
            style={{
              flexShrink: 0,
              background: "transparent",
              border: "1px solid rgba(91,91,214,0.55)",
              borderRadius: "8px",
              padding: "6px 14px",
              color: "#5b5bd6",
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
              transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(91,91,214,0.12)";
              e.currentTarget.style.borderColor = "#5b5bd6";
              e.currentTarget.style.color = "#a5b4fc";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(91,91,214,0.55)";
              e.currentTarget.style.color = "#5b5bd6";
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
