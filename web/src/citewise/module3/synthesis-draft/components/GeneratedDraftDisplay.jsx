import { useEffect, useRef, useState, useMemo } from "react";
import { diffWords } from 'diff';
import { apiFetch } from "../../../../api/http";
import { Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { useTheme } from "../../../../context/ThemeContext";
import { splitDraftSections } from "../utils/draftUtils";
import ModernToast from "../../../../components/ui/ModernToast";

export default function GeneratedDraftDisplay({ 
  generationStatus, 
  generationProgress = 0,
  statusText,
  content, 
  references, 
  onSaveEdit, 
  citationIntegrity,
  isEditing,
  setIsEditing,
  paraphrasedDraft,
  setParaphrasedDraft,
}) {
  const { isDark } = useTheme();
  const [internalEditing, setInternalEditing] = useState(false);
  const editing = isEditing !== undefined ? isEditing : internalEditing;
  const setEditing = setIsEditing !== undefined ? setIsEditing : setInternalEditing;

  const [draft, setDraft] = useState(content || "");
  const [draftRefs, setDraftRefs] = useState((references || []).join("\n\n"));
  const textareaRef = useRef(null);
  const [toastState, setToastState] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (type, title, message) => {
    setToastState({ show: true, type, title, message });
  };

  // Paraphraser state
  const [internalParaphrasedDraft, setInternalParaphrasedDraft] = useState(null);
  const activeParaphrasedDraft = paraphrasedDraft !== undefined ? paraphrasedDraft : internalParaphrasedDraft;
  const setActiveParaphrasedDraft = setParaphrasedDraft !== undefined ? setParaphrasedDraft : setInternalParaphrasedDraft;

  const diffParts = useMemo(() => {
    if (!draft || !activeParaphrasedDraft) return [];
    const stripMarkdown = (text) => text.replace(/#+\s?/g, '').replace(/[*_~`]/g, '');
    const cleanDraft = stripMarkdown(draft);
    const cleanParaphrased = stripMarkdown(activeParaphrasedDraft);
    return diffWords(cleanDraft, cleanParaphrased);
  }, [draft, activeParaphrasedDraft]);

  useEffect(() => {
    if (!editing && !activeParaphrasedDraft) {
      setDraft(content || "");
      setDraftRefs((references || []).join("\n\n"));
    }
  }, [content, references, editing, activeParaphrasedDraft]);

  if (generationStatus === "idle") {
    return (
      <div
        style={{
          flex: 1,
          border: isDark ? "1px dashed rgba(255, 255, 255, 0.12)" : "1px dashed #e5e7eb",
          borderRadius: "8px",
          padding: "48px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          background: isDark ? "rgba(255, 255, 255, 0.02)" : "#f9fafb",
        }}
      >
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ marginBottom: "16px" }}>
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-2 14H7v-2h10v2Zm0-4H7v-2h10v2Zm0-4H7V7h10v2Z" fill={isDark ? "#4b5563" : "#9ca3af"} opacity="0.6" />
        </svg>
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: "1.1rem", color: isDark ? "#f9fafb" : "#111827", margin: "0 0 8px 0" }}>
          No Content Generated Yet
        </h3>
        <p style={{ color: isDark ? "#9ca3af" : "#6b7280", fontSize: "0.875rem", maxWidth: "400px", margin: 0 }}>
          Click "Draft Introduction" to generate synthesized content with APA citations
        </p>
      </div>
    );
  }

  if (generationStatus === "generating") {
    const steps = [
      { label: "Theme Extraction", target: 25 },
      { label: "Semantic Mapping", target: 50 },
      { label: "Literature Synthesis", target: 75 },
      { label: "APA 7th Citations", target: 100 },
    ];

    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "36px 20px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Central System Loading Card */}
        <div
          style={{
            maxWidth: "560px",
            width: "100%",
            background: isDark ? "rgba(255, 255, 255, 0.03)" : "#ffffff",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "32px 28px",
            boxShadow: isDark 
              ? "0 16px 40px rgba(0, 0, 0, 0.4), 0 0 24px rgba(234, 88, 12, 0.12)"
              : "0 12px 32px rgba(0, 0, 0, 0.06), 0 0 20px rgba(234, 88, 12, 0.08)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Active Moving Loading Symbol UI */}
          <div style={{ position: "relative", width: "84px", height: "84px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Outer pulsating aura */}
            <div
              style={{
                position: "absolute",
                inset: "-4px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(234, 88, 12, 0.35) 0%, rgba(249, 115, 22, 0) 70%)",
                animation: "cw-pulse-ring 2.4s ease-in-out infinite",
              }}
            />
            {/* Outer rotating segmented ring */}
            <div
              className="cw-spinning"
              style={{
                position: "absolute",
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                border: isDark ? "3px solid rgba(255, 255, 255, 0.08)" : "3px solid #fed7aa",
                borderTop: "3px solid #ea580c",
                borderRight: "3px solid #f97316",
                transformOrigin: "center center",
                animation: "cw-spin 1s linear infinite",
              }}
            />
            {/* Inner reverse-rotating ring */}
            <div
              className="cw-spinning-reverse"
              style={{
                position: "absolute",
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                border: isDark ? "2.5px solid rgba(255, 255, 255, 0.06)" : "2.5px solid #ffedd5",
                borderBottom: "2.5px solid #ea580c",
                borderLeft: "2.5px solid #f97316",
                transformOrigin: "center center",
                animation: "cw-spin 1.5s linear infinite reverse",
              }}
            />
            {/* Center spinning core loading icon */}
            <span
              className="cw-spinning"
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ea580c",
                transformOrigin: "center center",
                animation: "cw-spin 0.85s linear infinite",
              }}
            >
              <Loader2 size={24} />
            </span>
          </div>

          {/* Heading & Current Status */}
          <div>
            <h3
              style={{
                margin: "0 0 6px 0",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "1.15rem",
                fontWeight: 700,
                color: isDark ? "#ffffff" : "#111827",
                letterSpacing: "0.01em",
              }}
            >
              Drafting Literature Synthesis
            </h3>
            <p
              style={{
                margin: 0,
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.85rem",
                color: "#ea580c",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span
                className="cw-spinning"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "15px",
                  height: "15px",
                  transformOrigin: "center center",
                  animation: "cw-spin 0.85s linear infinite",
                }}
              >
                <Loader2 size={15} />
              </span>
              {statusText || "Synthesizing literature review..."}
            </p>
          </div>

          {/* Progress Bar Container */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                width: "100%",
                height: "8px",
                background: isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9",
                borderRadius: "999px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.max(10, generationProgress)}%`,
                  background: "linear-gradient(90deg, #ea580c 0%, #f97316 100%)",
                  borderRadius: "999px",
                  transition: "width 0.4s ease",
                  boxShadow: "0 0 10px rgba(249, 115, 22, 0.5)",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.74rem",
                fontFamily: "'Poppins', sans-serif",
                color: isDark ? "#94a3b8" : "#64748b",
              }}
            >
              <span>Analyzing approved sources</span>
              <span style={{ fontWeight: 600, color: isDark ? "#cbd5e1" : "#1e293b" }}>{generationProgress}%</span>
            </div>
          </div>

          {/* Stage steps indicator */}
          <div
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "6px",
              paddingTop: "6px",
            }}
          >
            {steps.map((st, i) => {
              const isPast = generationProgress >= st.target;
              const isCurrent = generationProgress < st.target && (i === 0 || generationProgress >= steps[i - 1].target);
              return (
                <div
                  key={i}
                  style={{
                    padding: "6px 4px",
                    borderRadius: "8px",
                    background: isPast
                      ? (isDark ? "rgba(234, 88, 12, 0.15)" : "#fff7ed")
                      : isCurrent
                        ? (isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)")
                        : "transparent",
                    border: isPast
                      ? "1px solid rgba(234, 88, 12, 0.4)"
                      : isCurrent
                        ? (isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #e2e8f0")
                        : (isDark ? "1px solid rgba(255, 255, 255, 0.04)" : "1px solid #f1f5f9"),
                    fontSize: "0.68rem",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: isPast || isCurrent ? 600 : 400,
                    color: isPast 
                      ? "#ea580c" 
                      : isCurrent 
                        ? (isDark ? "#f3f4f6" : "#1f2937") 
                        : (isDark ? "#64748b" : "#94a3b8"),
                    transition: "all 0.3s ease",
                  }}
                >
                  {st.label}
                </div>
              );
            })}
          </div>

          {/* Skeleton Paragraph Preview with Shimmer */}
          <div
            style={{
              width: "100%",
              background: isDark ? "rgba(0, 0, 0, 0.25)" : "#f8fafc",
              border: isDark ? "1px dashed rgba(255, 255, 255, 0.08)" : "1px dashed #e2e8f0",
              borderRadius: "10px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                height: "12px",
                width: "45%",
                borderRadius: "4px",
                background: isDark
                  ? "linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.05) 100%)"
                  : "linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)",
                backgroundSize: "200% 100%",
                animation: "cw-shimmer 1.8s infinite linear",
              }}
            />
            <div
              style={{
                height: "10px",
                width: "100%",
                borderRadius: "4px",
                background: isDark
                  ? "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%)"
                  : "linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)",
                backgroundSize: "200% 100%",
                animation: "cw-shimmer 1.8s infinite linear",
              }}
            />
            <div
              style={{
                height: "10px",
                width: "88%",
                borderRadius: "4px",
                background: isDark
                  ? "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%)"
                  : "linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)",
                backgroundSize: "200% 100%",
                animation: "cw-shimmer 1.8s infinite linear",
              }}
            />
            <div
              style={{
                height: "10px",
                width: "70%",
                borderRadius: "4px",
                background: isDark
                  ? "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%)"
                  : "linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)",
                backgroundSize: "200% 100%",
                animation: "cw-shimmer 1.8s infinite linear",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const saveEdit = () => {
    setEditing(false);
    const newRefs = draftRefs.split("\n").map(r => r.trim()).filter(Boolean);
    onSaveEdit?.(draft, newRefs);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(content || "");
    setDraftRefs((references || []).join("\n\n"));
  };

  const handleParaphrase = async () => {
    setIsParaphrasing(true);
    setParaphrasedDraft(null);
    try {
      const segments = splitDraftSections(draft);
      const paraphrasedSegments = await Promise.all(
        segments.map(async (seg) => {
          if (seg.type !== "body" || !seg.text.trim()) {
            return seg.text;
          }
          const { res, data } = await apiFetch("/api/v1/synthesis/paraphrase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: seg.text.trim() }),
          });
          if (res.ok && data.success && data.text) {
            return data.text.trim();
          }
          return seg.text;
        })
      );

      let reconstructed = "";
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const textVal = paraphrasedSegments[i] || seg.text;
        if (seg.type === "header") {
          reconstructed += (reconstructed ? "\n\n" : "") + textVal + "\n\n";
        } else {
          reconstructed += textVal;
        }
      }

      const finalOutput = reconstructed.trim();
      if (finalOutput && finalOutput !== draft) {
        setParaphrasedDraft(finalOutput);
        showToast("success", "Paraphrase Ready", "Review the suggested revisions and accept or discard changes.");
      } else {
        showToast("warning", "No Changes Detected", "Paraphrasing completed with no detectable alterations to the current text.");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Paraphrasing Failed", "Could not complete paraphrasing. Please check the network connection.");
    } finally {
      setIsParaphrasing(false);
    }
  };

  const acceptParaphrase = async () => {
    const accepted = activeParaphrasedDraft;
    setDraft(accepted);
    setActiveParaphrasedDraft(null);
    onSaveEdit?.(accepted, references, 'paraphrased');
    showToast("success", "Changes Accepted", "The paraphrased improvements have been applied to your introduction.");
  };

  const discardParaphrase = () => {
    setActiveParaphrasedDraft(null);
    showToast("info", "Changes Discarded", "Reverted to previous draft text.");
  };

  const hasLowConfidence = generationStatus === 'complete' && citationIntegrity?.lowConfidenceSources?.length > 0;
  const hasOmittedDocuments = generationStatus === 'complete' && citationIntegrity?.omittedDocuments?.length > 0;

  return (
    <div data-citewise-draft="true" style={{ lineHeight: "1.7", fontSize: "0.95rem", color: isDark ? "var(--cw-text-primary, #f9fafb)" : "#1f2937", maxWidth: "100%", margin: "0 auto", width: "100%", fontFamily: "'Poppins', sans-serif" }}>
      {(hasLowConfidence || hasOmittedDocuments) && (
        <div className="cw-m-one-col" style={{ display: 'grid', gridTemplateColumns: (hasLowConfidence && hasOmittedDocuments) ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '24px' }}>
          {hasLowConfidence && (
            <div style={{ background: isDark ? 'rgba(249, 115, 22, 0.12)' : '#fff7ef', border: isDark ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid #fed7aa', borderRadius: '10px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ marginTop: '2px', color: '#f97316' }}>
                <AlertTriangle size={20} strokeWidth={2.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: isDark ? '#fdba74' : '#9a3412', marginBottom: '6px', letterSpacing: '0.02em' }}>
                  Citation Verification Required
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', lineHeight: '1.6', color: isDark ? '#cbd5e1' : '#374151', opacity: 0.95 }}>
                  The system could not extract reliable citation data from the following approved document(s). Placeholder citations have been used. Please verify and correct them using the <span style={{ fontWeight: 600, color: '#f97316' }}>Override Citation</span> panel in the left sidebar.
                </p>
                <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                  {citationIntegrity.lowConfidenceSources.map((src, i) => (
                    <li key={i} style={{ color: isDark ? '#fb923c' : '#c2410c', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{src.file}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {hasOmittedDocuments && (
            <div style={{ background: isDark ? 'rgba(220, 38, 38, 0.12)' : '#fef2f2', border: isDark ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid #fecaca', borderRadius: '10px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ marginTop: '2px', color: '#dc2626' }}>
                <AlertTriangle size={20} strokeWidth={2.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: isDark ? '#fca5a5' : '#991b1b', marginBottom: '6px', letterSpacing: '0.02em' }}>
                  Sources Omitted
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', lineHeight: '1.6', color: isDark ? '#cbd5e1' : '#374151', opacity: 0.95 }}>
                  The AI excluded the following document(s) during draft generation because they contained no usable content relevant to the chosen topic or gap.
                </p>
                <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                  {citationIntegrity.omittedDocuments.map((src, i) => (
                    <li key={i} style={{ color: isDark ? '#f87171' : '#b91c1c', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{src.file}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit controls */}
      {editing && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "12px" }}>
          <button
            onClick={saveEdit}
            style={{
              background: "#ea580c",
              color: "#ffffff",
              border: "1px solid #ea580c",
              borderRadius: "8px",
              padding: "6px 16px",
              cursor: "pointer",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.8rem",
              fontWeight: 700,
              boxShadow: "0 2px 8px rgba(234, 88, 12, 0.22)",
              transition: "all 180ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#c2410c";
              e.currentTarget.style.borderColor = "#c2410c";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ea580c";
              e.currentTarget.style.borderColor = "#ea580c";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.22)";
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(234, 88, 12, 0.2)";
            }}
          >
            Save edit
          </button>
          <button
            onClick={cancelEdit}
            style={{
              background: "transparent",
              color: isDark ? "#9ca3af" : "#6b7280",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "6px 16px",
              cursor: "pointer",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.8rem",
              fontWeight: 600,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isDark ? "#ffffff" : "#374151";
              e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.25)" : "#d1d5db";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDark ? "#9ca3af" : "#6b7280";
              e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "#e5e7eb";
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {activeParaphrasedDraft ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="cw-m-one-col cw-m-pad" style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
            background: isDark ? "rgba(255, 255, 255, 0.03)" : "#f9fafb",
            borderRadius: "12px",
            padding: "20px",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e5e7eb"
          }}>
            {/* Original Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h4 style={{ margin: 0, color: isDark ? "#94a3b8" : "#6b7280", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Original Draft</h4>
              <div style={{ whiteSpace: "pre-wrap", color: isDark ? "#94a3b8" : "#6b7280", opacity: 0.9 }}>
                {diffParts.map((part, i) => {
                  if (part.added) return null;
                  if (part.removed) {
                    return <span key={i} style={{ backgroundColor: isDark ? 'rgba(220, 38, 38, 0.25)' : 'rgba(220, 38, 38, 0.12)', color: '#ef4444', textDecoration: 'line-through', borderRadius: '3px', padding: '0 2px' }}>{part.value}</span>;
                  }
                  return <span key={i}>{part.value}</span>;
                })}
              </div>
            </div>

            {/* Edited Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h4 style={{ margin: 0, color: "#16a34a", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Edited Draft</h4>
              <div style={{ whiteSpace: "pre-wrap", color: isDark ? "#f9fafb" : "#1f2937" }}>
                {diffParts.map((part, i) => {
                  if (part.removed) return null;
                  if (part.added) {
                    return <span key={i} style={{ backgroundColor: isDark ? 'rgba(22, 163, 74, 0.25)' : 'rgba(22, 163, 74, 0.12)', color: '#22c55e', borderRadius: '3px', padding: '0 2px' }}>{part.value}</span>;
                  }
                  return <span key={i}>{part.value}</span>;
                })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "16px" }}>
            <button
              type="button"
              onClick={acceptParaphrase}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(22, 163, 74, 0.45)";
                e.currentTarget.style.filter = "brightness(1.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(22, 163, 74, 0.25)";
                e.currentTarget.style.filter = "none";
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "translateY(1px)";
                e.currentTarget.style.boxShadow = "0 2px 6px rgba(22, 163, 74, 0.2)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(22, 163, 74, 0.45)";
              }}
              style={{
                background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "9px 24px",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.9rem",
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Accept Changes
            </button>
            <button
              type="button"
              onClick={discardParaphrase}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(220, 38, 38, 0.45)";
                e.currentTarget.style.filter = "brightness(1.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(220, 38, 38, 0.25)";
                e.currentTarget.style.filter = "none";
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "translateY(1px)";
                e.currentTarget.style.boxShadow = "0 2px 6px rgba(220, 38, 38, 0.2)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(220, 38, 38, 0.45)";
              }}
              style={{
                background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "9px 24px",
                cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.9rem",
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.25)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Discard
            </button>
          </div>
        </div>
      ) : editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{
            width: "100%",
            minHeight: "360px",
            background: isDark ? "var(--cw-bg-input, #100f18)" : "#ffffff",
            color: isDark ? "#f9fafb" : "#111827",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "16px",
            fontFamily: "'Poppins', sans-serif",
            fontSize: "0.92rem",
            lineHeight: "1.7",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
            boxShadow: "0 0 0 2px rgba(234, 88, 12, 0.1)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#ea580c";
            e.currentTarget.style.boxShadow = "0 0 0 2px rgba(234, 88, 12, 0.15)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "#e5e7eb";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      ) : (
        <div style={{ whiteSpace: "pre-wrap", color: isDark ? "var(--cw-text-primary, #f9fafb)" : "#1f2937" }}>
          {content || "No content generated yet."}
        </div>
      )}

      {/* Display references if they exist or if editing */}
      {(references && references.length > 0 || editing) && !activeParaphrasedDraft && (
        <>
          <div style={{ margin: "40px 0 20px 0", height: "1px", background: isDark ? "rgba(255, 255, 255, 0.1)" : "#e5e7eb" }} />
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1rem", fontWeight: 700, color: "#ea580c", marginBottom: "12px", fontFamily: "'Poppins', sans-serif" }}>
            References <span style={{ fontSize: "0.8rem", fontWeight: 500, color: isDark ? "#9ca3af" : "#6b7280" }}>(APA 7th ed.)</span>
          </h3>
          {editing ? (
            <textarea
              value={draftRefs}
              onChange={(e) => setDraftRefs(e.target.value)}
              placeholder="Add or edit your APA citations here... (one per line)"
              style={{
                width: "100%",
                minHeight: "150px",
                background: isDark ? "var(--cw-bg-input, #100f18)" : "#ffffff",
                color: isDark ? "#f9fafb" : "#111827",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "16px",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.85rem",
                lineHeight: "1.6",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#ea580c";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(234, 88, 12, 0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "#e5e7eb";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.8rem", color: isDark ? "#cbd5e1" : "#6b7280" }}>
              {references.map((ref, idx) => (
                <div key={idx}>{ref}</div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modern Toast Notification */}
      <ModernToast
        show={toastState.show}
        type={toastState.type}
        title={toastState.title}
        message={toastState.message}
        onClose={() => setToastState((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
}