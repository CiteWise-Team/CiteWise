import React from "react";
import { useTheme } from "../../../context/ThemeContext";
import { FileText, BookOpen, Layers, Compass, Sparkles } from "lucide-react";

/**
 * WorkflowPartnerLoadingUI
 * A unified, modern loading state for CATalyst output panels (Extractor, Summarizer, Gap Extractor, Topic Suggester)
 * that partners seamlessly with the Input Panel's "Run Workflow" loading state.
 */
export default function WorkflowPartnerLoadingUI({
  title = "Extracting sections with AI...",
  description,
  stepType = "extractor",
}) {
  const { isDark } = useTheme();

  const stepMeta = {
    extractor: {
      icon: FileText,
      defaultTitle: "Extracting sections with AI...",
      defaultDesc: "AI is analyzing your uploaded research manuscript, extracting methodology, literature context, and section hierarchies. Your extracted paper results will appear here momentarily.",
      previewType: "papers",
    },
    summarizer: {
      icon: BookOpen,
      defaultTitle: "Summarizing sections with AI...",
      defaultDesc: "AI is synthesizing your extracted literature sections into a structured, objective academic summary. Your summary will appear here once ready.",
      previewType: "summary",
    },
    gap: {
      icon: Layers,
      defaultTitle: "Analyzing research gaps with AI...",
      defaultDesc: "AI is evaluating the extracted literature and methodology to detect unaddressed research gaps and future directions. Your detected gaps will appear here.",
      previewType: "gaps",
    },
    topic: {
      icon: Compass,
      defaultTitle: "Generating topic recommendations with AI...",
      defaultDesc: "AI is formulating prospective thesis titles, research problem statements, and scope recommendations from your detected gaps. Your topic proposals will appear here.",
      previewType: "topics",
    },
  }[stepType] || {
    icon: Sparkles,
    defaultTitle: "Processing with AI...",
    defaultDesc: "AI is processing your research data. Your results will appear here momentarily.",
    previewType: "generic",
  };

  const IconComponent = stepMeta.icon;
  const effectiveTitle = title || stepMeta.defaultTitle;
  const effectiveDesc = description || stepMeta.defaultDesc;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "3.5rem 1.5rem",
        minHeight: "420px",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Poppins', sans-serif",
        animation: "fadeInToast 0.3s ease-out forwards",
      }}
    >
      <style>{`
        @keyframes partnerShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes partnerPulseBadge {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 20px rgba(234, 88, 12, 0.25);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 0 32px rgba(234, 88, 12, 0.45);
          }
        }
        @keyframes partnerProgressSweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>

      {/* Animated Spinner with Glowing Center Icon */}
      <div
        style={{
          position: "relative",
          width: "80px",
          height: "80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.5rem",
        }}
      >
        {/* Outer rotating SVG track & spinner */}
        <svg width="80" height="80" viewBox="0 0 50 50" style={{ position: "absolute", inset: 0 }}>
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke={isDark ? "rgba(234, 88, 12, 0.16)" : "rgba(234, 88, 12, 0.12)"}
            strokeWidth="3.5"
          />
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="#ea580c"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="55 70"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 25 25"
              to="360 25 25"
              dur="0.9s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>

        {/* Center glowing badge */}
        <div
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            background: isDark ? "rgba(234, 88, 12, 0.18)" : "rgba(234, 88, 12, 0.1)",
            border: "2px solid #ea580c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ea580c",
            animation: "partnerPulseBadge 2.2s infinite ease-in-out",
          }}
        >
          <IconComponent size={22} strokeWidth={2.4} />
        </div>
      </div>

      {/* Main Partner Title */}
      <h3
        style={{
          margin: "0 0 0.5rem 0",
          fontSize: "1.18rem",
          fontWeight: 700,
          color: isDark ? "#f9fafb" : "#111827",
          letterSpacing: "0.01em",
        }}
      >
        {effectiveTitle}
      </h3>

      {/* Explanation text */}
      <p
        style={{
          margin: "0 0 1.75rem 0",
          fontSize: "0.88rem",
          color: isDark ? "#94a3b8" : "#64748b",
          lineHeight: 1.6,
          maxWidth: "460px",
        }}
      >
        {effectiveDesc}
      </p>

      {/* Progress Bar Container with moving gradient pulse */}
      <div
        style={{
          width: "280px",
          maxWidth: "85%",
          height: "6px",
          background: isDark ? "rgba(255, 255, 255, 0.08)" : "#e5e7eb",
          borderRadius: "999px",
          overflow: "hidden",
          position: "relative",
          marginBottom: "2rem",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: "50%",
            background: "linear-gradient(90deg, transparent, #ea580c, #fb923c, transparent)",
            borderRadius: "999px",
            animation: "partnerProgressSweep 1.6s infinite ease-in-out",
          }}
        />
      </div>

      {/* Shimmering Skeleton Cards Previewing incoming output cards */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          opacity: isDark ? 0.6 : 0.75,
        }}
      >
        {[1, 2].map((idx) => (
          <div
            key={idx}
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              background: isDark
                ? "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 100%)"
                : "linear-gradient(90deg, #f1f5f9 0%, #ffffff 50%, #f1f5f9 100%)",
              backgroundSize: "200% 100%",
              animation: "partnerShimmer 2s infinite linear",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                height: "12px",
                width: idx === 1 ? "65%" : "80%",
                borderRadius: "6px",
                background: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
              }}
            />
            <div
              style={{
                height: "10px",
                width: idx === 1 ? "90%" : "55%",
                borderRadius: "5px",
                background: isDark ? "rgba(255, 255, 255, 0.05)" : "#cbd5e1",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
