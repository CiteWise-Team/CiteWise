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
    const [errorModal, setErrorModal] = useState(null);

    const DRAFT_STORAGE_KEY = `citewise_draft_${sessionId}`;
    const DOCS_STORAGE_KEY = `citewise_approved_docs_${sessionId}`;

    // Load saved draft on mount
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

    // Save draft whenever it changes
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

      // Fetch approved documents
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

            // The API response is the source of truth for existing session documents.
            // Only documents that are approved in the database (and not explicitly excluded by user) are loaded.
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

    // Listen for storage events (when Module 2 saves new approved docs)
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
        // Gather all user-guidance for this session (Reqs 2, 3, 4, 8).
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

        // If backend accepted async job (HTTP 202 or GENERATING status), poll /status until completion
        if (response.status === 202 || initialPayload.status === "GENERATING") {
          const statusUrl = `/api/v1/synthesis/status?sessionId=${encodeURIComponent(sessionId)}`;
          let pollAttempts = 0;
          const maxAttempts = 80; // ~3.5 minutes at 2.5s intervals

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

        // A re-draft REPLACES the introduction. The previous code branched on an
        // `isRegenerate` flag and would otherwise concatenate the old and new
        // drafts with a "---" separator and union both reference lists — two whole
        // introductions in one document. That path only stayed dormant by accident:
        // the button wires onClick={onSynthesize}, so the flag always received a
        // truthy MouseEvent. Replacing unconditionally makes the intent explicit,
        // and the previous draft is snapshotted below so it stays restorable from
        // Draft Version History.
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

        // Req 7: record this generation as a restorable version.
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
        setGenerationStatus("error");

        let rawMsg = err.message || "Synthesis failed";
        let cleanMsg = rawMsg;
        let details = [
          "Ensure you have approved at least one document with text in AI Assessment.",
          "Preprints and undated papers are supported and automatically cite as 'n.d.' (no date).",
          "Click 'Draft Introduction' to try generating again.",
        ];

        // Parse any JSON embedded in raw message
        if (rawMsg.includes('{') && rawMsg.includes('}')) {
          try {
            const match = rawMsg.match(/\{.*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              cleanMsg = parsed.message || parsed.errorMessage || parsed.error || cleanMsg;
            }
          } catch {}
        }

        cleanMsg = cleanMsg.replace(/^Synthesis workflow returned HTTP \d+:\s*/i, '');
        cleanMsg = cleanMsg.replace(/^Error:\s*/i, '');

        if (/no usable approved documents/i.test(cleanMsg) || /usable approved documents were available/i.test(cleanMsg)) {
          cleanMsg = "The approved document(s) could not be included in the synthesis. This can happen if an approved paper had a low relevance score or missing citation metadata.";
          details = [
            "We have updated the workflow to automatically accept preprints and undated papers.",
            "Verify that your chosen paper is checked as Approved in Module 2.",
            "Click 'Draft Introduction' to try generating again.",
          ];
        } else if (/temporary processing hiccup/i.test(cleanMsg) || /timed out/i.test(cleanMsg) || /fetch failed/i.test(cleanMsg)) {
          cleanMsg = "The AI synthesis service experienced a brief delay or connection timeout.";
          details = [
            "Your workflow and API credentials are active.",
            "Click 'Draft Introduction' to retry.",
          ];
        }

        setStatusText("Generation Failed");
        setErrorModal({
          title: "Synthesis Notice",
          message: cleanMsg,
          details: details,
        });
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
      // Use the caller's live content if provided so the DB is never reverted
      // to a stale copy that doesn't reflect the user's latest edits or accepted
      // paraphrase (fixes state-desync issue).
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
          // Save back to local storage so it persists
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

    // Req 6: persist a manual edit to the draft and snapshot it as a version.
    // source = 'edited' | 'paraphrased' — passed through from GeneratedDraftDisplay.
    const handleSaveEdit = async (editedContent, editedReferences, source = 'edited') => {
      setGeneratedContent(editedContent);
      const newRefs = editedReferences || references;
      if (editedReferences) {
        setReferences(editedReferences);
      }

      const referencesText = newRefs.join('\n\n');
      const draftToSave = { content: editedContent, references: newRefs, timestamp: new Date().toISOString() };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftToSave));

      // Sync to the database so the DB is always in step with what the user sees.
      try {
        await apiFetch('/api/v1/synthesis/save-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, contentText: editedContent, referencesText, source }),
        });
      } catch (err) {
        // Non-fatal — the draft is already persisted to localStorage.
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


    // Req 7: restore a previous version into the editor.
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
          const margin = 72; // 1 inch
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const usableWidth = pageWidth - margin * 2;

          doc.setFont("Times", "normal");
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);

          const lines = doc.splitTextToSize(fullText, usableWidth);
          const lineHeight = 12; // 10pt -> ~12pt line height
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
        {/* The toast animations live here rather than in a global stylesheet, and
            have to be injected wherever they are referenced — the equivalent toast
            in Module 2 defines its own copy. Without them the toast rendered as a
            static box with a motionless icon and no progress indicator. */}
        <style>{`
          @keyframes fadeInToast { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleInToast {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes pulseRing {
            0%, 100% { box-shadow: 0 0 20px rgba(91, 91, 214, 0.2); }
            50% { box-shadow: 0 0 40px rgba(91, 91, 214, 0.4); }
          }
          @keyframes drawCheckmark { to { stroke-dashoffset: 0; } }
          @keyframes fillProgress { to { width: 100%; } }
        `}</style>

        {showSuccessToast && (
          <div style={styles.toastOverlay}>
            <div style={styles.toastContainer}>
              <div style={styles.toastIcon}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5b5bd6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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

        {errorModal && (
          <div style={styles.errorModalOverlay} onClick={() => setErrorModal(null)}>
            <div style={styles.errorModalCard} onClick={(e) => e.stopPropagation()}>
              <div style={styles.errorModalHeader}>
                <div style={styles.errorModalIconBox}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={styles.errorModalTitle}>{errorModal.title || "Unable to Complete Synthesis"}</h3>
                  <span style={styles.errorModalSubtitle}>Notice & Next Steps</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorModal(null)}
                  style={styles.errorModalCloseBtn}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div style={styles.errorModalBody}>
                <p style={styles.errorModalMessage}>{errorModal.message}</p>
                {errorModal.details && errorModal.details.length > 0 && (
                  <div style={styles.errorModalDetailsBox}>
                    <span style={styles.errorModalDetailsLabel}>Recommended Actions:</span>
                    <ul style={styles.errorModalList}>
                      {errorModal.details.map((d, i) => (
                        <li key={i} style={styles.errorModalListItem}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div style={styles.errorModalFooter}>
                <button
                  type="button"
                  onClick={() => setErrorModal(null)}
                  style={styles.errorModalPrimaryBtn}
                >
                  Got It
                </button>
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
              onErrorDetails={() => setErrorModal((prev) => prev || {
                title: "Synthesis Notice",
                message: "Generation could not be completed with the current document settings.",
                details: [
                  "Preprints and undated papers are now supported.",
                  "Check that your paper is marked as Approved in Module 2.",
                  "Click Draft Introduction to try again."
                ]
              })}
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
      color: "#e4e4f0",
      position: "relative",
    },
    gridContainer: {
      maxWidth: 1400,
      width: "100%",
      margin: "0 auto",
      padding: "2rem 2.5rem 3rem",
      boxSizing: "border-box",
      flex: 1,
      display: "grid",
      gridTemplateColumns: "320px 1fr",
      gap: "24px",
      minHeight: 0,
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
      background: "#1e1e2f",
      border: "1px solid #3a3a55",
      borderRadius: "12px",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      height: "100%",
      minHeight: "500px",
    },
    rightPanelHeader: {
      padding: "16px 24px",
      borderBottom: "1px solid #3a3a55",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "rgba(0, 0, 0, 0.15)",
    },
    rightPanelTitle: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 700,
      fontSize: "1.05rem",
      color: "#5b5bd6",
      letterSpacing: "0.01em",
    },
    rightPanelContent: {
      flex: 1,
      padding: "24px",
      background: "#1e1e2f",
      overflowY: "auto",
    },
    toastOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(14, 12, 10, 0.75)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      animation: "fadeInToast 0.3s ease-out forwards",
    },
    toastContainer: {
      background: "#1e1e2f",
      border: "1px solid rgba(91, 91, 214, 0.25)",
      borderRadius: "24px",
      padding: "2.5rem 3rem",
      maxWidth: "480px",
      width: "90%",
      textAlign: "center",
      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(91, 91, 214, 0.15)",
      animation: "scaleInToast 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
    },
    toastIcon: {
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
    },
    toastProgressTrack: {
      width: "100%",
      height: "4px",
      background: "rgba(255, 255, 255, 0.08)",
      borderRadius: "2px",
      overflow: "hidden",
    },
    toastProgressFill: {
      height: "100%",
      background: "linear-gradient(90deg, #5b5bd6, #5b5bd6)",
      width: "0%",
      borderRadius: "2px",
      animation: "fillProgress 2.2s linear forwards",
    },
    toastTitle: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 800,
      fontSize: "1.5rem",
      color: "#e4e4f0",
      margin: "0 0 0.5rem 0",
    },
    toastMessage: {
      fontFamily: "'Poppins', sans-serif",
      fontSize: "0.95rem",
      color: "rgba(240, 236, 230, 0.7)",
      lineHeight: "1.6",
      margin: 0,
    },
    errorModalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(10, 10, 20, 0.75)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      animation: "fadeInToast 0.25s ease-out forwards",
    },
    errorModalCard: {
      background: "#1e1e2f",
      border: "1px solid rgba(239, 68, 68, 0.35)",
      borderRadius: "20px",
      padding: "24px 28px",
      maxWidth: "520px",
      width: "90%",
      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.12)",
      animation: "scaleInToast 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
    },
    errorModalHeader: {
      display: "flex",
      alignItems: "flex-start",
      gap: "14px",
      marginBottom: "16px",
    },
    errorModalIconBox: {
      width: "42px",
      height: "42px",
      borderRadius: "12px",
      background: "rgba(239, 68, 68, 0.12)",
      border: "1px solid rgba(239, 68, 68, 0.3)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    errorModalTitle: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 700,
      fontSize: "1.15rem",
      color: "#fca5a5",
      margin: "0 0 2px 0",
    },
    errorModalSubtitle: {
      fontSize: "0.75rem",
      color: "#a1a1b5",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      fontWeight: 600,
    },
    errorModalCloseBtn: {
      background: "transparent",
      border: "none",
      color: "#a1a1b5",
      fontSize: "1.1rem",
      cursor: "pointer",
      padding: "4px 8px",
      borderRadius: "6px",
      lineHeight: 1,
    },
    errorModalBody: {
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      marginBottom: "20px",
    },
    errorModalMessage: {
      fontSize: "0.88rem",
      color: "#e4e4f0",
      lineHeight: "1.55",
      margin: 0,
    },
    errorModalDetailsBox: {
      background: "rgba(0, 0, 0, 0.25)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "12px",
      padding: "12px 16px",
    },
    errorModalDetailsLabel: {
      fontSize: "0.75rem",
      fontWeight: 700,
      color: "#93c5fd",
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      display: "block",
      marginBottom: "8px",
    },
    errorModalList: {
      margin: 0,
      paddingLeft: "18px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    errorModalListItem: {
      fontSize: "0.82rem",
      color: "rgba(228, 228, 240, 0.85)",
      lineHeight: "1.45",
    },
    errorModalFooter: {
      display: "flex",
      justifyContent: "flex-end",
    },
    errorModalPrimaryBtn: {
      background: "#5b5bd6",
      color: "#ffffff",
      border: "none",
      borderRadius: "10px",
      padding: "10px 22px",
      fontSize: "0.88rem",
      fontWeight: 600,
      cursor: "pointer",
      transition: "background 0.2s ease",
    },
  };
