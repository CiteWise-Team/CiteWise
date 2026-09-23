import { useEffect, useState } from "react";
import { FaArrowRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useGroup } from "../../../context/GroupContext";
import { getTopicsByGroupIdAPI } from "../../../api/workflow.topic";
import { RiLoader4Line, RiQuestionLine } from "react-icons/ri";
import { apiFetch } from "../../../api/http";

export default function TopicSuggesterOutput({ result, onComplete }) {
  const group_id = useGroup().groupId;
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    async function fetchTopics() {
      if (!group_id) return;

      setLoading(true);
      try {
        const res = await getTopicsByGroupIdAPI(group_id);
        const data = res.data || [];
        setItems(data);
        if (data.length > 0) onComplete?.();

        if (result?.id) {
          setActiveId(result.id);
        } else if (data.length > 0) {
          setActiveId(data[0].id);
        }
      } catch (err) {
        console.error("Error fetching topics:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTopics();
  }, [group_id, result]);

  const handleDraftIntroduction = async () => {
    if (!activeItem) return;
    setImporting(true);
    try {
      // Clear only this group's previous CiteWise keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(`citewise.${group_id}.`)) localStorage.removeItem(key);
      }

      const { res, data: payload } = await apiFetch("/api/catalyst/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: group_id, title: activeItem.title, rationale: activeItem.rationale }),
      });

      if (!res.ok || !payload?.success) {
        if (res.status === 401) {
          alert("Your session has expired. Please log in again.");
          navigate("/login");
          return;
        }
        alert(payload?.message || payload?.error || "Failed to import workspace into CiteWise.");
        return;
      }

      const { sessionId, title: savedTitle, rationale: savedRationale, gaps } = payload.data;
      localStorage.setItem(`citewise.${group_id}.sessionId`, sessionId);
      localStorage.setItem(`citewise.${group_id}.catalystData`, JSON.stringify({ title: savedTitle, rationale: savedRationale, gaps }));
      
      navigate(`/citewise/${group_id}`);
    } catch (err) {
      alert("Could not connect to CiteWise: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const activeItem = items.find((p) => p.id === activeId);

  return (
    <div className="h-100 d-flex flex-column rounded-4 workflow-result-card topic-result-card" style={{ minHeight: 0 }}>
      <div className="workflow-split-result-body d-flex h-100" style={{ minHeight: 0, overflow: "visible", gap: 0 }}>
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
              Suggested Topics ({items.length})
            </p>
          </div>

          <div className="workflow-result-sidebar-list flex-grow-1" style={{ overflowY: "auto", minHeight: 0, paddingRight: "4px" }}>
            {loading ? (
              <div className="text-center mt-5">
                <RiLoader4Line className="fs-1 mb-2 spin-loader" style={{ color: "#ea580c" }} />
                <p style={{ color: "#4b5563" }}>Loading topics...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center mt-5">
                <RiQuestionLine className="fs-1 mb-2" style={{ color: "#9ca3af" }} />
                <p style={{ color: "#4b5563" }}>
                  No topics generated yet.
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

        {/* RIGHT DETAIL */}
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
                <span className="workflow-result-kicker">Selected topic</span>
                <h4 className="fw-bold mb-0" style={{ color: "#0f0e17" }}>{activeItem.title}</h4>
              </div>
              <div
                className="p-4 rounded-3 workflow-result-reading-card flex-grow-1"
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  color: "#4b5563",
                  minHeight: 0,
                  overflowY: "auto",
                }}
              >
                <p className="mb-0" style={{ lineHeight: 1.7 }}>
                  {activeItem.rationale}
                </p>
              </div>
              <div className="topic-detail-actions d-flex justify-content-end align-items-center mt-3 pt-1 flex-shrink-0">
                <div className="topic-action-btn-wrap">
                  <span className="topic-citewise-tooltip" role="tooltip">
                    Open CiteWise to start drafting your introduction.
                  </span>
                  <button
                    type="button"
                    className="workflow-action-button topic-draft-btn"
                    data-guide="workflow-draft-citewise"
                    aria-label="Draft in CiteWise"
                    onClick={handleDraftIntroduction}
                    disabled={importing}
                  >
                    <span>{importing ? "Opening..." : "Draft in CiteWise"}</span>
                    <FaArrowRight size={13} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p style={{ color: "#4b5563" }}>
              Select a topic to view details.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}