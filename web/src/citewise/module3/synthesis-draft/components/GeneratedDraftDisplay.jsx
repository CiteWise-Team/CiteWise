import { useEffect, useRef, useState } from "react";

export default function GeneratedDraftDisplay({ generationStatus, content, references, onSaveEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content || "");
  const [draftRefs, setDraftRefs] = useState((references || []).join("\n\n"));
  const textareaRef = useRef(null);

  // Keep the local edit buffer in sync when new content arrives (e.g. restore).
  useEffect(() => {
    if (!editing) {
      setDraft(content || "");
      setDraftRefs((references || []).join("\n\n"));
    }
  }, [content, references, editing]);

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

  // Complete state - show (or edit) the generated content
  return (
    <div data-citewise-draft="true" style={{ lineHeight: "1.7", fontSize: "0.95rem", color: "#e4e4f0", maxWidth: "800px", margin: "0 auto", width: "100%", fontFamily: "'Poppins', sans-serif" }}>
      {/* Edit controls — Req 6: AI output is a draft, the user has the final say */}
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
          <button
            onClick={() => setEditing(true)}
            style={{ background: "transparent", color: "#5b5bd6", border: "1px solid rgba(91,91,214,0.5)", borderRadius: "8px", padding: "6px 16px", cursor: "pointer", fontFamily: "'Poppins', sans-serif", fontSize: "0.8rem", fontWeight: 700 }}
          >
            ✎ Edit draft
          </button>
        )}
      </div>

      {editing ? (
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
      {(references && references.length > 0 || editing) && (
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
