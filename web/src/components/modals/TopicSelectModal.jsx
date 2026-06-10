import { useState } from "react";

/**
 * Shown when a group has 2+ suggested topics.
 * User picks one topic; we then import it into CiteWise.
 */
export default function TopicSelectModal({ topics, gaps, groupName, onSelect, onClose }) {
  const [selected, setSelected] = useState(null);
  const [importing, setImporting] = useState(false);

  async function handleConfirm() {
    if (!selected) return;
    setImporting(true);
    await onSelect(selected);
    setImporting(false);
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <p style={styles.subtitle}>{groupName}</p>
            <h2 style={styles.title}>Select a Research Topic</h2>
            <p style={styles.hint}>Choose the topic you want CiteWise to focus on.</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Topic cards */}
        <div style={styles.body}>
          <div style={styles.topicList}>
            {topics.map((topic, i) => {
              const isSelected = selected?.id === topic.id;
              return (
                <div
                  key={topic.id}
                  onClick={() => setSelected(topic)}
                  style={{
                    ...styles.topicCard,
                    borderColor: isSelected ? "#D98A21" : "#3a3a55",
                    background:  isSelected ? "rgba(217,138,33,0.08)" : "#25253a",
                    cursor: "pointer",
                  }}
                >
                  <div style={styles.topicIndex}>Topic {i + 1}</div>
                  <h4 style={styles.topicTitle}>{topic.title}</h4>
                  <p style={styles.topicRationale}>{topic.rationale}</p>
                  {isSelected && (
                    <div style={styles.selectedBadge}>✓ Selected</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Gap panel — updates to show context alongside whichever topic is hovered/selected */}
          <div style={styles.gapPanel}>
            <p style={styles.gapPanelLabel}>Research Gaps</p>
            <p style={styles.gapPanelHint}>
              These gaps apply to all topics in this workspace.
            </p>
            <div style={styles.gapList}>
              {gaps.length === 0 ? (
                <p style={styles.noGaps}>No gaps recorded yet.</p>
              ) : (
                gaps.map((gap, i) => (
                  <div key={i} style={styles.gapItem}>
                    <span style={styles.gapBullet}>{i + 1}</span>
                    <span style={styles.gapText}>{gap}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!selected || importing}
            style={{
              ...styles.confirmBtn,
              opacity: (!selected || importing) ? 0.5 : 1,
              cursor: (!selected || importing) ? "not-allowed" : "pointer",
            }}
          >
            {importing ? "Importing..." : selected ? `Use "${selected.title.slice(0, 40)}${selected.title.length > 40 ? "…" : ""}"` : "Select a topic above"}
          </button>
        </div>

      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  modal: {
    background: "#1e1e2f",
    border: "1px solid #3a3a55",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "900px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "24px 28px 20px",
    borderBottom: "1px solid #3a3a55",
    flexShrink: 0,
  },
  subtitle: {
    margin: 0,
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#D98A21",
    fontFamily: "'Poppins', sans-serif",
  },
  title: {
    margin: "4px 0 6px",
    fontSize: "1.4rem",
    fontWeight: 800,
    color: "#e4e4f0",
    fontFamily: "'Poppins', sans-serif",
  },
  hint: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#a1a1b5",
    fontFamily: "'Poppins', sans-serif",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#a1a1b5",
    fontSize: "1.1rem",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "6px",
    flexShrink: 0,
  },
  body: {
    display: "flex",
    gap: "20px",
    padding: "20px 28px",
    overflow: "auto",
    flex: 1,
    minHeight: 0,
  },
  topicList: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minWidth: 0,
  },
  topicCard: {
    border: "2px solid",
    borderRadius: "12px",
    padding: "16px 18px",
    position: "relative",
    transition: "all 0.18s ease",
    userSelect: "none",
  },
  topicIndex: {
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#D98A21",
    marginBottom: "6px",
    fontFamily: "'Poppins', sans-serif",
  },
  topicTitle: {
    margin: "0 0 8px",
    fontSize: "1rem",
    fontWeight: 700,
    color: "#e4e4f0",
    fontFamily: "'Poppins', sans-serif",
    lineHeight: 1.35,
  },
  topicRationale: {
    margin: 0,
    fontSize: "0.82rem",
    color: "#a1a1b5",
    lineHeight: 1.6,
    fontFamily: "'Poppins', sans-serif",
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  selectedBadge: {
    position: "absolute",
    top: "12px",
    right: "14px",
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#D98A21",
    fontFamily: "'Poppins', sans-serif",
  },
  gapPanel: {
    width: "280px",
    flexShrink: 0,
    background: "#161624",
    border: "1px solid #3a3a55",
    borderRadius: "12px",
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  gapPanelLabel: {
    margin: "0 0 4px",
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#D98A21",
    fontFamily: "'Poppins', sans-serif",
  },
  gapPanelHint: {
    margin: "0 0 12px",
    fontSize: "0.75rem",
    color: "#a1a1b5",
    fontFamily: "'Poppins', sans-serif",
    lineHeight: 1.5,
  },
  gapList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    overflowY: "auto",
    flex: 1,
  },
  gapItem: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
  },
  gapBullet: {
    flexShrink: 0,
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    background: "rgba(217,138,33,0.15)",
    border: "1px solid rgba(217,138,33,0.4)",
    color: "#D98A21",
    fontSize: "0.65rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Poppins', sans-serif",
    marginTop: "1px",
  },
  gapText: {
    fontSize: "0.78rem",
    color: "#c8c5d0",
    lineHeight: 1.55,
    fontFamily: "'Poppins', sans-serif",
  },
  noGaps: {
    fontSize: "0.8rem",
    color: "#a1a1b5",
    fontFamily: "'Poppins', sans-serif",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "12px",
    padding: "16px 28px",
    borderTop: "1px solid #3a3a55",
    flexShrink: 0,
  },
  cancelBtn: {
    background: "transparent",
    border: "1px solid #3a3a55",
    borderRadius: "8px",
    color: "#a1a1b5",
    padding: "10px 20px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
    transition: "all 0.2s",
  },
  confirmBtn: {
    background: "#D98A21",
    border: "none",
    borderRadius: "8px",
    color: "#1a1a2e",
    padding: "10px 24px",
    fontSize: "0.875rem",
    fontWeight: 700,
    fontFamily: "'Poppins', sans-serif",
    transition: "all 0.2s",
    maxWidth: "360px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
