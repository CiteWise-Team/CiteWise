import { useEffect, useState } from "react";
import { useGroup } from "../../../context/GroupContext";
import { getGapsByGroupAPI } from "../../../api/workflow.gap";
import { RiLoader4Line } from "react-icons/ri";
import { Layers } from "lucide-react";
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
              <div style={{ padding: "2.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "10px" }}>
                <span className="catalyst-btn-spinner-orange" style={{ width: "24px", height: "24px", borderWidth: "2.5px" }} />
                <span style={{ fontSize: "0.82rem", color: "var(--cw-text-muted, #6b7280)", fontWeight: 500, fontFamily: "'Poppins', sans-serif" }}>
                  Loading gaps...
                </span>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-4 px-2 d-flex flex-column align-items-center justify-content-center">
                <div
                  className="d-inline-flex align-items-center justify-content-center mb-2 rounded-3"
                  style={{
                    width: "42px",
                    height: "42px",
                    background: "rgba(234, 88, 12, 0.08)",
                    border: "1px dashed rgba(234, 88, 12, 0.35)",
                    color: "#ea580c",
                  }}
                >
                  <Layers size={20} strokeWidth={2} />
                </div>
                <div className="small fw-bold" style={{ color: "var(--cw-text-primary, #0f0e17)" }}>
                  No gaps extracted yet
                </div>
                <div style={{ fontSize: "11px", color: "var(--cw-text-muted, #6b7280)", marginTop: "4px" }}>
                  Run workflow to discover gaps
                </div>
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