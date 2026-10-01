import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Sparkles, Edit3, Loader2 } from "lucide-react";
import SynthesisControlPanel from "./SynthesisControlPanel";
import ApprovedSourceList from "./ApprovedSourceList";
import GeneratedDraftDisplay from "./GeneratedDraftDisplay";
import ExportDraftDropdown from "./ExportDraftDropdown";
import InstructionsPanel from "./InstructionsPanel";
import SourceUsageTransparency from "./SourceUsageTransparency";
import DraftVersionHistory from "./DraftVersionHistory";
import * as store from "../../../lib/citewiseStore";
import { apiFetch } from "../../../../api/http";
import useIsMobile from "../../../../hooks/useIsMobile";
import { useTheme } from "../../../../context/ThemeContext";
import { splitDraftSections } from "../utils/draftUtils";
import ExportFileNameModal from "./ExportFileNameModal";
import ModernToast from "../../../../components/ui/ModernToast";
export { splitDraftSections };

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
      const trimmed = line.trim();
      const content = trimmed ? escapeXml(trimmed) : "";
      if (!content) {
        return `<w:p/>`;
      }
      const isHeading = /^#{1,6}\s+/.test(trimmed) || /^(References|Background|Rationale|Research Gap)$/i.test(trimmed);
      const cleanContent = escapeXml(trimmed.replace(/^#{1,6}\s+/, ""));
      if (isHeading) {
        return `<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="240" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${cleanContent}</w:t></w:r></w:p>`;
      }
      return `<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="160" w:line="360" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${content}</w:t></w:r></w:p>`;
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
  const isMobile = useIsMobile();
  const { isDark } = useTheme();
  const styles = getStyles(isMobile, isDark);
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
  const [exportModalState, setExportModalState] = useState({
    isOpen: false,
    format: null,
    defaultName: "citewise_synthesis",
  });
  const [toastState, setToastState] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
    duration: 3800,
  });

  const showToast = (type, title, message, duration = 3800) => {
    setToastState({ show: true, type, title, message, duration });
  };
  const [draftPanelOpen, setDraftPanelOpen] = useState(true);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [isParaphrasingDraft, setIsParaphrasingDraft] = useState(false);
  const [paraphrasedDraft, setParaphrasedDraft] = useState(null);
  const [hoveredHeaderButton, setHoveredHeaderButton] = useState(null);

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
            onStepChange?.(3);
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
      onStepChange?.(3);
      setGeneratedContent(mergedContent);
      setReferences(mergedReferences);
      setCitationsUsed(Array.isArray(payload.citationsUsed) ? payload.citationsUsed : []);
      setCitationIntegrity(payload.citationIntegrity ?? null);
      showToast(
        "success",
        "Synthesis Successful",
        "Your academic literature synthesis has been generated with integrated scholarly citations."
      );

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
      showToast("error", "Synthesis Failed", errorMsg);
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

    setIsEditingDraft(false);
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

  const handleParaphraseDraft = async () => {
    if (isParaphrasingDraft || paraphrasedDraft || !generatedContent) return;
    setIsParaphrasingDraft(true);
    try {
      // 1. FRONTEND ONLY: Separate section titles from research body content
      const segments = splitDraftSections(generatedContent);

      // 2. Paraphrase only the body prose segments; leave part titles untouched
      const paraphrasedSegments = await Promise.all(
        segments.map(async (seg) => {
          if (seg.type !== "body" || !seg.text.trim()) {
            return seg.text;
          }
          const { res, data } = await apiFetch("/api/v1/synthesis/paraphrase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: seg.text.trim() }),
          });
          if (res.ok && data.success && data.text) {
            return data.text.trim();
          }
          return seg.text;
        })
      );

      // 3. Reconstruct draft preserving original section headers verbatim
      let reconstructed = "";
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const textVal = paraphrasedSegments[i] || seg.text;
        if (seg.type === "header") {
          reconstructed += (reconstructed ? "\n\n" : "") + textVal + "\n\n";
        } else {
          reconstructed += textVal;
        }
      }

      const finalOutput = reconstructed.trim();
      if (finalOutput && finalOutput !== generatedContent) {
        setParaphrasedDraft(finalOutput);
        if (!draftPanelOpen) setDraftPanelOpen(true);
        showToast("success", "Paraphrase Ready", "Review the revisions and accept or discard changes.");
      } else {
        showToast("warning", "No Changes Detected", "Paraphrasing completed with no detectable alterations to the current text.");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Paraphrasing Failed", "Could not complete paraphrasing. Please check the network connection.");
    } finally {
      setIsParaphrasingDraft(false);
    }
  };

  const handlePromptExport = (format) => {
    setExportDropdownOpen(false);
    setExportModalState({
      isOpen: true,
      format,
      defaultName: "citewise_synthesis",
    });
  };

  const handleConfirmExport = async (customFileName) => {
    const format = exportModalState.format;
    const cleanName = (customFileName || exportModalState.defaultName || "citewise_synthesis")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "_");
    setExportModalState((prev) => ({ ...prev, isOpen: false }));
    await executeExport(format, cleanName);
  };

  const executeExport = async (format, fileName = "citewise_synthesis") => {
    const referencesText = references.join("\n\n");
    const fullText = `${generatedContent}\n\nReferences\n${referencesText}`;

    if (format === "TXT") {
      // Justify plain text lines to fixed column width (80 cols) where feasible
      const justifyPlainText = (text, colWidth = 80) => {
        const paras = text.split(/\r?\n\r?\n/);
        return paras
          .map((para) => {
            const trimmed = para.trim();
            if (!trimmed) return "";
            if (/^#{1,6}\s+/.test(trimmed) || /^(References|Background|Rationale|Research Gap)$/i.test(trimmed)) {
              return trimmed;
            }
            const words = trimmed.split(/\s+/).filter(Boolean);
            const lines = [];
            let currentLine = [];
            let currentLen = 0;

            for (const word of words) {
              const nextLen = currentLen === 0 ? word.length : currentLen + 1 + word.length;
              if (nextLen <= colWidth) {
                currentLine.push(word);
                currentLen = nextLen;
              } else {
                lines.push(currentLine);
                currentLine = [word];
                currentLen = word.length;
              }
            }
            if (currentLine.length > 0) lines.push(currentLine);

            return lines
              .map((lineWords, idx) => {
                if (idx === lines.length - 1 || lineWords.length <= 1) {
                  return lineWords.join(" ");
                }
                const totalChars = lineWords.reduce((s, w) => s + w.length, 0);
                const totalSpacesNeeded = colWidth - totalChars;
                const gaps = lineWords.length - 1;
                const baseSpaces = Math.floor(totalSpacesNeeded / gaps);
                const extraSpaces = totalSpacesNeeded % gaps;

                let justifiedLine = "";
                for (let g = 0; g < gaps; g++) {
                  justifiedLine += lineWords[g];
                  const spacesCount = baseSpaces + (g < extraSpaces ? 1 : 0);
                  justifiedLine += " ".repeat(spacesCount);
                }
                justifiedLine += lineWords[gaps];
                return justifiedLine;
              })
              .join("\n");
          })
          .join("\n\n");
      };

      const justifiedText = justifyPlainText(fullText, 80);
      const element = document.createElement("a");
      const file = new Blob([justifiedText], { type: "text/plain;charset=utf-8" });
      element.href = URL.createObjectURL(file);
      element.download = `${fileName}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      showToast("success", "Export Complete", `Exported "${fileName}.txt" successfully.`);
      return;
    }

    if (format === "DOCX") {
      const blob = createDocxBlob(fullText);
      downloadBlob(blob, `${fileName}.docx`);
      showToast("success", "Export Complete", `Exported "${fileName}.docx" successfully.`);
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

        const bodyFontSize = 10;
        const headingFontSize = 12;
        const lineHeight = 15;
        let cursorY = margin;

        const rawParas = fullText.split(/\r?\n\r?\n/);

        for (let pIdx = 0; pIdx < rawParas.length; pIdx++) {
          const para = rawParas[pIdx].trim();
          if (!para) continue;

          const isHeading = /^#{1,6}\s+/.test(para) || /^(References|Background|Rationale|Research Gap)$/i.test(para);

          if (isHeading) {
            doc.setFont("Times", "bold");
            doc.setFontSize(headingFontSize);
            const headingText = para.replace(/^#{1,6}\s+/, "");
            if (cursorY + lineHeight * 2 > pageHeight - margin) {
              doc.addPage();
              cursorY = margin;
            }
            if (cursorY > margin) cursorY += 8;
            doc.text(headingText, margin, cursorY);
            cursorY += lineHeight + 4;
            continue;
          }

          // Justified body paragraph
          doc.setFont("Times", "normal");
          doc.setFontSize(bodyFontSize);

          const lines = doc.splitTextToSize(para, usableWidth);

          for (let i = 0; i < lines.length; i++) {
            if (cursorY + lineHeight > pageHeight - margin) {
              doc.addPage();
              cursorY = margin;
            }

            const line = lines[i].trim();
            const isLastLine = i === lines.length - 1;

            if (isLastLine) {
              doc.text(line, margin, cursorY);
            } else {
              const words = line.split(/\s+/).filter(Boolean);
              if (words.length <= 1) {
                doc.text(line, margin, cursorY);
              } else {
                const wordsWidth = words.reduce((acc, w) => acc + doc.getTextWidth(w), 0);
                const gap = (usableWidth - wordsWidth) / (words.length - 1);
                let curX = margin;
                for (let w = 0; w < words.length; w++) {
                  doc.text(words[w], curX, cursorY);
                  curX += doc.getTextWidth(words[w]) + gap;
                }
              }
            }
            cursorY += lineHeight;
          }
          cursorY += 6;
        }

        doc.save(`${fileName}.pdf`);
        showToast("success", "Export Complete", `Exported "${fileName}.pdf" successfully.`);
      } catch (err) {
        console.error("PDF generation failed:", err);
        const element = document.createElement("a");
        const file = new Blob([fullText], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = `${fileName}.pdf.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        showToast("warning", "PDF Fallback", "Standard PDF generation failed. Downloaded text format instead.");
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
    showToast("success", "Copied to Clipboard", "Introduction text and APA references copied to clipboard.");
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

      {/* Modern Floating Toast Notification */}
      <ModernToast
        show={toastState.show}
        type={toastState.type}
        title={toastState.title}
        message={toastState.message}
        duration={toastState.duration}
        onClose={() => setToastState((prev) => ({ ...prev, show: false }))}
      />

      <div style={styles.gridContainer}>
        <div style={styles.leftColumn}>
          <div style={{ order: 0, minWidth: 0 }} data-guide="citewise-synthesis-controls">
            <SynthesisControlPanel
              generationStatus={generationStatus}
              generationProgress={generationProgress}
              statusText={statusText}
              onSynthesize={startSynthesis}
              onRegenerate={resetGeneration}
              hasApprovedDocuments={approvedDocuments.length > 0}
              approvedCount={approvedDocuments.length}
            />
          </div>
          <div style={styles.leftColumnRest}>
            <div data-guide="citewise-guide-ai">
              <InstructionsPanel sessionId={sessionId} />
            </div>
            <div data-guide="citewise-source-usage">
              <SourceUsageTransparency
                sessionId={sessionId}
                documents={approvedDocuments}
              />
            </div>
            <div data-guide="citewise-version-history">
              <DraftVersionHistory
                sessionId={sessionId}
                currentContent={generatedContent}
                onRestore={handleRestoreVersion}
              />
            </div>
            <div data-guide="citewise-source-documents">
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
          </div>
        </div>

        <div style={styles.rightColumn} data-guide="citewise-draft-editor">
          <div style={{ ...styles.rightPanel, height: draftPanelOpen ? "100%" : "auto", minHeight: draftPanelOpen ? (isMobile ? "320px" : "500px") : "0" }}>
            <div
              className="workflow-card-header"
              onClick={() => setDraftPanelOpen((o) => !o)}
              style={{
                ...styles.rightPanelHeader,
                borderBottom: draftPanelOpen ? "1px solid var(--cw-border, #e5e7eb)" : "none",
                cursor: "pointer",
                userSelect: "none",
                flexWrap: "nowrap",
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 auto", marginRight: "8px" }}>
                <span style={styles.rightPanelTitle}>Generated Introduction</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto", justifyContent: "flex-end", flexShrink: 0 }}>
                <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto", justifyContent: "flex-end" }}>
                  {/* Paraphrase Icon Button */}
                  <div data-guide="citewise-btn-paraphrase" style={{ position: "relative", display: "inline-flex" }}>
                    <button
                      type="button"
                      title="Paraphrase"
                      aria-label="Paraphrase"
                      disabled={generationStatus !== "complete" || !generatedContent || isParaphrasingDraft || !!paraphrasedDraft}
                      onClick={() => handleParaphraseDraft()}
                      onMouseEnter={() => setHoveredHeaderButton("paraphrase")}
                      onMouseLeave={() => setHoveredHeaderButton(null)}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        padding: 0,
                        background: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
                        color: (generationStatus !== "complete" || !generatedContent || isParaphrasingDraft || !!paraphrasedDraft)
                          ? (isDark ? "#4b5563" : "#cbd5e1")
                          : (hoveredHeaderButton === "paraphrase")
                            ? "#ea580c"
                            : (isDark ? "#cbd5e1" : "#4b5563"),
                        border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.08)",
                        cursor: (generationStatus !== "complete" || !generatedContent || isParaphrasingDraft || !!paraphrasedDraft)
                          ? "not-allowed"
                          : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: (generationStatus !== "complete" || !generatedContent || isParaphrasingDraft || !!paraphrasedDraft) ? 0.45 : 1,
                        transition: "all 0.18s ease",
                        transform: hoveredHeaderButton === "paraphrase" && generationStatus === "complete" && !!generatedContent && !isParaphrasingDraft && !paraphrasedDraft ? "scale(1.06)" : "scale(1)",
                      }}
                    >
                      {isParaphrasingDraft ? (
                        <span
                          className="cw-spinning"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "15px",
                            height: "15px",
                            transformOrigin: "center center",
                            animation: "cw-spin 0.85s linear infinite",
                          }}
                        >
                          <Loader2 size={15} />
                        </span>
                      ) : (
                        <Sparkles size={15} />
                      )}
                    </button>
                    {hoveredHeaderButton === "paraphrase" && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "calc(100% + 10px)",
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: isDark ? "#1e293b" : "#0f172a",
                          color: "#ffffff",
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          fontFamily: "'Poppins', sans-serif",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          whiteSpace: "nowrap",
                          pointerEvents: "none",
                          boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.6)" : "0 8px 20px rgba(0,0,0,0.25)",
                          border: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(0, 0, 0, 0.1)",
                          zIndex: 9999,
                        }}
                      >
                        {isParaphrasingDraft ? "Paraphrasing..." : "Paraphrase"}
                      </div>
                    )}
                  </div>

                  {/* Edit Draft Icon Button */}
                  <div data-guide="citewise-btn-edit" style={{ position: "relative", display: "inline-flex" }}>
                    <button
                      type="button"
                      title={isEditingDraft ? "Cancel Editing" : "Edit Draft"}
                      aria-label="Edit Draft"
                      disabled={generationStatus !== "complete" || !generatedContent || !!paraphrasedDraft}
                      onClick={() => {
                        if (generationStatus === "complete" && !!generatedContent && !paraphrasedDraft) {
                          if (!draftPanelOpen) setDraftPanelOpen(true);
                          setIsEditingDraft((prev) => !prev);
                        }
                      }}
                      onMouseEnter={() => setHoveredHeaderButton("edit")}
                      onMouseLeave={() => setHoveredHeaderButton(null)}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        padding: 0,
                        background: isEditingDraft
                          ? (isDark ? "rgba(249, 115, 22, 0.22)" : "#fff7ed")
                          : (isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)"),
                        color: (generationStatus !== "complete" || !generatedContent || !!paraphrasedDraft)
                          ? (isDark ? "#4b5563" : "#cbd5e1")
                          : isEditingDraft || (hoveredHeaderButton === "edit")
                            ? "#ea580c"
                            : (isDark ? "#cbd5e1" : "#4b5563"),
                        border: isEditingDraft
                          ? "1px solid #ea580c"
                          : (isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.08)"),
                        cursor: (generationStatus !== "complete" || !generatedContent || !!paraphrasedDraft)
                          ? "not-allowed"
                          : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: (generationStatus !== "complete" || !generatedContent || !!paraphrasedDraft) ? 0.45 : 1,
                        transition: "all 0.18s ease",
                        transform: hoveredHeaderButton === "edit" && generationStatus === "complete" && !!generatedContent && !paraphrasedDraft ? "scale(1.06)" : "scale(1)",
                      }}
                    >
                      <Edit3 size={15} />
                    </button>
                    {hoveredHeaderButton === "edit" && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "calc(100% + 10px)",
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: isDark ? "#1e293b" : "#0f172a",
                          color: "#ffffff",
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          fontFamily: "'Poppins', sans-serif",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          whiteSpace: "nowrap",
                          pointerEvents: "none",
                          boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.6)" : "0 8px 20px rgba(0,0,0,0.25)",
                          border: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(0, 0, 0, 0.1)",
                          zIndex: 9999,
                        }}
                      >
                        {isEditingDraft ? "Cancel Editing" : "Edit Draft"}
                      </div>
                    )}
                  </div>

                  {/* Export Draft Dropdown Icon Button */}
                  <div data-guide="citewise-btn-export" style={{ position: "relative", display: "inline-flex" }}>
                    <ExportDraftDropdown 
                      isOpen={exportDropdownOpen}
                      onToggle={setExportDropdownOpen}
                      onExport={handlePromptExport}
                      onCopy={copyToClipboard}
                      isEnabled={generationStatus === "complete" && !!generatedContent}
                      isExportingPdf={isExportingPdf}
                    />
                  </div>
                </div>
                <span style={{ color: "var(--cw-text-muted, #6b7280)", display: "inline-flex", alignItems: "center" }}>
                  {draftPanelOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </div>
            </div>
            {draftPanelOpen && (
              <div style={styles.rightPanelContent}>
                <GeneratedDraftDisplay
                  generationStatus={generationStatus}
                  generationProgress={generationProgress}
                  statusText={statusText}
                  content={generatedContent}
                  references={references}
                  onSaveEdit={handleSaveEdit}
                  citationIntegrity={citationIntegrity}
                  isEditing={isEditingDraft}
                  setIsEditing={setIsEditingDraft}
                  paraphrasedDraft={paraphrasedDraft}
                  setParaphrasedDraft={setParaphrasedDraft}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export File Name Modal */}
      <ExportFileNameModal
        isOpen={exportModalState.isOpen}
        format={exportModalState.format}
        defaultFileName={exportModalState.defaultName}
        onClose={() => setExportModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmExport}
        isExporting={isExportingPdf}
      />
    </div>
  );
}

