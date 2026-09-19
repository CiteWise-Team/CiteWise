import { useEffect, useState, useRef } from "react";
import { FaPlay } from "react-icons/fa";
import { MdInput } from "react-icons/md";
import { RiLoader4Line } from "react-icons/ri";

import { useGroup } from "../../../context/GroupContext.jsx";
import { getGapsByGroupAPI } from "../../../api/workflow.gap.js";
import { TopicSuggesterAPI, getTopicJobStatusAPI } from "../../../api/workflow.api.js";

import { useFeedbackModal } from "../../../hooks/useFeedbackModel";
import FeedbackModal from "../../modals/FeedbackModal";

export default function TopicSuggesterInput({ setResult }) {
  const { groupId: group_id } = useGroup();

  const [gaps, setGaps] = useState([]);
  const [selectedGaps, setSelectedGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningText, setRunningText] = useState("Running...");
  const pollTimerRef = useRef(null);

  const { config, showFeedback, hideFeedback } = useFeedbackModal();

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

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

    if (!group_id) {
      showFeedback({
        type: "error",
        title: "Missing Workspace",
        message: "No active workspace selected. Please select a workspace first.",
      });
      return;
    }

    try {
      setRunning(true);
      setRunningText("Starting topic discovery...");

      const selectedGapTexts = gaps
        .filter((g) => selectedGaps.includes(g.id))
        .map((g) => g.gap);

      const response = await TopicSuggesterAPI({
        group_id,
        gaps: selectedGapTexts,
      });

      // Handle async 202 background job
      if (response?.jobId) {
        setRunningText("Generating topic recommendations with AI...");

        const startTime = Date.now();
        const MAX_POLL_TIME = 180 * 1000; // 3 minutes timeout

        pollTimerRef.current = setInterval(async () => {
          try {
            if (Date.now() - startTime > MAX_POLL_TIME) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setRunning(false);
              showFeedback({
                type: "error",
                title: "Timeout",
                message: "Topic suggestion took longer than expected. Please refresh in a moment to check results.",
              });
              return;
            }

            const pollRes = await getTopicJobStatusAPI(response.jobId);
            if (pollRes.status === "COMPLETED") {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setRunning(false);
              setResult(pollRes.data);
              showFeedback({
                type: "success",
                title: "Topic Suggestions Ready",
                message: "Topic suggestion workflow finished successfully.",
              });
            } else if (pollRes.status === "FAILED") {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setRunning(false);
              showFeedback({
                type: "error",
                title: "Workflow Failed",
                message: pollRes.error || "Failed to run topic suggestion workflow.",
              });
            }
          } catch (pollErr) {
            console.warn("Polling error:", pollErr);
          }
        }, 2000);

        return;
      }

      if (!response?.jobId) {
        setRunning(false);
        showFeedback({
          type: "error",
          title: "Topic Suggestion Failed",
          message: response?.message || "Failed to start topic suggestion. No job ID received from server.",
        });
        return;
      }
    } catch (err) {
      console.error(err);
      setRunning(false);
      showFeedback({
        type: "error",
        title: "Workflow Failed",
        message: err.message || "Failed to run workflow",
      });
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
        <div className="d-flex justify-content-between align-items-start mb-3">
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
              className="topic-gaps-list mt-2 d-flex flex-column gap-2"
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
                    className="topic-gap-row p-2 rounded-3 d-flex align-items-start gap-2"
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
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {running ? (
                <RiLoader4Line className="spinner-border spinner-border-sm spin-loader" style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <FaPlay className="me-1" />
              )}
              {running ? runningText : "Run Workflow"}
            </button>
          </div>
        </div>
      </div>

      <FeedbackModal {...config} onClose={hideFeedback} />
    </>
  );
}