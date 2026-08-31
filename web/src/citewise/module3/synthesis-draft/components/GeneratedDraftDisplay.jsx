import { useEffect, useRef, useState, useMemo } from "react";
import { diffWords } from 'diff';
import { apiFetch } from "../../../../api/http";
import { Sparkles, AlertTriangle } from "lucide-react";

export default function GeneratedDraftDisplay({ generationStatus, content, references, onSaveEdit, citationIntegrity }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content || "");
  const [draftRefs, setDraftRefs] = useState((references || []).join("\n\n"));
  const textareaRef = useRef(null);
  
  // Paraphraser state
  const [isParaphrasing, setIsParaphrasing] = useState(false);
  const [paraphrasedDraft, setParaphrasedDraft] = useState(null);

  const diffParts = useMemo(() => {
    if (!draft || !paraphrasedDraft) return [];
    // Strip markdown formatting symbols for the diff view ONLY so they don't visually clutter the comparison
    const stripMarkdown = (text) => text.replace(/#+\s?/g, '').replace(/[*_~`]/g, '');
    const cleanDraft = stripMarkdown(draft);
    const cleanParaphrased = stripMarkdown(paraphrasedDraft);
    return diffWords(cleanDraft, cleanParaphrased);
  }, [draft, paraphrasedDraft]);

  // Keep the local edit buffer in sync when new content arrives (e.g. restore).
  useEffect(() => {
    if (!editing && !paraphrasedDraft) {
      setDraft(content || "");
      setDraftRefs((references || []).join("\n\n"));
    }
  }, [content, references, editing, paraphrasedDraft]);

  if (generationStatus === "idle") {
    return (
      <div
        style={{
          flex: 1,
          border: "1px dashed #3a3a55",
          borderRadius: "8px",
          padding: "48px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          background: "rgba(0, 0, 0, 0.15)",
        }}
      >
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ marginBottom: "16px" }}>
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-2 14H7v-2h10v2Zm0-4H7v-2h10v2Zm0-4H7V7h10v2Z" fill="#e4e4f0" opacity="0.7" />
        </svg>
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: "1.1rem", color: "#e4e4f0", margin: "0 0 8px 0" }}>
          No Content Generated Yet
        </h3>
        <p style={{ color: "#a1a1b5", fontSize: "0.875rem", maxWidth: "400px", margin: 0 }}>
          Click "Draft Introduction" to generate synthesized content with APA citations
        </p>
      </div>
    );
  }

  if (generationStatus === "generating") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <div style={{ width: "48px", height: "48px", border: "3px solid #3a3a55", borderTop: "3px solid #6f6fe0", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#a1a1b5" }}>Drafting Synthesis...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
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
      const { res, data } = await apiFetch('/api/v1/synthesis/paraphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft })
      });
      if (res.ok && data.success && data.text) {
        // Fix 3: do NOT strip ** here — the diff useMemo strips them for
        // display purposes. Stripping here would destroy intentional formatting
        // (bold subheadings, emphasis) in the saved draft.
        setParaphrasedDraft(data.text);
      } else {
        alert("Paraphrasing failed. Please check n8n workflow credentials.");
      }
    } catch (err) {
      console.error(err);
      alert("Paraphrasing failed. Please check the network.");
    } finally {
      setIsParaphrasing(false);
    }
  };

  const acceptParaphrase = async () => {
    const accepted = paraphrasedDraft;
    setDraft(accepted);
    setParaphrasedDraft(null);
    // Fix 2: sync the paraphrased draft to the DB and to the parent store.
    onSaveEdit?.(accepted, references, 'paraphrased');
  };


  const discardParaphrase = () => {
    setParaphrasedDraft(null);
  };

  // Complete state - show (or edit) the generated content
  const hasLowConfidence = generationStatus === 'complete' && citationIntegrity?.lowConfidenceSources?.length > 0;
  const hasOmittedDocuments = generationStatus === 'complete' && citationIntegrity?.omittedDocuments?.length > 0;

  return (
    <div data-citewise-draft="true" style={{ lineHeight: "1.7", fontSize: "0.95rem", color: "#e4e4f0", maxWidth: "100%", margin: "0 auto", width: "100%", fontFamily: "'Poppins', sans-serif" }}>
      {(hasLowConfidence || hasOmittedDocuments) && (
        <div style={{ display: 'grid', gridTemplateColumns: (hasLowConfidence && hasOmittedDocuments) ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '24px' }}>
          {hasLowConfidence && (
            <div style={{ background: 'rgba(255,153,0,0.05)', border: '1px solid rgba(255,153,0,0.25)', borderRadius: '10px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ marginTop: '2px', color: '#ffb74d' }}>
                <AlertTriangle size={20} strokeWidth={2.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffcc80', marginBottom: '6px', letterSpacing: '0.02em' }}>
                  Citation Verification Required
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', lineHeight: '1.6', color: '#e4e4f0', opacity: 0.85 }}>
                  The system could not extract reliable citation data from the following approved document(s). Placeholder citations have been used. Please verify and correct them using the <span style={{ fontWeight: 600, color: '#ffb74d' }}>Override Citation</span> panel in the left sidebar.
                </p>
                <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                  {citationIntegrity.lowConfidenceSources.map((src, i) => (
                    <li key={i} style={{ color: '#ffb74d', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{src.file}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {hasOmittedDocuments && (
            <div style={{ background: 'rgba(229, 84, 75, 0.05)', border: '1px solid rgba(229, 84, 75, 0.25)', borderRadius: '10px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ marginTop: '2px', color: '#e5544b' }}>
                <AlertTriangle size={20} strokeWidth={2.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ef9a9a', marginBottom: '6px', letterSpacing: '0.02em' }}>
                  Sources Omitted
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', lineHeight: '1.6', color: '#e4e4f0', opacity: 0.85 }}>
                  The AI excluded the following document(s) during draft generation because they contained no usable content relevant to the chosen topic or gap.
                </p>
                <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                  {citationIntegrity.omittedDocuments.map((src, i) => (
                    <li key={i} style={{ color: '#ef9a9a', fontSize: '0.85rem' }}>
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
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "12px" }}>
        {editing ? (
          <>
            <button
              onClick={saveEdit}
              style={{ background: "#5b5bd6", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 16px", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: "0.8rem", fontWeight: 700 }}
            >
              Save edit
            </button>
            <button
              onClick={cancelEdit}
              style={{ background: "transparent", color: "#e4e4f0", border: "1px solid #3a3a55", borderRadius: "8px", padding: "6px 16px", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: "0.8rem", fontWeight: 600 }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleParaphrase}
              disabled={isParaphrasing || !!paraphrasedDraft}
              style={{ background: "transparent", color: "#ff9900", border: "1px solid rgba(255,153,0,0.5)", borderRadius: "8px", padding: "6px 16px", cursor: (isParaphrasing || !!paraphrasedDraft) ? "not-allowed" : "pointer", fontFamily: "'Poppins', sans-serif", fontSize: "0.8rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}
            >
              {isParaphrasing ? (
                <>Paraphrasing...</>
              ) : (
                <><Sparkles size={16} /> Remove AI Slop</>
              )}
            </button>
            {!paraphrasedDraft && (
              <button
                onClick={() => setEditing(true)}
                style={{ background: "transparent", color: "#5b5bd6", border: "1px solid rgba(91,91,214,0.5)", borderRadius: "8px", padding: "6px 16px", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: "0.8rem", fontWeight: 700 }}
              >
                ✎ Edit draft
              </button>
            )}
          </>
        )}
      </div>

      {paraphrasedDraft ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "24px",
            background: "#1a1a2e",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid #3a3a55"
          }}>
            {/* Original Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h4 style={{ margin: 0, color: "#a1a1b5", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Original Draft</h4>
              <div style={{ whiteSpace: "pre-wrap", color: "#a1a1b5", opacity: 0.9 }}>
                {diffParts.map((part, i) => {
                  if (part.added) return null;
                  if (part.removed) {
                    return <span key={i} style={{ backgroundColor: 'rgba(220, 53, 69, 0.2)', color: '#ff6b6b', textDecoration: 'line-through', borderRadius: '3px', padding: '0 2px' }}>{part.value}</span>;
                  }
                  return <span key={i}>{part.value}</span>;
                })}
              </div>
            </div>

            {/* Edited Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h4 style={{ margin: 0, color: "#4ade80", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Edited Draft</h4>
              <div style={{ whiteSpace: "pre-wrap", color: "#e4e4f0" }}>
                {diffParts.map((part, i) => {
                  if (part.removed) return null;
                  if (part.added) {
                    return <span key={i} style={{ backgroundColor: 'rgba(40, 167, 69, 0.2)', color: '#4ade80', borderRadius: '3px', padding: '0 2px' }}>{part.value}</span>;
                  }
                  return <span key={i}>{part.value}</span>;
                })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              onClick={acceptParaphrase}
              style={{ background: "#28a745", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 24px", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: "0.9rem", fontWeight: 700 }}
            >
              Accept Changes
            </button>
            <button
              onClick={discardParaphrase}
              style={{ background: "#dc3545", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 24px", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: "0.9rem", fontWeight: 700 }}
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
            background: "#25253a",
            color: "#e4e4f0",
            border: "1px solid #3a3a55",
            borderRadius: "10px",
            padding: "16px",
            fontFamily: "'Poppins', sans-serif",
            fontSize: "0.92rem",
            lineHeight: "1.7",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      ) : (
        <div style={{ whiteSpace: "pre-wrap" }}>
          {content || "No content generated yet."}
        </div>
      )}

      {/* Display references if they exist or if editing */}
      {(references && references.length > 0 || editing) && !paraphrasedDraft && (
        <>
          <div style={{ margin: "40px 0 20px 0", height: "1px", background: "#3a3a55" }} />
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1rem", fontWeight: 700, color: "#5b5bd6", marginBottom: "12px", fontFamily: "'Poppins', sans-serif" }}>
            References <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#a1a1b5" }}>(APA 7th ed.)</span>
          </h3>
          {editing ? (
            <textarea
              value={draftRefs}
              onChange={(e) => setDraftRefs(e.target.value)}
              placeholder="Add or edit your APA citations here... (one per line)"
              style={{
                width: "100%",
                minHeight: "150px",
                background: "#25253a",
                color: "#e4e4f0",
                border: "1px solid #3a3a55",
                borderRadius: "10px",
                padding: "16px",
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.85rem",
                lineHeight: "1.6",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.8rem", color: "#a1a1b5" }}>
              {references.map((ref, idx) => (
                <div key={idx}>{ref}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