const getStyles = (isMobile, isDark) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Poppins', sans-serif",
    flex: 1,
    color: isDark ? "var(--cw-text-primary, #f9fafb)" : "#111827",
    position: "relative",
  },
  gridContainer: {
    width: "100%",
    margin: "0 auto",
    padding: 0,
    boxSizing: "border-box",
    flex: 1,
    display: isMobile ? "flex" : "grid",
    flexDirection: "column",
    gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "420px minmax(0, 1fr)",
    gap: isMobile ? "16px" : "14px",
    alignItems: isMobile ? "stretch" : "start",
    minHeight: 0,
    background: "transparent",
  },
  leftColumn: isMobile
    ? { display: "contents" }
    : {
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "16px" : "14px",
        minHeight: 0,
      },
  leftColumnRest: {
    order: 2,
    display: "flex",
    flexDirection: "column",
    gap: isMobile ? "16px" : "14px",
    minWidth: 0,
  },
  rightColumn: {
    minHeight: 0,
    minWidth: 0,
    order: 1,
  },
  rightPanel: {
    background: isDark ? "var(--cw-bg-surface, #15141f)" : "#ffffff",
    border: isDark ? "1px solid var(--cw-border, rgba(255, 255, 255, 0.1))" : "1px solid #e5e7eb",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    overflow: "visible",
    position: "relative",
    height: "100%",
    minHeight: isMobile ? "320px" : "500px",
    boxShadow: isDark ? "0 4px 16px rgba(0, 0, 0, 0.35)" : "0 4px 16px rgba(0, 0, 0, 0.05)",
  },
  rightPanelHeader: {
    padding: isMobile ? "12px 14px" : "1.125rem 1.5rem",
    gap: "12px",
    borderBottom: isDark ? "1px solid var(--cw-border, rgba(255, 255, 255, 0.1))" : "1px solid var(--cw-border, #e5e7eb)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: isDark ? "var(--cw-bg-surface-elevated, #1e2638)" : "var(--cw-bg-surface-elevated, #f9fafb)",
    borderTopLeftRadius: "16px",
    borderTopRightRadius: "16px",
    overflow: "visible",
    position: "relative",
    zIndex: 50,
  },
  rightPanelTitle: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: "1.05rem",
    color: "var(--cw-text-primary, #0f0e17)",
    letterSpacing: "0.01em",
  },
  rightPanelContent: {
    flex: 1,
    padding: isMobile ? "14px" : "24px",
    background: isDark ? "var(--cw-bg-surface, #15141f)" : "#ffffff",
    overflowY: "auto",
    borderBottomLeftRadius: "16px",
    borderBottomRightRadius: "16px",
  },
});
