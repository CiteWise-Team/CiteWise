import { useEffect, useState } from "react";
import { useGroup } from "../../../context/GroupContext";
import { getGapsByGroupAPI } from "../../../api/workflow.gap";
import { RiLoader4Line, RiQuestionLine } from "react-icons/ri";
import WorkflowCardHeader from "../WorkflowCardHeader";
import WorkflowPartnerLoadingUI from "./WorkflowPartnerLoadingUI";

export default function GapOutput({
  result,
  onComplete,
  isCollapsed = false,
  onToggleCollapse,
  isProcessing = false,
  processingStatus = "",
}) {
  const group_id = useGroup().groupId;

  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchGaps() {
      if (!group_id) return;

      setLoading(true);
      try {
        const res = await getGapsByGroupAPI(group_id);
        const data = res.data || [];
        setItems(data);
        if (data.length > 0) onComplete?.();

        if (result?.id) {
          setActiveId(result.id);
        } else if (data.length > 0) {
          setActiveId(data[0].id);
        }
      } catch (err) {
        console.error("Error fetching gaps:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchGaps();
  }, [group_id, result]);

  const activeItem = items.find((p) => p.id === activeId);

  return (
    <div className={`h-100 d-flex flex-column rounded-4 workflow-result-card gap-result-card ${isCollapsed ? "is-collapsed" : ""}`} style={{ minHeight: 0 }}>
      <WorkflowCardHeader
        title="Explore research gaps"
        subtitle="Review the detected gaps and use them to understand where your research can contribute."
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        rightContent={
          items.length > 0 ? (
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "#ea580c",
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                padding: "4px 10px",
                borderRadius: "20px",
                whiteSpace: "nowrap",
              }}
            >
              {items.length} gap{items.length !== 1 ? "s" : ""} detected
            </span>
          ) : null
        }
      />
      {!isCollapsed && (
        <div className="workflow-result-content flex-grow-1" style={{ minHeight: 0, overflow: "hidden" }}>
        {isProcessing ? (
          <WorkflowPartnerLoadingUI
            stepType="gap"
            title={processingStatus || "Analyzing research gaps with AI..."}
          />
        ) : (
        <div className="workflow-split-result-body d-flex h-100 cw-m-split" style={{ minHeight: 0, gap: 0 }}>
        {/* LEFT SIDEBAR — Titles only */}
        <div
          className="d-flex flex-column workflow-result-sidebar"
          style={{
            width: "240px",
            flex: "0 0 240px",
            borderRight: "1px solid #e5e7eb",
            paddingRight: "20px",
            minHeight: 0,
          }}
        >
          <div className="mb-2">
            <p
              className="small fw-bold text-uppercase mb-0"
              style={{ color: "#ea580c" }}
            >
              Extracted Gap Sources ({items.length})
            </p>
          </div>

          <div
            className="workflow-result-sidebar-list flex-grow-1"
            style={{ overflowY: "auto", minHeight: 0, paddingRight: "4px" }}
          >
            {loading ? (
              <div style={{ padding: "3rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                {/* Guaranteed Animated SVG Spinner with glowing center */}
                <div
                  style={{
                    position: "relative",
                    width: "68px",
                    height: "68px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <svg width="68" height="68" viewBox="0 0 50 50" style={{ position: "absolute", inset: 0 }}>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(234, 88, 12, 0.12)" strokeWidth="3.5" />
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
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      background: "rgba(234, 88, 12, 0.09)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 14px rgba(234, 88, 12, 0.25)",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                </div>

                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "0.95rem", fontWeight: 700, color: "var(--cw-text-primary, #0f0e17)", margin: "0 0 0.25rem 0" }}>
                  Loading Gaps
                </p>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "0.8rem", color: "var(--cw-text-muted, #6b7280)", margin: "0 0 1rem 0" }}>
                  Discovering research opportunities...
                </p>

                {/* Moving Progress Bar */}
                <div
                  style={{
                    width: "180px",
                    maxWidth: "80%",
                    height: "6px",
                    background: "var(--cw-border, #e5e7eb)",
                    borderRadius: "999px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div className="cw-loading-progress-fill" />
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center mt-5">
                <RiQuestionLine className="fs-1 mb-2" style={{ color: "#9ca3af" }} />
                <p style={{ color: "#4b5563" }}>
                  No gaps extracted yet.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const isSelected = activeId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    className={`mb-2 rounded-3 workflow-result-list-item${isSelected ? " is-selected" : ""}`}
                    style={{
                      cursor: "pointer",
                      backgroundColor: isSelected ? "#fff7ed" : "#ffffff",
                      border: isSelected ? "1px solid #ea580c" : "1px solid #e5e7eb",
                      overflow: "hidden",
                      transition: "all 0.18s ease",
                      display: "flex",
                      alignItems: "center",
                      minHeight: "46px",
                      padding: "10px 14px",
                    }}
                  >
                    <h6
                      className="fw-bold mb-0 text-truncate w-100"
                      style={{
                        color: isSelected ? "#ea580c" : "#0f0e17",
                        margin: 0,
                        lineHeight: 1.35,
                      }}
                      title={item.title}
                    >
                      {item.title}
                    </h6>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div
          className="flex-grow-1 d-flex flex-column workflow-result-detail"
          style={{
            minHeight: 0,
            overflow: "visible",
            paddingLeft: "20px",
            paddingRight: 0,
          }}
        >
          {activeItem ? (
            <>
              <div className="workflow-result-heading flex-shrink-0">
                <span className="workflow-result-kicker">Selected gap</span>
                <h4 className="fw-bold mb-0" style={{ color: "#0f0e17" }}>{activeItem.title}</h4>
              </div>
              <div
                className="p-4 rounded-3 workflow-result-reading-card gap-reading-card"
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  color: "#4b5563",
                  flex: "0 1 auto",
                  height: "auto",
                  maxHeight: "100%",
                  overflowY: "auto",
                }}
              >
                <p className="mb-0" style={{ lineHeight: 1.7 }}>{activeItem.gap}</p>
              </div>
            </>
          ) : (
            <p style={{ color: "#4b5563" }}>
              Select a source to view extracted gap.
            </p>
          )}
        </div>
      </div>
        )}
      </div>
      )}
    </div>
  );
}