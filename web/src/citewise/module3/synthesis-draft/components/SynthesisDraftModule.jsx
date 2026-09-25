import { useState, useEffect } from "react";
import SynthesisControlPanel from "./SynthesisControlPanel";
import ApprovedSourceList from "./ApprovedSourceList";
import GeneratedDraftDisplay from "./GeneratedDraftDisplay";
import ExportDraftDropdown from "./ExportDraftDropdown";
import InstructionsPanel from "./InstructionsPanel";
import SourceUsageTransparency from "./SourceUsageTransparency";
import DraftVersionHistory from "./DraftVersionHistory";
import * as store from "../../../lib/citewiseStore";
import { apiFetch } from "../../../../api/http";

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let c = index;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const writeUint16 = (target, value) => {
  target.push(value & 0xff, (value >>> 8) & 0xff);
};

const writeUint32 = (target, value) => {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
};

const createZipBlob = (files) => {
  const encoder = new TextEncoder();
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;

  files.forEach(({ name, content }) => {
    const nameBytes = encoder.encode(name);
    const contentBytes = encoder.encode(content);
    const checksum = crc32(contentBytes);
    const localHeader = [];

    writeUint32(localHeader, 0x04034b50);
    writeUint16(localHeader, 20);
    writeUint16(localHeader, 0);
    writeUint16(localHeader, 0);
    writeUint16(localHeader, 0);
    writeUint16(localHeader, 0);
    writeUint32(localHeader, checksum);
    writeUint32(localHeader, contentBytes.length);
    writeUint32(localHeader, contentBytes.length);
    writeUint16(localHeader, nameBytes.length);
    writeUint16(localHeader, 0);

    chunks.push(new Uint8Array(localHeader), nameBytes, contentBytes);

    const centralHeader = [];
    writeUint32(centralHeader, 0x02014b50);
    writeUint16(centralHeader, 20);
    writeUint16(centralHeader, 20);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint32(centralHeader, checksum);
    writeUint32(centralHeader, contentBytes.length);
    writeUint32(centralHeader, contentBytes.length);
    writeUint16(centralHeader, nameBytes.length);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint32(centralHeader, 0);
    writeUint32(centralHeader, offset);
    centralDirectory.push(new Uint8Array(centralHeader), nameBytes);

    offset += localHeader.length + nameBytes.length + contentBytes.length;
  });

  const centralDirectorySize = centralDirectory.reduce((sum, chunk) => sum + chunk.length, 0);
  const endRecord = [];
  writeUint32(endRecord, 0x06054b50);
  writeUint16(endRecord, 0);
  writeUint16(endRecord, 0);
  writeUint16(endRecord, files.length);
  writeUint16(endRecord, files.length);
  writeUint32(endRecord, centralDirectorySize);
  writeUint32(endRecord, offset);
  writeUint16(endRecord, 0);

  return new Blob([...chunks, ...centralDirectory, new Uint8Array(endRecord)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
};

const createDocxBlob = (text) => {
  const paragraphs = String(text || "")
    .split(/\n/)
    .map((line) => {
      const content = line.trim() ? escapeXml(line) : "";
      return `<w:p><w:r><w:t xml:space="preserve">${content}</w:t></w:r></w:p>`;
    })
    .join("");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;

  return createZipBlob([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    },
    { name: "word/document.xml", content: documentXml },
  ]);
};

const downloadBlob = (blob, filename) => {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function SynthesisDraftModule({ sessionId, onStepChange }) {
  const [approvedDocuments, setApprovedDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generationStatus, setGenerationStatus] = useState("idle");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [statusText, setStatusText] = useState("Ready to Generate");
  const [generatedContent, setGeneratedContent] = useState("");
  const [references, setReferences] = useState([]);
  const [citationsUsed, setCitationsUsed] = useState([]);
  const [citationIntegrity, setCitationIntegrity] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const DRAFT_STORAGE_KEY = `citewise_draft_${sessionId}`;
  const DOCS_STORAGE_KEY = `citewise_approved_docs_${sessionId}`;

  useEffect(() => {
    if (sessionId) {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setGeneratedContent(draft.content || "");
          setReferences(draft.references || []);
          if (draft.content && draft.content.length > 0) {
            setGenerationStatus("complete");
          }
          console.log("Loaded saved draft from localStorage");
        } catch (err) {
          console.error("Error loading saved draft:", err);
        }
      }
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId && generatedContent) {
      const draftToSave = {
        content: generatedContent,
        references: references,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftToSave));
      console.log("Saved draft to localStorage");
    }
  }, [generatedContent, references, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const loadApprovedDocuments = async () => {
      setLoading(true);

      let initialDocs = [];
      const storedApproved = localStorage.getItem(DOCS_STORAGE_KEY) || sessionStorage.getItem(DOCS_STORAGE_KEY);

      if (storedApproved) {
        try {
          initialDocs = JSON.parse(storedApproved);
          if (Array.isArray(initialDocs) && initialDocs.length > 0) {
            setApprovedDocuments(initialDocs);
          }
        } catch (err) {
          console.error("Error parsing stored approved docs:", err);
        }
      }

      try {
        const { res: response, data } = await apiFetch(`/api/v1/documents/session/${sessionId}`, {
          headers: {
            'X-Session-Id': sessionId,
          }
        });

        if (response.ok && Array.isArray(data)) {
          const rrlUsage = store.getRrlUsage(sessionId) || {};
          const rrlExcludedIds = new Set(Object.keys(rrlUsage).filter(id => rrlUsage[id]?.usage === 'exclude'));

          const apiApproved = data.filter(doc => {
            const isApproved = doc.approved === true || doc.approved === 1 || doc.approved === "true";
            return isApproved && !rrlExcludedIds.has(String(doc.id));
          });

          const merged = apiApproved.map(doc => {
            const localDoc = (initialDocs || []).find(d => String(d.id) === String(doc.id) || String(d.name) === String(doc.fileName));
            return {
              id: doc.id,
              name: doc.fileName || doc.name || localDoc?.name || "Untitled.pdf",
              title: doc.title || localDoc?.title || null,
              size: doc.size || localDoc?.size || "-",
              relevancyScore: doc.relevancyScore ?? localDoc?.relevancyScore ?? 0,
              approved: true,
            };
          });

          setApprovedDocuments(merged);
          localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(merged));
        }
      } catch (err) {
        console.error("Error fetching documents:", err);
      } finally {
        setLoading(false);
      }
    };

    loadApprovedDocuments();
  }, [sessionId]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === DOCS_STORAGE_KEY && e.newValue) {
        try {
          const newDocs = JSON.parse(e.newValue);
          console.log("Storage updated - replacing approved documents:", newDocs);
          setApprovedDocuments(newDocs);
        } catch (err) {
          console.error("Error parsing storage update:", err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [DOCS_STORAGE_KEY]);

  const startSynthesis = async () => {
    if (approvedDocuments.length === 0) {
      setStatusText("No approved documents available. Please approve documents in AI Assessment first.");
      return;
    }
    if (!sessionId) {
      setStatusText("No session ID — import a workspace first.");
      return;
    }

    setGenerationStatus("generating");
    setStatusText("Synthesizing... Please wait");
    setGenerationProgress(10);

    const steps = [
      { progress: 25, text: "Extracting key themes..." },
      { progress: 45, text: "Mapping semantic connections..." },
      { progress: 65, text: "Synthesizing literature review..." },
      { progress: 85, text: "Generating APA citations..." },
    ];
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setGenerationProgress(steps[stepIdx].progress);
        setStatusText(steps[stepIdx].text);
        stepIdx++;
      }
    }, 1200);

    try {
      const selectedGaps = store.getSelectedGaps(sessionId);
      const chosenGap =
        selectedGaps[0]?.text ||
        localStorage.getItem(`citewise_chosen_gap_${sessionId}`)?.trim() ||
        "";
      const synthesisUrl = chosenGap
        ? `/api/v1/synthesis/generate?sessionId=${encodeURIComponent(sessionId)}&chosenGap=${encodeURIComponent(chosenGap)}`
        : `/api/v1/synthesis/generate?sessionId=${encodeURIComponent(sessionId)}`;
      const requestBody = {
        userInstructions: store.getInstructions(sessionId),
        weights: store.getScorePrefs(sessionId).weights,
        gaps: (store.getGaps(sessionId) || []).map((g) => g.text),
        primaryFocusGap: chosenGap,
        rrlUsage: store.getRrlUsage(sessionId),
        approvedDocumentIds: approvedDocuments.map((d) => d.id).filter(Boolean),
      };
      const { res: response, data: initialPayload } = await apiFetch(synthesisUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok || !initialPayload || initialPayload.success === false) {
        clearInterval(interval);
        throw new Error(initialPayload?.message || `Synthesis failed (HTTP ${response.status})`);
      }

      let payload = initialPayload;

      if (response.status === 202 || initialPayload.status === "GENERATING") {
        const statusUrl = `/api/v1/synthesis/status?sessionId=${encodeURIComponent(sessionId)}`;
        let pollAttempts = 0;
        const maxAttempts = 80;

        while (pollAttempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 2500));
          pollAttempts++;

          const { res: statusRes, data: statusData } = await apiFetch(statusUrl);
          if (!statusRes.ok || !statusData) {
            continue;
          }

          if (statusData.status === "FAILED") {
            clearInterval(interval);
            throw new Error(statusData.message || "Synthesis generation failed");
          }

          if (statusData.status === "PASSED" || (statusData.contentText && statusData.status !== "GENERATING")) {
            payload = statusData;
            break;
          }
        }

        if (pollAttempts >= maxAttempts) {
          clearInterval(interval);
          throw new Error("Draft synthesis timed out. Please check your AI workflows.");
        }
      }

      clearInterval(interval);

      const refsArray = (payload.referencesText || "")
        .split("\n")
        .map((ref) => ref.trim())
        .filter((ref) => ref.length > 0);

      const previousContent = generatedContent || "";
      const newContent = payload.contentText || "";

      const mergedContent = newContent;
      const mergedReferences = refsArray;

      if (previousContent && previousContent !== newContent) {
        store.addDraftVersion(sessionId, {
          content: previousContent,
          references: references || [],
          label: `Replaced v${store.getDraftVersions(sessionId).length + 1}`,
          source: "generated",
        });
      }

      setGenerationProgress(100);
      setStatusText("Synthesis Complete!");
      setGenerationStatus("complete");
      setGeneratedContent(mergedContent);
      setReferences(mergedReferences);
      setCitationsUsed(Array.isArray(payload.citationsUsed) ? payload.citationsUsed : []);
      setCitationIntegrity(payload.citationIntegrity ?? null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2200);

      store.addDraftVersion(sessionId, {
        content: mergedContent,
        references: mergedReferences,
        label: `Generated v${store.getDraftVersions(sessionId).length + 1}`,
        source: "generated",
      });

      const draftToSave = {
        content: mergedContent,
        references: mergedReferences,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftToSave));

    } catch (err) {
      clearInterval(interval);
      console.error("Synthesis error:", err);
      setGenerationProgress(0);
      let errorMsg = err.message || "Synthesis failed";
      if (/error in workflow/i.test(errorMsg) || /HTTP 500/i.test(errorMsg) || /\{.*message.*\}/i.test(errorMsg)) {
        errorMsg = "The AI synthesis engine encountered a temporary processing hiccup. Please try generating again.";
      }
      setStatusText(errorMsg);
      setGenerationStatus(generatedContent ? "complete" : "idle");
    }
  };

  const resetGeneration = () => {
    setGenerationStatus("idle");
    setGenerationProgress(0);
    setGeneratedContent("");
    setReferences([]);
    setStatusText("Ready to Generate");
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  const fastUpdateCitations = async (currentContent) => {
    const bodyPayload = { sessionId };
    if (currentContent) bodyPayload.contentText = currentContent;

    try {
      const { res, data } = await apiFetch(`/api/v1/synthesis/update-citations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      if (res.ok && data.success) {
        setGeneratedContent(data.contentText);
        setReferences((data.referencesText || "").split("\n").filter(Boolean));
        const draftToSave = {
          content: data.contentText,
          references: (data.referencesText || "").split("\n").filter(Boolean),
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftToSave));
      }
    } catch (err) {
      console.error("Failed to fast-update citations", err);
    }
  };

  const handleSaveEdit = async (editedContent, editedReferences, source = 'edited') => {
    setGeneratedContent(editedContent);
    const newRefs = editedReferences || references;
    if (editedReferences) {
      setReferences(editedReferences);
    }

    const referencesText = newRefs.join('\n\n');
    const draftToSave = { content: editedContent, references: newRefs, timestamp: new Date().toISOString() };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftToSave));

    try {
      await apiFetch('/api/v1/synthesis/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, contentText: editedContent, referencesText, source }),
      });
    } catch (err) {
      console.warn('[handleSaveEdit] DB sync failed (non-fatal):', err.message);
    }

    store.addDraftVersion(sessionId, {
      content: editedContent,
      references: newRefs,
      label: source === 'paraphrased'
        ? `Paraphrased v${store.getDraftVersions(sessionId).length + 1}`
        : `Edited v${store.getDraftVersions(sessionId).length + 1}`,
      source,
    });
  };

  const handleRestoreVersion = (version) => {
    if (!version) return;
    setGeneratedContent(version.content || "");
    setReferences(version.references || []);
    setGenerationStatus("complete");
    const draftToSave = { content: version.content || "", references: version.references || [], timestamp: new Date().toISOString() };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftToSave));
  };

  const handleExport = async (format) => {
    setExportDropdownOpen(false);
    const referencesText = references.join("\n\n");
    const fullText = `${generatedContent}\n\nReferences\n${referencesText}`;

    if (format === "TXT") {
      const element = document.createElement("a");
      const file = new Blob([fullText], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = `citewise_synthesis.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      return;
    }

    if (format === "DOCX") {
      const blob = createDocxBlob(fullText);
      downloadBlob(blob, "citewise_synthesis.docx");
      return;
    }

    if (format === "PDF") {
      setIsExportingPdf(true);
      try {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF({ unit: "pt", format: "letter" });
        const margin = 72;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const usableWidth = pageWidth - margin * 2;

        doc.setFont("Times", "normal");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        const lines = doc.splitTextToSize(fullText, usableWidth);
        const lineHeight = 12;
        let cursorY = margin;

        for (let i = 0; i < lines.length; i++) {
          if (cursorY + lineHeight > pageHeight - margin) {
            doc.addPage();
            cursorY = margin;
          }
          doc.text(lines[i], margin, cursorY);
          cursorY += lineHeight;
        }

        doc.save("citewise_synthesis.pdf");
      } catch (err) {
        console.error("PDF generation failed:", err);
        const element = document.createElement("a");
        const file = new Blob([fullText], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = `citewise_synthesis.pdf.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      } finally {
        setIsExportingPdf(false);
      }
      return;
    }
  };

  const copyToClipboard = () => {
    setExportDropdownOpen(false);
    const referencesText = references.join("\n\n");
    const fullText = `${generatedContent}\n\nReferences\n${referencesText}`;
    navigator.clipboard.writeText(fullText);
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes fadeInToast { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleInToast {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes pulseRing {
          0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.2); }
          50% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.4); }
        }
        @keyframes drawCheckmark { to { stroke-dashoffset: 0; } }
        @keyframes fillProgress { to { width: 100%; } }
      `}</style>

      {showSuccessToast && (
        <div style={styles.toastOverlay}>
          <div style={styles.toastContainer}>
            <div style={styles.toastIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline
                  points="20 6 9 17 4 12"
                  style={{
                    strokeDasharray: 50,
                    strokeDashoffset: 50,
                    animation: "drawCheckmark 0.6s ease-out 0.2s forwards",
                  }}
                />
              </svg>
            </div>
            <h3 style={styles.toastTitle}>Synthesis Complete</h3>
            <p style={styles.toastMessage}>Your literature synthesis has been generated with APA citations.</p>
            <div style={styles.toastProgressTrack}>
              <div style={styles.toastProgressFill} />
            </div>
          </div>
        </div>
      )}

      <div style={styles.gridContainer}>
        <div style={styles.leftColumn}>
          <SynthesisControlPanel
            generationStatus={generationStatus}
            generationProgress={generationProgress}
            statusText={statusText}
            onSynthesize={startSynthesis}
            onRegenerate={resetGeneration}
            hasApprovedDocuments={approvedDocuments.length > 0}
            approvedCount={approvedDocuments.length}
          />
          <InstructionsPanel sessionId={sessionId} />
          <SourceUsageTransparency
            sessionId={sessionId}
            documents={approvedDocuments}
          />
          <DraftVersionHistory
            sessionId={sessionId}
            currentContent={generatedContent}
            onRestore={handleRestoreVersion}
          />
          <ApprovedSourceList 
            sessionId={sessionId}
            documents={approvedDocuments} 
            loading={loading} 
            onUpdateSources={(newDocs) => {
              setApprovedDocuments(newDocs);
              localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(newDocs));
              const currentUsage = store.getRrlUsage(sessionId) || {};
              store.setRrlUsage(sessionId, {
                ...currentUsage,
                selectedDocumentIds: newDocs.map(d => String(d.id))
              });
            }}
            onOverrideComplete={() => {
              if (approvedDocuments.length > 0 && sessionId && generationStatus === "complete") {
                fastUpdateCitations(generatedContent || undefined);
              }
            }}
          />
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.rightPanel}>
            <div style={styles.rightPanelHeader}>
              <span style={styles.rightPanelTitle}>Generated Introduction</span>
              <ExportDraftDropdown 
                isOpen={exportDropdownOpen}
                onToggle={setExportDropdownOpen}
                onExport={handleExport}
                onCopy={copyToClipboard}
                isEnabled={generationStatus === "complete"}
                isExportingPdf={isExportingPdf}
              />
            </div>
            <div style={styles.rightPanelContent}>
              <GeneratedDraftDisplay
                generationStatus={generationStatus}
                content={generatedContent}
                references={references}
                onSaveEdit={handleSaveEdit}
                citationIntegrity={citationIntegrity}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Poppins', sans-serif",
    flex: 1,
    color: "#111827",
    position: "relative",
  },
  gridContainer: {
    width: "100%",
    padding: "2rem clamp(2rem, 4vw, 4rem) 3rem",
    boxSizing: "border-box",
    flex: 1,
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: "24px",
    minHeight: 0,
    background: "#f8f9fb",
  },
  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  rightColumn: {
    minHeight: 0,
  },
  rightPanel: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    height: "100%",
    minHeight: "500px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
  },
  rightPanelHeader: {
    padding: "1.125rem 1.5rem",
    borderBottom: "1px solid rgba(249, 115, 22, 0.18)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "linear-gradient(180deg, #fff2e0 0%, #ffe9d1 100%)",
  },
  rightPanelTitle: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: "1.05rem",
    color: "#f97316",
    letterSpacing: "0.01em",
  },
  rightPanelContent: {
    flex: 1,
    padding: "24px",
    background: "#ffffff",
    overflowY: "auto",
  },
  toastOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(12px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    animation: "fadeInToast 0.3s ease-out forwards",
  },
  toastContainer: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "24px",
    padding: "2.5rem 3rem",
    maxWidth: "480px",
    width: "90%",
    textAlign: "center",
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.12), 0 0 40px rgba(34, 197, 94, 0.1)",
    animation: "scaleInToast 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
  },
  toastIcon: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "rgba(34, 197, 94, 0.1)",
    border: "2px solid #22c55e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1.5rem",
    boxShadow: "0 0 20px rgba(34, 197, 94, 0.15)",
    animation: "pulseRing 2s infinite",
  },
  toastProgressTrack: {
    width: "100%",
    height: "4px",
    background: "#e5e7eb",
    borderRadius: "2px",
    overflow: "hidden",
  },
  toastProgressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #22c55e, #4ade80)",
    width: "0%",
    borderRadius: "2px",
    animation: "fillProgress 2.2s linear forwards",
  },
  toastTitle: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 800,
    fontSize: "1.5rem",
    color: "#111827",
    margin: "0 0 0.5rem 0",
  },
  toastMessage: {
    fontFamily: "'Poppins', sans-serif",
    fontSize: "0.95rem",
    color: "#6b7280",
    lineHeight: "1.6",
    margin: 0,
  },
};