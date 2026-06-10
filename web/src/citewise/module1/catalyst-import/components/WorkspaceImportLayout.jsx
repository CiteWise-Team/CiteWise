import { useState, useEffect, useCallback, useRef } from "react";  // ← ADDED useCallback, useRef
import ImportHeaderBar from "./ImportHeaderBar";
import DataDisplayGrid from "./DataDisplayGrid";
import GapWorkshop from "./GapWorkshop";
import DragDropZone from "../../rrl-upload/components/DragDropZone";
import SelectedFilesList from "../../rrl-upload/components/SelectedFilesList";
import UploadAllButton from "../../rrl-upload/components/UploadAllButton";
import UploadStatusBar from "../../rrl-upload/components/UploadStatusBar";

const MAX_FILE_MB = 20;
const DUPLICATE_REMOVE_DELAY = 3000;

function buildFileKey(file) {
  return `${file.name.toLowerCase()}-${file.size}`;
}

export default function WorkspaceImportLayout({ groupId, onImportSuccess, onProceed }) {
  // Group-scoped localStorage keys so each workspace keeps independent data.
  const STORAGE_SESSION_KEY  = `citewise.${groupId}.sessionId`;
  const STORAGE_CATALYST_KEY = `citewise.${groupId}.catalystData`;

  // ── CATalyst Import State ──────────────────────────────────────
  const [workspaceId, setWorkspaceId] = useState("");
  const [catalystData, setCatalystData] = useState(() => {
    const stored = localStorage.getItem(STORAGE_CATALYST_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch (err) {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasAttempted, setHasAttempted] = useState(false);

  // ── RRL Upload State ───────────────────────────────────────────
  const [sessionId, setSessionId] = useState(
    () => localStorage.getItem(STORAGE_SESSION_KEY) || ""
  );
  const [fileQueue, setFileQueue] = useState([]);
  const [uploadState, setUploadState] = useState("ready");
  const [statusMessage, setStatusMessage] = useState("Ready to upload");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [duplicateToast, setDuplicateToast] = useState({ show: false, message: "" });

  const triggerDuplicateToast = useCallback((filenames) => {
    if (!filenames?.length) return;
    let msg = "";
    if (filenames.length === 1) {
      msg = `"${filenames[0]}" will be removed from the list shortly.`;
    } else {
      msg = `${filenames.length} duplicate files will be removed shortly.`;
    }
    setDuplicateToast({ show: true, message: msg });
    setTimeout(() => {
      setDuplicateToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  // Ref so appendFiles always reads the latest uploaded names without stale closure
  const uploadedFileNamesRef = useRef(new Set());

  // Fetch already-uploaded file names from the backend on mount and after uploads
  const fetchUploadedFiles = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/v1/documents/session/${sessionId}`, {
        headers: { "X-Session-Id": sessionId },
      });
      if (res.ok) {
        const docs = await res.json();
        uploadedFileNamesRef.current = new Set(
          docs.map((d) => d.fileName?.toLowerCase()).filter(Boolean)
        );
      }
    } catch (err) {
      // ignore fetch errors
    }
  }, [sessionId]);

  useEffect(() => {
    fetchUploadedFiles();
  }, [fetchUploadedFiles]);

  // ✅ Restores session on page refresh
  useEffect(() => {
    const savedSessionId = localStorage.getItem(STORAGE_SESSION_KEY);
    const savedCatalystData = localStorage.getItem(STORAGE_CATALYST_KEY);
    
    if (savedSessionId && !sessionId) {
      setSessionId(savedSessionId);
      console.log("✅ Restored session ID:", savedSessionId);
    }
    
    if (savedCatalystData && !catalystData) {
      try {
        setCatalystData(JSON.parse(savedCatalystData));
        console.log("✅ Restored catalyst data");
      } catch (err) {
        console.error("Failed to restore catalyst data:", err);
      }
    }
  }, []); // Runs once on component mount

  // Auto-remove duplicate items from the queue after a delay
  useEffect(() => {
    const dupeItems = fileQueue.filter((item) => item.status === "duplicate");
    if (dupeItems.length === 0) return;

    const timer = setTimeout(() => {
      setFileQueue((prev) => prev.filter((item) => item.status !== "duplicate"));
    }, DUPLICATE_REMOVE_DELAY);

    return () => clearTimeout(timer);
  }, [fileQueue]);

  const handleImport = async () => {
    const trimmed = workspaceId.trim();
    if (!trimmed) {
      setError("Workspace ID is required.");
      return;
    }
    
    // ✅ CHECK: Do we already have a session ID?
    const existingSessionId = localStorage.getItem(STORAGE_SESSION_KEY);
    if (existingSessionId) {
      console.log("✅ Using existing session ID:", existingSessionId);
      console.log("   Not creating a new one!");
      
      // Just refresh the catalyst data, don't create new session
      try {
        const response = await fetch(`/api/catalyst/${encodeURIComponent(trimmed)}`);
        const payload = await response.json();
        if (payload?.success) {
          const catalystData = {
            title: payload.data?.title,
            rationale: payload.data?.rationale,
            gaps: payload.data?.gaps
          };
          setCatalystData(catalystData);
          localStorage.setItem(STORAGE_CATALYST_KEY, JSON.stringify(catalystData));
        }
      } catch (err) {
        setError(err.message);
      }
      setIsLoading(false);
      return;
    }
    
    // Only create NEW session if NO existing session
    setHasAttempted(true);
    setError("");
    setCatalystData(null);
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/catalyst/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: trimmed })
      });
      
      const payload = await response.json();
      
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Unable to import CATalyst workspace.");
      }
      
      const catalystResponseData = {
        title: payload.data?.title,
        rationale: payload.data?.rationale,
        gaps: payload.data?.gaps
      };
      
      setCatalystData(catalystResponseData);
      localStorage.setItem(STORAGE_CATALYST_KEY, JSON.stringify(catalystResponseData));
      
      const newSessionId = payload.data?.sessionId;
      if (newSessionId) {
        localStorage.setItem(STORAGE_SESSION_KEY, newSessionId);
        setSessionId(newSessionId);
        onImportSuccess?.(newSessionId);
        console.log("✅ New session created:", newSessionId);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };


  const MAX_FILES = 5;

  // ── RRL Upload ─────────────────────────────────────────────────
  const appendFiles = (incomingFiles) => {
    if (!incomingFiles?.length) return;

    // Count how many valid (non-duplicate, non-invalid) files are already queued.
    const currentValid = fileQueue.filter((i) => i.status === "queued" || i.status === "uploading").length;
    const slotsLeft = MAX_FILES - currentValid;

    if (slotsLeft <= 0) {
      triggerDuplicateToast([`Maximum ${MAX_FILES} files allowed per upload batch.`]);
      return;
    }

    // Silently cap — take only as many files as there are slots left.
    const capped = Array.from(incomingFiles).slice(0, slotsLeft);
    const skipped = Array.from(incomingFiles).length - capped.length;
    if (skipped > 0) {
      triggerDuplicateToast([`Only ${capped.length} of ${Array.from(incomingFiles).length} files added — limit is ${MAX_FILES} per batch.`]);
    }

    setUploadState("ready");
    setStatusMessage("Ready to upload");
    const dupesList = [];

    // Pre-emptively detect duplicates synchronously so we can trigger the toast immediately
    const tempKeys = new Set(fileQueue.map((i) => i.key));
    const tempNames = new Set(fileQueue.map((i) => i.name.toLowerCase()));

    capped.forEach((file) => {
      const key = buildFileKey(file);
      const nameLower = file.name.toLowerCase();

      if (uploadedFileNamesRef.current.has(nameLower)) {
        dupesList.push(file.name);
      } else if (tempKeys.has(key) || tempNames.has(nameLower)) {
        dupesList.push(file.name);
      } else {
        tempKeys.add(key);
        tempNames.add(nameLower);
      }
    });

    if (dupesList.length > 0) {
      triggerDuplicateToast(dupesList);
    }

    setFileQueue((prev) => {
      const next = [...prev];
      const seenKeys = new Set(prev.map((i) => i.key));
      const seenNames = new Set(prev.map((i) => i.name.toLowerCase()));

      capped.forEach((file) => {
        const key = buildFileKey(file);
        const nameLower = file.name.toLowerCase();
        const isPdf = file.type === "application/pdf" || nameLower.endsWith(".pdf");

        // Already uploaded to backend — mark as duplicate in queue (will auto-remove)
        if (uploadedFileNamesRef.current.has(nameLower)) {
          next.push({
            id: `${key}-${Math.random().toString(16).slice(2)}`,
            key,
            file,
            name: file.name,
            size: file.size,
            status: "duplicate",
            message: "Already uploaded previously",
          });
          return;
        }

        // Already in the current queue — mark as duplicate (will auto-remove)
        if (seenKeys.has(key) || seenNames.has(nameLower)) {
          next.push({
            id: `${key}-${Math.random().toString(16).slice(2)}`,
            key,
            file,
            name: file.name,
            size: file.size,
            status: "duplicate",
            message: "Already in queue",
          });
          return;
        }

        let status = "queued";
        let message = "Ready for upload";
        if (!isPdf) {
          status = "invalid";
          message = "Unsupported file type";
        } else if (file.size > MAX_FILE_MB * 1024 * 1024) {
          status = "invalid";
          message = `Exceeds ${MAX_FILE_MB}MB`;
        }

        seenKeys.add(key);
        seenNames.add(nameLower);
        next.push({
          id: `${key}-${Math.random().toString(16).slice(2)}`,
          key,
          file,
          name: file.name,
          size: file.size,
          status,
          message,
        });
      });
      return next;
    });
  };

  const removeFileItem = (id) => setFileQueue((prev) => prev.filter((item) => item.id !== id));

  const handleUpload = async () => {
    const readyFiles = fileQueue.filter((item) => item.status === "queued");
    if (!sessionId.trim()) {
      setUploadState("error");
      setStatusMessage("Import CATalyst data first to get a session ID.");
      return;
    }
    if (!readyFiles.length) {
      setUploadState("error");
      setStatusMessage("Add at least one valid PDF before uploading.");
      return;
    }
    setUploadState("uploading");
    setStatusMessage("Uploading...");
    setFileQueue((prev) =>
      prev.map((item) =>
        item.status === "queued" ? { ...item, status: "uploading", message: "Uploading..." } : item
      )
    );
    const formData = new FormData();
    readyFiles.forEach((item) => formData.append("files", item.file));
    try {
      const response = await fetch("/api/rrl/upload", {
        method: "POST",
        headers: { "X-Session-Id": sessionId.trim() },
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Upload failed.");
      const results = payload?.data?.results || [];
      const accepted = payload?.data?.acceptedFiles || 0;
      const failed = payload?.data?.failedFiles || 0;

      setUploadState(failed > 0 ? "warning" : "success");
      setStatusMessage(
        failed > 0 ? `${accepted} uploaded, ${failed} failed.` : `${accepted} file(s) uploaded.`
      );

      const serverDupes = [];
      setFileQueue((prev) =>
        prev.map((item) => {
          if (item.status !== "uploading") return item;
          const match = results.find((r) => r.fileName === item.name);
          if (!match) return { ...item, status: "failed", message: "No response received" };
          
          // Server rejected as duplicate → show as duplicate (will auto-remove)
          const msg = match.message?.toLowerCase() || "";
          const isDupe = !match.success && (msg.includes("already uploaded") || msg.includes("duplicate"));
          if (isDupe) {
            serverDupes.push(item.name);
          }
          return {
            ...item,
            status: isDupe ? "duplicate" : match.success ? "uploaded" : "failed",
            message: isDupe ? "Duplicate — removing from queue" : match.message,
          };
        })
      );

      if (serverDupes.length > 0) {
        triggerDuplicateToast(serverDupes);
      }

      // Refresh ref so future selections detect newly uploaded files immediately
      await fetchUploadedFiles();

      // Proceed to AI Assessment tab if at least one file was successfully accepted
      if (accepted > 0) {
        setShowSuccessToast(true);
        setTimeout(() => {
          onProceed?.();
        }, 2200);
      }
    } catch (err) {
      setUploadState("error");
      setStatusMessage(err.message);
      setFileQueue((prev) =>
        prev.map((item) =>
          item.status === "uploading" ? { ...item, status: "failed", message: "Network error" } : item
        )
      );
    }
  };

  const resetSession = () => {
    if (confirm("⚠️ This will clear all your uploaded documents and session data. Are you sure?")) {
      clearCiteWiseSessionStorage();
      setSessionId("");
      setCatalystData(null);
      setFileQueue([]);
      window.location.reload();
    }
  };

  const clearCiteWiseSessionStorage = () => {
    // Only clear THIS group's data — other workspaces are untouched.
    const groupPrefix = `citewise.${groupId}.`;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(groupPrefix)) { localStorage.removeItem(key); continue; }
      // Also clear session-scoped keys that belong to this group's session.
      if (sessionId && (
        key === `citewise_chosen_gap_${sessionId}` ||
        key === `citewise_approved_docs_${sessionId}` ||
        key === `citewise_draft_${sessionId}` ||
        key.startsWith(`citewise.gaps.${sessionId}`) ||
        key.startsWith(`citewise.instructions.${sessionId}`) ||
        key.startsWith(`citewise.scorePrefs.${sessionId}`) ||
        key.startsWith(`citewise.rrlUsage.${sessionId}`) ||
        key.startsWith(`citewise.draftVersions.${sessionId}`) ||
        key.startsWith(`citewise.chosenTitle.${sessionId}`)
      )) {
        localStorage.removeItem(key);
      }
    }
    sessionStorage.clear();
  };

  const readyCount = fileQueue.filter((i) => i.status === "queued").length;
  const totalCount = fileQueue.length;

  return (
    <div style={{ maxWidth: 1400, width: "100%", margin: "0 auto", padding: "2rem 2.5rem 3rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
      {styleInject}

      {duplicateToast.show && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 10000,
          background: "rgba(30, 28, 25, 0.9)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(91, 91, 214, 0.4)",
          borderRadius: "12px",
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4), 0 0 15px rgba(91, 91, 214, 0.1)",
          animation: "slideInToast 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          maxWidth: "400px",
        }}>
          <div style={{
            background: "rgba(91, 91, 214, 0.15)",
            border: "1px solid #5b5bd6",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5b5bd6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "#5b5bd6",
            }}>
              Duplicate File Detected
            </span>
            <span style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.8rem",
              color: "rgba(240, 236, 230, 0.8)",
              lineHeight: "1.4",
            }}>
              {duplicateToast.message}
            </span>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(14, 12, 10, 0.75)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          animation: "fadeInToast 0.3s ease-out forwards",
        }}>
          <div style={{
            background: "#1e1e2f",
            border: "1px solid rgba(91, 91, 214, 0.25)",
            borderRadius: "24px",
            padding: "2.5rem 3rem",
            maxWidth: "480px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(91, 91, 214, 0.15)",
            animation: "scaleInToast 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "rgba(91, 91, 214, 0.1)",
              border: "2px solid #5b5bd6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              boxShadow: "0 0 20px rgba(91, 91, 214, 0.2)",
              animation: "pulseRing 2s infinite",
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5b5bd6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" style={{
                  strokeDasharray: 50,
                  strokeDashoffset: 50,
                  animation: "drawCheckmark 0.6s ease-out 0.2s forwards",
                }} />
              </svg>
            </div>

            <h3 style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: "1.5rem",
              color: "#e4e4f0",
              margin: "0 0 0.5rem 0",
              letterSpacing: "0.01em",
            }}>
              Upload Complete
            </h3>

            <p style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.95rem",
              color: "rgba(240, 236, 230, 0.7)",
              lineHeight: "1.6",
              margin: "0 0 1.75rem 0",
            }}>
              Your research literature has been successfully synchronized. Preparing the validation dashboard.
            </p>

            <div style={{
              width: "100%",
              height: "4px",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "2px",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                background: "linear-gradient(90deg, #5b5bd6, #5b5bd6)",
                width: "0%",
                borderRadius: "2px",
                animation: "fillProgress 2.2s linear forwards",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────── */}
      <div>
        <h1 style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1.5rem", color: "#e4e4f0", letterSpacing: "-0.01em" }}>
          Data Import
        </h1>
        <p style={{ margin: "4px 0 0", fontFamily: "'Poppins', sans-serif", fontSize: "0.875rem", color: "#a1a1b5" }}>
          Connect your CATalyst workspace, upload RRL documents, then refine your research gap.
        </p>
      </div>

      {/* ── Two-column grid ─────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: catalystData ? "1fr 420px" : "1fr",
          gap: "2rem",
          alignItems: "start",
        }}
      >
        {/* LEFT COLUMN — CATalyst import + RRL upload */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* CATalyst Data Import */}
          <div style={card}>
            <div style={cardHeader}>
              <div>
                <span style={cardTitle}>CATalyst Workspace</span>
                {catalystData && (
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#a1a1b5", fontFamily: "'Poppins', sans-serif" }}>
                    Loaded — title, rationale and gaps imported.
                  </p>
                )}
              </div>
              {!catalystData && (
                <ImportHeaderBar
                  workspaceId={workspaceId}
                  onWorkspaceIdChange={setWorkspaceId}
                  onImport={handleImport}
                  isLoading={isLoading}
                />
              )}
            </div>

            {!catalystData && (
              <div style={{ padding: "2.5rem 2rem", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(91,91,214,0.1)", border: "1px solid rgba(91,91,214,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b5bd6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p style={{ color: "#a1a1b5", fontFamily: "'Poppins', sans-serif", fontSize: "0.875rem", margin: 0 }}>
                  Enter your CATalyst workspace ID above to load your research data.
                </p>
              </div>
            )}

            <DataDisplayGrid
              catalystData={catalystData}
              isLoading={isLoading}
              error={error}
              hasAttempted={hasAttempted}
              sessionId={sessionId}
            />
          </div>

          {/* RRL Document Upload */}
          <div style={card}>
            <div style={cardHeader}>
              <div>
                <span style={cardTitle}>RRL Document Upload</span>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#a1a1b5", fontFamily: "'Poppins', sans-serif" }}>
                  Upload PDF research papers to assess against your research gap.
                </p>
              </div>
            </div>

            <div style={{ padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                <DragDropZone onFilesAdded={appendFiles} maxFileMB={MAX_FILE_MB} />

                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.15)",
                    border: "1px solid #3a3a55",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.875rem",
                    minHeight: 200,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={selectedLabel}>Queue</span>
                    {totalCount > 0 && (
                      <span style={{ fontSize: "0.72rem", color: "#a1a1b5", fontFamily: "'Poppins', sans-serif" }}>
                        {totalCount} file{totalCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, borderRadius: "8px", overflow: "hidden" }}>
                    <SelectedFilesList files={fileQueue} onRemove={removeFileItem} />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                <UploadAllButton onClick={handleUpload} isUploading={uploadState === "uploading"} />
                <div style={{ flex: 1 }}>
                  <UploadStatusBar
                    readyCount={readyCount}
                    totalCount={totalCount}
                    statusMessage={statusMessage}
                    uploadState={uploadState}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Gap Workshop (only shown after CATalyst data loaded) */}
        {catalystData && (
          <div style={{ position: "sticky", top: "80px" }}>
            <GapWorkshop sessionId={sessionId} catalystData={catalystData} />
          </div>
        )}
      </div>
    </div>
  );
}

// Style injection
const styleInject = (
  <style dangerouslySetInnerHTML={{
    __html: `
    @keyframes cardFadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeInToast {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleInToast {
      from { opacity: 0; transform: scale(0.9) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes drawCheckmark {
      to { stroke-dashoffset: 0; }
    }
    @keyframes pulseRing {
      0% { box-shadow: 0 0 0 0 rgba(91, 91, 214, 0.4); }
      70% { box-shadow: 0 0 0 12px rgba(91, 91, 214, 0); }
      100% { box-shadow: 0 0 0 0 rgba(91, 91, 214, 0); }
    }
    @keyframes fillProgress {
      from { width: 0%; }
      to { width: 100%; }
    }
    @keyframes slideInToast {
      from { opacity: 0; transform: translateX(50px) scale(0.95); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
  `}} />
);

// ── Shared style tokens ──────────────────────────────────────────
const card = {
  background: "#1e1e2f",
  border: "1px solid #3a3a55",
  borderRadius: "16px",
  overflow: "hidden",
  animation: "cardFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
};

const cardHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "1.125rem 1.5rem",
  borderBottom: "1px solid #3a3a55",
  gap: "1rem",
  background: "rgba(0, 0, 0, 0.15)",
};

const cardTitle = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 700,
  fontSize: "1.05rem",
  color: "#5b5bd6",
  letterSpacing: "0.01em",
  flexShrink: 0,
};

const selectedLabel = {
  fontSize: "0.75rem",
  fontWeight: "700",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#5b5bd6",
  fontFamily: "'Poppins', sans-serif",
};
