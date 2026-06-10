export default function GeneratedDraftDisplay({ generationStatus, content, references }) {
  if (generationStatus === "idle") {
    return (
      <div
        style={{
          flex: 1,
          border: "1px dashed #3A3630",
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
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-2 14H7v-2h10v2Zm0-4H7v-2h10v2Zm0-4H7V7h10v2Z" fill="#f0ece6" opacity="0.7" />
        </svg>
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: "1.1rem", color: "#f0ece6", margin: "0 0 8px 0" }}>
          No Content Generated Yet
        </h3>
        <p style={{ color: "#8a8278", fontSize: "0.875rem", maxWidth: "400px", margin: 0 }}>
          Click "Draft Introduction" to generate synthesized content with APA citations
        </p>
      </div>
    );
  }

  if (generationStatus === "generating") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <div style={{ width: "48px", height: "48px", border: "3px solid #333028", borderTop: "3px solid #e07b39", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#8a8278" }}>Drafting Synthesis...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Complete state - show the generated content
  return (
    <div data-citewise-draft="true" style={{ lineHeight: "1.7", fontSize: "0.95rem", color: "#f0ece6", maxWidth: "800px", margin: "0 auto", width: "100%", fontFamily: "'Poppins', sans-serif" }}>
      {/* Display the generated content as HTML with line breaks */}
      <div style={{ whiteSpace: "pre-wrap" }}>
        {content || "No content generated yet."}
      </div>
      
      {/* Display references if they exist */}
      {references && references.length > 0 && (
        <>
          <div style={{ margin: "40px 0 20px 0", height: "1px", background: "#333028" }} />
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#D85A30", marginBottom: "12px", fontFamily: "'Poppins', sans-serif" }}>
            References
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.8rem", color: "#8a8278" }}>
            {references.map((ref, idx) => (
              <div key={idx}>{ref}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}