import { useState } from "react";
import { apiRequest } from "../../../../api/http";

export default function ApprovedSourceList({ documents, loading, onOverrideComplete }) {
  const [editingDoc, setEditingDoc] = useState(null);
  const [citationText, setCitationText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditClick = (doc) => {
    setEditingDoc(doc);
    setCitationText("");
  };

  const handleSave = async () => {
    if (!citationText.trim()) return;
    setIsSubmitting(true);
    try {
      await apiRequest(`/api/v1/documents/${editingDoc.id || editingDoc.documentId}/citation_override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: citationText.trim() })
      });
      setEditingDoc(null);
      if (onOverrideComplete) onOverrideComplete();
    } catch (err) {
      console.error("Failed to override citation", err);
      alert(`Failed to override citation: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        background: "#1e1e2f",
        border: "1px solid #3a3a55",
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        position: "relative"
      }}
    >
      <span
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: "1.05rem",
          color: "#5b5bd6",
          letterSpacing: "0.01em",
        }}
      >
        Source Documents ({documents.length})
      </span>

      <div style={{ height: "1px", background: "#3a3a55" }} />

      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "40px 20px",
            background: "rgba(0, 0, 0, 0.15)",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "2px solid #3a3a55",
              borderTop: "2px solid #5b5bd6",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ color: "#a1a1b5", fontSize: "0.85rem" }}>
            Loading documents...
          </span>
        </div>
      ) : documents.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "#a1a1b5",
            fontSize: "0.85rem",
            background: "rgba(0, 0, 0, 0.15)",
            borderRadius: "8px",
          }}
        >
          No approved documents yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {documents.map((doc, idx) => (
            <div
              key={idx}
              style={{
                background: "rgba(0, 0, 0, 0.15)",
                border: "1px solid #3a3a55",
                borderRadius: "8px",
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "border-color 0.2s ease",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "#e4e4f0",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    maxWidth: "200px",
                  }}
                  title={doc.fileName || doc.name}
                >
                  {doc.fileName || doc.name}
                </span>
                {doc.title && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "#7d7d95",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      maxWidth: "200px",
                    }}
                    title={doc.title}
                  >
                    {doc.title}
                  </span>
                )}
                <span
                  onClick={() => handleEditClick(doc)}
                  style={{
                    fontSize: "0.7rem",
                    color: "#a1a1b5",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Override Citation
                </span>
              </div>

              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: "#5b5bd6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="#e4e4f0"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Citation Override Modal */}
      {editingDoc && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#1e1e2f", padding: "24px", borderRadius: "12px",
            width: "400px", border: "1px solid #3a3a55",
            display: "flex", flexDirection: "column", gap: "16px"
          }}>
            <h3 style={{ margin: 0, color: "#e4e4f0", fontSize: "1.1rem" }}>Override Citation</h3>
            <p style={{ margin: 0, color: "#a1a1b5", fontSize: "0.85rem", lineHeight: "1.5" }}>
              Paste the correct APA citation for <strong>{editingDoc.fileName || editingDoc.name}</strong>. The system will automatically extract the in-text citation format and use it in your synthesis.
            </p>
            <textarea
              value={citationText}
              onChange={(e) => setCitationText(e.target.value)}
              placeholder="e.g. Gao, Y., Xiong, Y... (2023). Retrieval-Augmented Generation..."
              style={{
                width: "100%", height: "120px", background: "#25253a",
                color: "#e4e4f0", border: "1px solid #3a3a55", borderRadius: "8px",
                padding: "12px", outline: "none", resize: "none", boxSizing: "border-box"
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button 
                onClick={() => setEditingDoc(null)}
                style={{ background: "transparent", color: "#a1a1b5", border: "none", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSubmitting || !citationText.trim()}
                style={{ 
                  background: "#5b5bd6", color: "#fff", border: "none", 
                  borderRadius: "6px", padding: "8px 16px", cursor: "pointer",
                  opacity: (isSubmitting || !citationText.trim()) ? 0.5 : 1
                }}
              >
                {isSubmitting ? "Saving..." : "Save Citation"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
