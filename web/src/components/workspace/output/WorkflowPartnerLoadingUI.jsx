import React, { useState, useEffect } from "react";
import { useTheme } from "../../../context/ThemeContext";

/**
 * WorkflowPartnerLoadingUI
 * Reuses the EXACT loading UI from the AI Assessment panel (AIAssessmentPanel.jsx)
 * with the rotating animated SVG spinner, matching gradient progress bar, percentage,
 * and skeleton cards, seamlessly styled for CATalyst pages.
 */
export default function WorkflowPartnerLoadingUI({
  title,
  description,
  stepType = "extractor",
}) {
  const { isDark } = useTheme();

  // Progress and status text simulation matching AIAssessmentPanel
  const [panelProgress, setPanelProgress] = useState(25);
  const [panelStatusText, setPanelStatusText] = useState("");

  const stepConfig = {
    extractor: {
      defaultTitle: "Extracting Document Content",
      progressLabel: "Extraction progress",
      stages: [
        { progress: 25, text: "Reading manuscript structure & sections..." },
        { progress: 52, text: "Extracting methodology, results & context..." },
        { progress: 78, text: "Structuring section hierarchies with AI..." },
        { progress: 94, text: "Finalizing extracted document report..." },
      ],
    },
    summarizer: {
      defaultTitle: "Summarizing Document Content",
      progressLabel: "Summary progress",
      stages: [
        { progress: 25, text: "Reading extracted literature sections..." },
        { progress: 52, text: "Synthesizing methodology & key findings..." },
        { progress: 78, text: "Generating objective academic summary..." },
        { progress: 94, text: "Finalizing summary report..." },
      ],
    },
    gap: {
      defaultTitle: "Analyzing Research Gaps",
      progressLabel: "Gap analysis progress",
      stages: [
        { progress: 25, text: "Evaluating methodology & literature coverage..." },
        { progress: 52, text: "Detecting unaddressed research frontiers..." },
        { progress: 78, text: "Formulating scientific gap hypotheses..." },
        { progress: 94, text: "Finalizing detected research gaps..." },
      ],
    },
    topic: {
      defaultTitle: "Generating Topic Recommendations",
      progressLabel: "Topic progress",
      stages: [
        { progress: 25, text: "Processing identified research gaps..." },
        { progress: 52, text: "Formulating thesis titles & scopes..." },
        { progress: 78, text: "Validating academic feasibility with AI..." },
        { progress: 94, text: "Compiling topic recommendations..." },
      ],
    },
  }[stepType] || {
    defaultTitle: "Analyzing Document Content",
    progressLabel: "Assessment progress",
    stages: [
      { progress: 25, text: "Reading document content..." },
      { progress: 52, text: "Analyzing key arguments & evidence..." },
      { progress: 78, text: "Synthesizing document insights..." },
      { progress: 94, text: "Finalizing assessment report..." },
    ],
  };

  const effectiveTitle = title || stepConfig.defaultTitle;
  const progressLabel = stepConfig.progressLabel;

  useEffect(() => {
    setPanelProgress(stepConfig.stages[0].progress);
    setPanelStatusText(description || stepConfig.stages[0].text);

    const t1 = setTimeout(() => {
      setPanelProgress(stepConfig.stages[1].progress);
      setPanelStatusText(description || stepConfig.stages[1].text);
    }, 600);

    const t2 = setTimeout(() => {
      setPanelProgress(stepConfig.stages[2].progress);
      setPanelStatusText(description || stepConfig.stages[2].text);
    }, 1300);

    const t3 = setTimeout(() => {
      setPanelProgress(stepConfig.stages[3].progress);
      setPanelStatusText(description || stepConfig.stages[3].text);
    }, 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [stepType, description]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        minHeight: "360px",
        padding: "2rem 1rem",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2.5rem 1.5rem",
          maxWidth: "460px",
          width: "100%",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        {/* Exact Animated SVG Spinner with Glowing Center from AIAssessmentPanel */}
        <div
          style={{
            position: "relative",
            width: "76px",
            height: "76px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.25rem",
          }}
        >
          <svg
            width="76"
            height="76"
            viewBox="0 0 50 50"
            style={{ position: "absolute", inset: 0 }}
          >
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="rgba(234, 88, 12, 0.12)"
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
                dur="0.95s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(234, 88, 12, 0.09)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(234, 88, 12, 0.25)",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ea580c"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "1.2rem",
            fontWeight: 700,
            color: isDark ? "#ffffff" : "var(--cw-text-primary, #0f0e17)",
            margin: "0 0 0.35rem 0",
            letterSpacing: "-0.01em",
          }}
        >
          {effectiveTitle}
        </h3>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "0.85rem",
            color: isDark ? "#94a3b8" : "var(--cw-text-muted, #6b7280)",
            lineHeight: 1.55,
            margin: "0 0 1.5rem 0",
            maxWidth: "400px",
            minHeight: "1.55em",
          }}
        >
          {panelStatusText}
        </p>

        {/* Moving Progress Bar & Percentage Count */}
        <div
          style={{
            width: "280px",
            maxWidth: "85%",
            height: "8px",
            background: isDark ? "rgba(255, 255, 255, 0.08)" : "var(--cw-border, #e5e7eb)",
            borderRadius: "999px",
            overflow: "hidden",
            position: "relative",
            boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.08)",
            margin: "0 auto 0.6rem auto",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${panelProgress}%`,
              background: "linear-gradient(90deg, #ea580c 0%, #f97316 50%, #fb923c 100%)",
              borderRadius: "999px",
              transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 0 10px rgba(234, 88, 12, 0.45)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "280px",
            maxWidth: "85%",
            margin: "0 auto",
            fontSize: "0.75rem",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          <span style={{ color: isDark ? "#94a3b8" : "var(--cw-text-muted, #6b7280)" }}>
            {progressLabel}
          </span>
          <span style={{ color: "#ea580c", fontWeight: 700 }}>
            {panelProgress}%
          </span>
        </div>

        {/* Shimmering skeleton cards beneath previewing layout */}
        <div
          className="cw-loading-skeleton-preview"
          style={{
            marginTop: "1.5rem",
            width: "100%",
            maxWidth: "380px",
            display: "flex",
            gap: "10px",
          }}
        >
          <div
            className="cw-loading-skeleton-card-left"
            style={{
              height: "48px",
              borderRadius: "12px",
              border: isDark ? "1px dashed rgba(255, 255, 255, 0.12)" : "1px dashed var(--cw-border, #e5e7eb)",
            }}
          />
          <div
            className="cw-loading-skeleton-card-right"
            style={{
              height: "48px",
              borderRadius: "12px",
              border: isDark ? "1px dashed rgba(255, 255, 255, 0.12)" : "1px dashed var(--cw-border, #e5e7eb)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
