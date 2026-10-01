import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

/**
 * ModernToast component
 * A sleek, modern floating toast notification for success, error/failure, warning, and info states.
 * Free of any loading or progress bars — purely focused on clean, modern feedback.
 * 
 * Props:
 * - show (boolean): Whether the toast is visible
 * - onClose (function): Callback when toast closes
 * - type (string): "success" | "error" | "failed" | "warning" | "info"
 * - title (string): Header title of the toast
 * - message (string): Descriptive body text
 * - duration (number): Duration in ms before auto-dismiss (default: 3800ms, 0 for persistent)
 */
export default function ModernToast({
  show,
  onClose,
  type = "success",
  title,
  message,
  duration = 3800,
}) {
  const { isDark } = useTheme();
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef(null);

  const normalizedType = type === "failed" ? "error" : type;

  // Configuration for each toast type
  const config = {
    success: {
      icon: CheckCircle2,
      accent: "#22c55e",
      badgeBg: isDark ? "rgba(34, 197, 94, 0.16)" : "rgba(34, 197, 94, 0.12)",
      badgeBorder: isDark ? "rgba(34, 197, 94, 0.35)" : "rgba(34, 197, 94, 0.28)",
      glow: "rgba(34, 197, 94, 0.2)",
      defaultTitle: "Success",
    },
    error: {
      icon: AlertCircle,
      accent: "#ef4444",
      badgeBg: isDark ? "rgba(239, 68, 68, 0.16)" : "rgba(239, 68, 68, 0.12)",
      badgeBorder: isDark ? "rgba(239, 68, 68, 0.35)" : "rgba(239, 68, 68, 0.28)",
      glow: "rgba(239, 68, 68, 0.22)",
      defaultTitle: "Action Failed",
    },
    warning: {
      icon: AlertTriangle,
      accent: "#ea580c",
      badgeBg: isDark ? "rgba(234, 88, 12, 0.16)" : "rgba(234, 88, 12, 0.12)",
      badgeBorder: isDark ? "rgba(234, 88, 12, 0.35)" : "rgba(234, 88, 12, 0.28)",
      glow: "rgba(234, 88, 12, 0.2)",
      defaultTitle: "Attention",
    },
    info: {
      icon: Info,
      accent: "#3b82f6",
      badgeBg: isDark ? "rgba(59, 130, 246, 0.16)" : "rgba(59, 130, 246, 0.12)",
      badgeBorder: isDark ? "rgba(59, 130, 246, 0.35)" : "rgba(59, 130, 246, 0.28)",
      glow: "rgba(59, 130, 246, 0.2)",
      defaultTitle: "Information",
    },
  }[normalizedType] || {
    icon: CheckCircle2,
    accent: "#22c55e",
    badgeBg: "rgba(34, 197, 94, 0.12)",
    badgeBorder: "rgba(34, 197, 94, 0.28)",
    glow: "rgba(34, 197, 94, 0.2)",
    defaultTitle: "Notification",
  };

  const IconComponent = config.icon;
  const effectiveTitle = title || config.defaultTitle;

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose?.();
    }, 220);
  };

  useEffect(() => {
    if (!show) {
      setIsClosing(false);
      return;
    }

    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [show, duration]);

  if (!show || typeof document === "undefined") return null;

  return createPortal(
    <>
      <style>{`
        @keyframes modernToastSlideIn {
          0% {
            opacity: 0;
            transform: translate3d(24px, -10px, 0) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes modernToastSlideOut {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(24px, -8px, 0) scale(0.94);
          }
        }
      `}</style>

      <div
        role="alert"
        aria-live="assertive"
        style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 100000,
          maxWidth: "420px",
          width: "calc(100vw - 36px)",
          boxSizing: "border-box",
          borderRadius: "16px",
          background: isDark
            ? "rgba(22, 23, 38, 0.96)"
            : "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: isDark
            ? "1px solid rgba(255, 255, 255, 0.12)"
            : "1px solid rgba(226, 232, 240, 0.95)",
          boxShadow: isDark
            ? `0 20px 50px rgba(0, 0, 0, 0.7), 0 0 25px ${config.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`
            : `0 20px 48px rgba(15, 23, 42, 0.14), 0 2px 10px rgba(0, 0, 0, 0.04), 0 0 22px ${config.glow}`,
          padding: "16px 18px",
          display: "flex",
          alignItems: "flex-start",
          gap: "14px",
          fontFamily: "'Poppins', sans-serif",
          animation: isClosing
            ? "modernToastSlideOut 0.22s ease-in forwards"
            : "modernToastSlideIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          overflow: "hidden",
        }}
      >
        {/* Left vertical accent bar indicator */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            bottom: "12px",
            left: "0",
            width: "4px",
            borderRadius: "0 4px 4px 0",
            background: config.accent,
            boxShadow: `0 0 10px ${config.glow}`,
          }}
        />

        {/* Glowing Status Icon Badge */}
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "12px",
            background: config.badgeBg,
            border: `1px solid ${config.badgeBorder}`,
            color: config.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: "1px",
            marginLeft: "2px",
            boxShadow: `0 0 14px ${config.glow}`,
          }}
        >
          <IconComponent size={20} strokeWidth={2.4} />
        </div>

        {/* Title & Message Content */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: "2px" }}>
          <h4
            style={{
              margin: 0,
              fontSize: "0.95rem",
              fontWeight: 700,
              color: isDark ? "#f9fafb" : "#111827",
              lineHeight: 1.35,
              letterSpacing: "0.01em",
            }}
          >
            {effectiveTitle}
          </h4>
          {message && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "0.83rem",
                color: isDark ? "#94a3b8" : "#64748b",
                lineHeight: 1.45,
                wordBreak: "break-word",
              }}
            >
              {message}
            </p>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          style={{
            background: "transparent",
            border: "none",
            color: isDark ? "#94a3b8" : "#64748b",
            cursor: "pointer",
            padding: "5px",
            borderRadius: "8px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s ease",
            marginTop: "-2px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.06)";
            e.currentTarget.style.color = isDark ? "#ffffff" : "#0f172a";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = isDark ? "#94a3b8" : "#64748b";
          }}
        >
          <X size={16} />
        </button>
      </div>
    </>,
    document.body
  );
}
