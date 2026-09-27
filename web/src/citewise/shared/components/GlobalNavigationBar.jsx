import { createPortal } from "react-dom";
import { Check, FolderDown, Sparkles, PenTool } from "lucide-react";
import citeWiseLogo from "../../../assets/citewise-logo.png";
import useIsMobile, { MOBILE_TABBAR_HEIGHT } from "../../../hooks/useIsMobile";
import { useTheme } from "../../../context/ThemeContext";

const STEPS = ["Data Import", "AI Assessment", "Generate Introduction"];
const MOBILE_STEP_LABELS = ["Import", "Assess", "Introduction"];
const STEP_ICONS = [FolderDown, Sparkles, PenTool];

function MobileNavigation({ currentStep, maxUnlockedStep, onNavigate, onLogoClick, onBack }) {
  const { isDark } = useTheme();

  return (
    <>
      <nav
        style={{
          background: isDark ? "#0f0e17" : "#ffffff",
          borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e5e7eb",
          position: "sticky",
          top: 0,
          zIndex: 100,
          width: "100%",
          boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.2)" : "0 1px 3px rgba(0, 0, 0, 0.02)",
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
                background: isDark ? "#171624" : "#ffffff",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(249, 115, 22, 0.08)",
              }}
            >
              <img src={citeWiseLogo} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />
            </span>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: isDark ? "#ffffff" : "#111827", letterSpacing: "-0.01em" }}>
              Cite<span style={{ color: "#f97316" }}>Wise</span>
            </span>
          </button>

          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.78rem",
              fontWeight: 600,
              color: isDark ? "#9ca3af" : "#4b5563",
              whiteSpace: "nowrap",
            }}
          >
            Step <span style={{ color: "#f97316", fontWeight: 700 }}>{currentStep + 1}</span> of {STEPS.length}
          </span>

          {onBack && (
            <button
              onClick={onBack}
              type="button"
              aria-label="Return to your workspaces"
              style={{
                background: isDark ? "#171624" : "#ffffff",
                border: "1px solid rgba(249, 115, 22, 0.45)",
                borderRadius: "8px",
                padding: "0 12px",
                color: "#f97316",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                height: "36px",
                boxShadow: "0 1px 3px rgba(249, 115, 22, 0.06)",
                transition: "all 0.18s ease",
              }}
            >
              <span aria-hidden="true">←</span>
              <span>Groups</span>
            </button>
          )}
        </div>
      </nav>

      {createPortal(
      <nav
        aria-label="CiteWise steps"
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%) translateZ(0)",
          bottom: "max(14px, env(safe-area-inset-bottom, 14px))",
          zIndex: 1000,
          width: "calc(100% - 28px)",
          maxWidth: "360px",
          background: isDark ? "rgba(15, 14, 23, 0.94)" : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(229, 231, 235, 0.9)",
          borderRadius: "9999px",
          boxShadow: isDark
            ? "0 12px 36px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(0, 0, 0, 0.18)"
            : "0 10px 30px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.05)",
          padding: "6px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "4px" }}>
          {STEPS.map((label, index) => {
            const isActive = index === currentStep;
            const isDone = index < maxUnlockedStep || (index === 2 && maxUnlockedStep >= 3);
            const isClickable = index <= maxUnlockedStep;
            const Icon = STEP_ICONS[index] || Sparkles;
            return (
              <button
                key={label}
                type="button"
                onClick={() => isClickable && onNavigate?.(index)}
                disabled={!isClickable}
                aria-current={isActive ? "step" : undefined}
                aria-label={`${label}${isDone ? " (Completed)" : ""}${isActive ? " (Active)" : ""}`}
                style={{
                  position: "relative",
                  background: isActive
                    ? "linear-gradient(135deg, #ea580c 0%, #f97316 100%)"
                    : "transparent",
                  color: isActive
                    ? "#ffffff"
                    : isDark
                      ? "rgba(255, 255, 255, 0.65)"
                      : "#4b5563",
                  border: "none",
                  borderRadius: "9999px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "44px",
                  minWidth: "44px",
                  padding: isActive ? "0 18px 0 14px" : "0 12px",
                  cursor: isClickable ? "pointer" : "not-allowed",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.82rem",
                  fontWeight: isActive ? 600 : 500,
                  opacity: !isClickable ? 0.35 : 1,
                  boxShadow: isActive ? "0 4px 14px rgba(234, 88, 12, 0.45)" : "none",
                  touchAction: "manipulation",
                  userSelect: "none",
                  transition: "all 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
                  {isDone && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-4px",
                        right: "-5px",
                        width: "13px",
                        height: "13px",
                        borderRadius: "50%",
                        background: "#10b981",
                        color: "#ffffff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.25)",
                        border: isActive
                          ? "1.5px solid #ea580c"
                          : isDark
                            ? "1.5px solid #0f0e17"
                            : "1.5px solid #ffffff",
                        zIndex: 2,
                      }}
                      title="Completed"
                    >
                      <Check size={8} strokeWidth={3.5} />
                    </span>
                  )}
                </span>
                <span
                  style={{
                    display: "inline-block",
                    overflow: "hidden",
                    maxWidth: isActive ? "120px" : "0px",
                    opacity: isActive ? 1 : 0,
                    marginLeft: isActive ? "8px" : "0px",
                    whiteSpace: "nowrap",
                    lineHeight: 1,
                    letterSpacing: "-0.01em",
                    transition:
                      "max-width 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease, margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  {MOBILE_STEP_LABELS[index]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>,
      document.body
      )}
    </>
  );
}

export default function GlobalNavigationBar({ currentStep = 0, maxUnlockedStep = 0, onNavigate, onLogoClick, onBack }) {
  const isMobile = useIsMobile();
  const { isDark } = useTheme();

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
        background: isDark ? "#0f0e17" : "#ffffff",
        borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e5e7eb",
        position: "sticky",
        top: 0,
        zIndex: 100,
        width: "100%",
        boxShadow: isDark ? "0 1px 3px rgba(0, 0, 0, 0.2)" : "0 1px 3px rgba(0, 0, 0, 0.02)",
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
              background: isDark ? "#171624" : "#ffffff",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e5e7eb",
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
              e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "#e5e7eb";
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
              color: isDark ? "#ffffff" : "#111827",
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
            const isDone = index < maxUnlockedStep || (index === 2 && maxUnlockedStep >= 3);
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
                    ? (isDark ? "#ffffff" : "#111827")
                    : isDone
                      ? (isDark ? "#9ca3af" : "#6b7280")
                      : isClickable
                        ? (isDark ? "#6b7280" : "#9ca3af")
                        : (isDark ? "#3f3e4d" : "#d1d5db"),
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
                    e.currentTarget.style.color = isDone
                      ? (isDark ? "#9ca3af" : "#6b7280")
                      : (isDark ? "#6b7280" : "#9ca3af");
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {/* Step number / check badge */}
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
                      : isDone
                        ? "rgba(249, 115, 22, 0.15)"
                        : "rgba(107, 114, 128, 0.1)",
                    color: isActive
                      ? "#fff"
                      : isDone
                        ? "#f97316"
                        : "#9ca3af",
                    transition: "background 0.2s ease, color 0.2s ease, opacity 0.2s ease",
                    boxShadow: isActive ? "0 2px 6px rgba(249, 115, 22, 0.3)" : "none",
                  }}
                >
                  {isDone ? "✓" : index + 1}
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