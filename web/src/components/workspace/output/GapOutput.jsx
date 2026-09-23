import { useEffect, useState } from "react";
import { useGroup } from "../../../context/GroupContext";
import { getGapsByGroupAPI } from "../../../api/workflow.gap";
import { RiLoader4Line, RiQuestionLine } from "react-icons/ri";

export default function ExtractorOutput({ result, onComplete }) {
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
    <div className="h-100 d-flex flex-column rounded-4 workflow-result-card gap-result-card" style={{ minHeight: 0 }}>
      <div className="workflow-split-result-body d-flex h-100" style={{ minHeight: 0, gap: 0 }}>
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
              <div className="text-center mt-5">
                <RiLoader4Line className="fs-1 mb-2 spin-loader" style={{ color: "#ea580c" }} />
                <p style={{ color: "#4b5563" }}>Loading gaps...</p>
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
                    className={`p-3 mb-2 rounded-3 workflow-result-list-item${isSelected ? " is-selected" : ""}`}
                    style={{
                      cursor: "pointer",
                      backgroundColor: isSelected ? "#fff7ed" : "#ffffff",
                      border: isSelected ? "1px solid #ea580c" : "1px solid #e5e7eb",
                      overflow: "hidden",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <h6
                      className="fw-bold mb-0 text-truncate"
                      style={{ color: isSelected ? "#ea580c" : "#0f0e17" }}
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
            overflow: "hidden",
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
    </div>
  );
}