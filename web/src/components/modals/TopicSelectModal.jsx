import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../../context/ThemeContext";

const FOCUSABLE =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Shown when a group has 2+ suggested topics.
 * User picks one topic; we then import it into CiteWise.
 */
export default function TopicSelectModal({ topics, gaps, groupName, onSelect, onClose }) {
  const { isDark } = useTheme();
  const [selected, setSelected] = useState(topics?.length === 1 ? topics[0] : null);
  const [importing, setImporting] = useState(false);
  const modalRef = useRef(null);

  async function handleConfirm() {
    if (!selected) return;
    setImporting(true);
    await onSelect(selected);
    setImporting(false);
  }

  // Tabbing used to walk the page behind the dialog — "Enter Group", "CiteWise
  // →" and the rest stayed reachable while the modal was open. Keep focus in
  // here and let Escape close it.
  useEffect(() => {
    const node = modalRef.current;
    node?.querySelector(FOCUSABLE)?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !node) return;

      const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="cw-topic-overlay" style={styles.overlay}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Select a research topic"
        className="cw-topic-modal"
        style={{
          ...styles.modal,
          background: isDark ? "#15141f" : "#ffffff",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
        }}
      >

        {/* Header */}
        <div className="cw-topic-header" style={{ ...styles.header, borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e5e7eb" }}>
          <div>
            <p style={styles.subtitle}>{groupName}</p>
            <h2 style={{ ...styles.title, color: isDark ? "#ffffff" : "#0f0e17" }}>Select a Research Topic</h2>
            <p style={{ ...styles.hint, color: isDark ? "#cbd5e1" : "#4b5563" }}>Choose the topic you want CiteWise to focus on.</p>
          </div>
          <button onClick={onClose} style={{ ...styles.closeBtn, color: isDark ? "#cbd5e1" : "#4b5563" }}>✕</button>
        </div>

        {/* Topic cards */}
        <div className="cw-topic-body" style={styles.body}>
          <div style={styles.topicList} role="radiogroup" aria-label="Suggested topics">
            {topics.map((topic, i) => {
              const isSelected = selected?.id === topic.id;
              return (
                <div
                  key={topic.id}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => setSelected(topic)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                       setSelected(topic);
                    }
                  }}
                  style={{
                    ...styles.topicCard,
                    borderColor: isSelected ? "#ea580c" : isDark ? "rgba(255, 255, 255, 0.1)" : "#e5e7eb",
                    background: isSelected ? "rgba(234, 88, 12, 0.14)" : isDark ? "#1b1a29" : "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <div style={styles.topicIndex}>Topic {i + 1}</div>
                  <h4 style={{ ...styles.topicTitle, color: isDark ? "#ffffff" : "#0f0e17" }}>{topic.title}</h4>
                  <p style={{ ...styles.topicRationale, color: isDark ? "#cbd5e1" : "#4b5563" }}>{topic.rationale}</p>
                  {isSelected && (
                    <div style={styles.selectedBadge}>✓ Selected</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Gap panel — updates to show context alongside whichever topic is hovered/selected */}
          <div className="cw-topic-gaps" style={{ ...styles.gapPanel, background: isDark ? "#12111b" : "#f9fafb", border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e5e7eb" }}>
            <p style={styles.gapPanelLabel}>Research Gaps</p>
            <p style={{ ...styles.gapPanelHint, color: isDark ? "#cbd5e1" : "#4b5563" }}>
              These gaps apply to all topics in this workspace.
            </p>
            <div style={styles.gapList}>
              {gaps.length === 0 ? (
                <p style={{ ...styles.noGaps, color: isDark ? "#cbd5e1" : "#4b5563" }}>No gaps recorded yet.</p>
              ) : (
                gaps.map((gap, i) => (
                  <div key={i} style={styles.gapItem}>
                    <span style={styles.gapBullet}>{i + 1}</span>
                    <span style={{ ...styles.gapText, color: isDark ? "#cbd5e1" : "#4b5563" }}>{gap}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="cw-topic-footer" style={{ ...styles.footer, borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e5e7eb" }}>
          <button onClick={onClose} style={{ ...styles.cancelBtn, color: isDark ? "#cbd5e1" : "#4b5563", border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #d1d5db" }}>Cancel</button>
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
    </div>,
    document.body
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
    background: "#ffffff",
    border: "none",
    outline: "none",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "900px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "24px 28px 20px",
    borderBottom: "1px solid #e5e7eb",
    flexShrink: 0,
  },
  subtitle: {
    margin: 0,
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#ea580c",
    fontFamily: "'Poppins', sans-serif",
  },
  title: {
    margin: "4px 0 6px",
    fontSize: "1.4rem",
    fontWeight: 800,
    color: "#0f0e17",
    fontFamily: "'Poppins', sans-serif",
  },
  hint: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#4b5563",
    fontFamily: "'Poppins', sans-serif",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#4b5563",
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
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    padding: "16px 18px",
    position: "relative",
    transition: "all 0.18s ease",
    userSelect: "none",
    background: "#ffffff",
  },
  topicIndex: {
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#ea580c",
    marginBottom: "6px",
    fontFamily: "'Poppins', sans-serif",
  },
  topicTitle: {
    margin: "0 0 8px",
    fontSize: "1rem",
    fontWeight: 700,
    color: "#0f0e17",
    fontFamily: "'Poppins', sans-serif",
    lineHeight: 1.35,
  },
  topicRationale: {
    margin: 0,
    fontSize: "0.82rem",
    color: "#4b5563",
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
    color: "#ea580c",
    fontFamily: "'Poppins', sans-serif",
  },
  gapPanel: {
    width: "280px",
    flexShrink: 0,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
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
    color: "#ea580c",
    fontFamily: "'Poppins', sans-serif",
  },
  gapPanelHint: {
    margin: "0 0 12px",
    fontSize: "0.75rem",
    color: "#4b5563",
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
    background: "rgba(234,88,12,0.12)",
    border: "1px solid rgba(234,88,12,0.4)",
    color: "#ea580c",
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
    color: "#4b5563",
    lineHeight: 1.55,
    fontFamily: "'Poppins', sans-serif",
  },
  noGaps: {
    fontSize: "0.8rem",
    color: "#4b5563",
    fontFamily: "'Poppins', sans-serif",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "12px",
    padding: "16px 28px",
    borderTop: "1px solid #e5e7eb",
    flexShrink: 0,
  },
  cancelBtn: {
    height: "38px",
    minHeight: "38px",
    background: "transparent",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    color: "#4b5563",
    padding: "0 18px",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  confirmBtn: {
    height: "38px",
    minHeight: "38px",
    background: "#ea580c",
    border: "1px solid #ea580c",
    borderRadius: "8px",
    color: "#ffffff",
    padding: "0 20px",
    fontSize: "0.85rem",
    fontWeight: 600,
    fontFamily: "'Poppins', sans-serif",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
    transition: "all 0.2s",
    maxWidth: "360px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
