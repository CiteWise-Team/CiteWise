import { useEffect, useState } from "react";
import { FaPlay } from "react-icons/fa";
import { MdInput } from "react-icons/md";

import { useGroup } from "../../../context/GroupContext.jsx";
import { getGapsByGroupAPI } from "../../../api/workflow.gap.js";
import { TopicSuggesterAPI } from "../../../api/workflow.api.js";

import { useFeedbackModal } from "../../../hooks/useFeedbackModel";
import FeedbackModal from "../../modals/FeedbackModal";

export default function TopicSuggesterInput({ setResult }) {
  const { groupId: group_id } = useGroup();

  const [gaps, setGaps] = useState([]);
  const [selectedGaps, setSelectedGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const { config, showFeedback } = useFeedbackModal();

  useEffect(() => {
    async function fetchGaps() {
      try {
        setLoading(true);
        const res = await getGapsByGroupAPI(group_id);
        setGaps(res.data || []);
      } catch (err) {
        console.error("Failed to fetch gaps:", err);
      } finally {
        setLoading(false);
      }
    }

    if (group_id) fetchGaps();
  }, [group_id]);

  const toggleGap = (id) => {
    setSelectedGaps((prev) =>
      prev.includes(id)
        ? prev.filter((g) => g !== id)
        : [...prev, id]
    );
  };

  const handleRunWorkflow = async () => {
    if (selectedGaps.length === 0) {
      showFeedback({
        type: "error",
        title: "No Gaps Selected",
        message: "Please select at least one gap before running the workflow.",
      });
      return;
    }

    try {
      setRunning(true);

      const selectedGapTexts = gaps
        .filter((g) => selectedGaps.includes(g.id))
        .map((g) => g.gap);

      const response = await TopicSuggesterAPI({
        group_id,
        gaps: selectedGapTexts,
      });

      setResult(response.data);

      showFeedback({
        type: "success",
        title: "Topic Suggestions Ready",
        message: "Topic suggestion workflow started successfully.",
      });
    } catch (err) {
      console.error(err);

      showFeedback({
        type: "error",
        title: "Workflow Failed",
        message: err.message || "Failed to run workflow",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <div
        className="h-100 rounded-4 p-3"
        style={{
          backgroundColor: "#1e1e2f",
          border: "1px solid #3a3a55",
          color: "#e4e4f0",
        }}
      >
        <div className="d-flex justify-content-between mb-3">
          <div>
            <h5 className="fw-bold mb-0 text-white">Input</h5>
            <small style={{ color: "#a1a1b5" }}>
              Select gaps for topic suggestion
            </small>
          </div>
          <MdInput size={22} />
        </div>

        <div className="d-flex flex-column gap-4">
          <div>
            <small style={{ color: "#a1a1b5" }}>Available Gaps</small>

            <div
              className="mt-2 d-flex flex-column gap-2"
              style={{ maxHeight: "200px", overflowY: "auto" }}
            >
              {loading && (
                <div style={{ color: "#a1a1b5" }}>Loading gaps...</div>
              )}

              {!loading && gaps.length === 0 && (
                <div style={{ color: "#a1a1b5" }}>
                  No gaps found for this group.
                </div>
              )}

              {!loading &&
                gaps.map((gap) => (
                  <div
                    key={gap.id}
                    className="p-2 rounded-3 d-flex align-items-start gap-2"
                    style={{
                      backgroundColor: "#25253a",
                      border: "1px solid #3a3a55",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleGap(gap.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGaps.includes(gap.id)}
                      readOnly
                      style={{ marginTop: "4px" }}
                    />
                    <div>
                      <div className="small text-white fw-semibold">
                        {gap.title || "Untitled Gap"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#a1a1b5" }}>
                        {gap.gap}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="text-end">
            <button
              onClick={handleRunWorkflow}
              disabled={running}
              className="btn"
              style={{
                backgroundColor: "#5b5bd6",
                color: "#fff",
                border: "none",
              }}
            >
              <FaPlay className="me-1" />
              {running ? "Running..." : "Run Workflow"}
            </button>
          </div>
        </div>
      </div>

      <FeedbackModal {...config} />
    </>
  );
}