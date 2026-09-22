import { useRef, useState, useEffect } from "react";
import { FaCloudUploadAlt, FaPlay } from "react-icons/fa";
import { RiLoader4Line } from "react-icons/ri";

import { useGroup } from "../../../context/GroupContext.jsx";
import { getExtractedFilesByGroupAPI } from "../../../api/workflow.extractor.js";
import { summarizerAPI, getSummarizerJobStatusAPI } from "../../../api/workflow.api.js";

import { useFeedbackModal } from "../../../hooks/useFeedbackModel";
import FeedbackModal from "../../modals/FeedbackModal";

export default function SummarizerInput({ setResult }) {
  const group_id = useGroup().groupId;

  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const [extractedFiles, setExtractedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningText, setRunningText] = useState("Running...");
  const [selectedInstruction, setSelectedInstruction] = useState(null);
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

  function handleFile(selectedFiles) {
    const picked = selectedFiles[0];
    if (picked) setFile(picked);
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files);
  }

  function openFilePicker() {
    fileInputRef.current.click();
  }

  const toggleInstruction = (id) => {
    setSelectedInstruction((prev) => (prev === id ? null : id));
  };

  const handleRunWorkflow = async () => {
    if (!selectedInstruction) {
      showFeedback({
        type: "error",
        title: "No Selection",
        message: "Please select one extracted file before running the workflow.",
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
      setRunningText("Starting summarizer...");

      const response = await summarizerAPI(selectedInstruction, group_id);

      // Handle async 202 background job
      if (response?.jobId) {
        setRunningText("Summarizing sections with AI...");

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
                message: "Summarization took longer than expected. Please refresh in a moment to check results.",
              });
              return;
            }

            const pollRes = await getSummarizerJobStatusAPI(response.jobId);
            if (pollRes.status === "COMPLETED") {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setRunning(false);
              setResult(pollRes.data);
              showFeedback({
                type: "success",
                title: "Summarization Complete",
                message: "Summarizer workflow finished successfully.",
              });
            } else if (pollRes.status === "FAILED") {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setRunning(false);
              showFeedback({
                type: "error",
                title: "Workflow Failed",
                message: pollRes.error || "Failed to run summarizer workflow.",
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
          title: "Summarization Failed",
          message: response?.message || "Failed to start summarization. No job ID received from server.",
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

  useEffect(() => {
    async function fetchExtractedFiles() {
      try {
        setLoading(true);
        const data = await getExtractedFilesByGroupAPI(group_id);
        setExtractedFiles(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (group_id) fetchExtractedFiles();
  }, [group_id]);

  return (
    <>
      <div
        className="h-100 rounded-4 p-3 workflow-input-card"
        style={{
          backgroundColor: "#1e1e2f",
          border: "1px solid #3a3a55",
          color: "#e4e4f0",
        }}
      >
        {/* HEADER */}
        <div className="d-flex justify-content-between mb-3">
          <div>
            <small style={{ color: "#a1a1b5" }}>
              Choose one extracted document to create a focused summary.
            </small>
          </div>
        </div>

        {/* BODY */}
        <div className="d-flex flex-column gap-4">

          {/* EXTRACTED FILES */}
          <div>
            <small style={{ color: "#a1a1b5" }}>Choose an extracted document</small>

            <div
              className="mt-2 d-flex flex-column gap-2"
              style={{ maxHeight: "200px", overflowY: "auto" }}
            >
              {loading && (
                <div style={{ color: "#a1a1b5" }}>Loading...</div>
              )}

              {!loading && extractedFiles.length === 0 && (
                <div style={{ color: "#a1a1b5" }}>
                  No extracted files found.
                </div>
              )}

              {!loading &&
                extractedFiles.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-3 d-flex align-items-start gap-2"
                    style={{
                      backgroundColor: "#25253a",
                      border: "1px solid #3a3a55",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleInstruction(item.id)}
                  >
                    <input
                      type="radio"
                      checked={selectedInstruction === item.id}
                      readOnly
                      style={{ marginTop: "4px" }}
                    />
                    <div>
                      <div className="small text-white fw-semibold">
                        {item.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "#a1a1b5" }}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* RUN BUTTON */}
          <div className="text-end">
            <button
              onClick={handleRunWorkflow}
              disabled={running}
              className="btn workflow-action-button"
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