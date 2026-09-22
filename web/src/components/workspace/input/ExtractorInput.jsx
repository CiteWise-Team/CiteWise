import { FaCloudUploadAlt, FaPlay, FaTrashAlt } from "react-icons/fa";
import { RiLoader4Line } from "react-icons/ri";
import { extractorAPI, getExtractorJobStatusAPI } from "../../../api/workflow.api";

import { useEffect, useRef, useState } from "react";
import { useGroup } from "../../../context/GroupContext.jsx";

import { useFeedbackModal } from "../../../hooks/useFeedbackModel";
import FeedbackModal from "../../modals/FeedbackModal";

export default function InputPanel({ setResult }) {
  const group_id = useGroup().groupId;
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Running...");
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

    if (!picked) return;

    if (picked.type !== "application/pdf") {
      showFeedback({
        type: "error",
        title: "Invalid File Type",
        message: "Only PDF files are allowed.",
      });
      return;
    }

    setFile(picked);
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files);
  }

  function openFilePicker() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  async function handleRunWorkflow() {
    if (!file) {
      showFeedback({
        type: "error",
        title: "Missing File",
        message: "Please upload a file first.",
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
      setLoading(true);
      setLoadingText("Starting extraction...");

      const response = await extractorAPI(file, group_id);

      // If backend dispatched background extraction job (202 Accepted)
      if (response?.jobId) {
        setLoadingText("Extracting sections with AI...");

        const startTime = Date.now();
        const MAX_POLL_TIME = 180 * 1000; // 3 minutes timeout

        pollTimerRef.current = setInterval(async () => {
          try {
            if (Date.now() - startTime > MAX_POLL_TIME) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setLoading(false);
              showFeedback({
                type: "error",
                title: "Timeout",
                message: "Extraction took longer than expected. Please refresh in a moment to check results.",
              });
              return;
            }

            const pollRes = await getExtractorJobStatusAPI(response.jobId);
            if (pollRes.status === "COMPLETED") {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setLoading(false);
              setResult(pollRes.data);
              showFeedback({
                type: "success",
                title: "Extraction Complete",
                message: "Your document was processed successfully.",
              });
            } else if (pollRes.status === "FAILED") {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
              setLoading(false);
              showFeedback({
                type: "error",
                title: "Extraction Failed",
                message: pollRes.error || "The AI workflow encountered an error processing this paper.",
              });
            }
          } catch (pollErr) {
            console.warn("Polling error:", pollErr);
          }
        }, 2000);

        return;
      }

      if (!response?.jobId) {
        setLoading(false);
        showFeedback({
          type: "error",
          title: "Extraction Failed",
          message: response?.message || "Failed to start extraction. No job ID received from server.",
        });
        return;
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      showFeedback({
        type: "error",
        title: "Server Error",
        message: err.message || "Error running workflow.",
      });
    }
  }

  return (
    <>
      <div
        className="h-100 rounded-4 p-3 workflow-input-card"
        style={{
          backgroundColor: "#1e1e2f",
          border: "1px solid #3a3a55",
          color: "#e4e4f0"
        }}
      >
        {/* Header */}
        <div className="d-flex justify-content-between mb-3">
          <div>
            <small style={{ color: "#a1a1b5" }}>
              Add a PDF to extract its sections and research-ready content.
            </small>
          </div>
        </div>

        {/* Body */}
        <div className="d-flex flex-column gap-4">

          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={openFilePicker}
            className="rounded-4 text-center p-4"
            style={{
              border: "2px dashed #5b5bd6",
              cursor: "pointer",
              backgroundColor: "#25253a"
            }}
          >
            <FaCloudUploadAlt size={28} color="#a5b4fc" />

            <h6 className="fw-bold mt-3 text-white">
              Ready to extract?
            </h6>

            <p style={{ color: "#a1a1b5" }}>
              Drop files or click to browse
            </p>

            <button
              type="button"
              className="btn workflow-action-button mt-2"
              style={{
                backgroundColor: "#5b5bd6",
                color: "#fff",
                border: "none"
              }}
              onClick={(e) => {
                e.stopPropagation();
                openFilePicker();
              }}
            >
              Upload File
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleFile(e.target.files)}
            />
          </div>

          {/* Selected File */}
          {file && (
            <div>
              <small style={{ color: "#a1a1b5" }}>File ready:</small>

              <div
                className="mt-2 p-2 rounded-3 d-flex justify-content-between align-items-center"
                style={{
                  backgroundColor: "#25253a",
                  border: "1px solid #3a3a55"
                }}
              >
                <span className="small text-white">{file.name}</span>

                <button
                  type="button"
                  className="btn btn-sm workflow-icon-action"
                  aria-label="Remove selected file"
                  title="Remove selected file"
                  style={{
                    border: "1px solid #ff6b6b",
                    color: "#ff6b6b",
                    background: "transparent"
                  }}
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  <FaTrashAlt aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* Run Button */}
          <div className="text-end">
            <button
              onClick={handleRunWorkflow}
              disabled={loading}
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
              {loading ? (
                <RiLoader4Line className="spinner-border spinner-border-sm spin-loader" style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <FaPlay className="me-1" />
              )}
              {loading ? loadingText : "Run Workflow"}
            </button>
          </div>

        </div>
      </div>

      <FeedbackModal {...config} onClose={hideFeedback} />
    </>
  );
}