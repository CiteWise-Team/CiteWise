  import { useState, useEffect } from "react";
  import { jsPDF } from "jspdf";
  import SynthesisControlPanel from "./SynthesisControlPanel";
  import ApprovedSourceList from "./ApprovedSourceList";
  import GeneratedDraftDisplay from "./GeneratedDraftDisplay";
  import ExportDraftDropdown from "./ExportDraftDropdown";

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
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

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
        
        // Get existing approved documents from localStorage first to display immediately
        let initialDocs = [];
        const storedApproved = localStorage.getItem(DOCS_STORAGE_KEY);
        
        if (storedApproved) {
          try {
            initialDocs = JSON.parse(storedApproved);
            setApprovedDocuments(initialDocs);
            console.log("Initial approved documents from localStorage:", initialDocs);
          } catch (err) {
            console.error("Error parsing stored approved docs:", err);
          }
        }
        
        // Fetch current approved documents from API to get the absolute source of truth
        try {
          console.log("Fetching up-to-date documents from session API...");
          const response = await fetch(`/api/v1/documents/session/${sessionId}`, {
            headers: {
              'X-Session-Id': sessionId,
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          const approvedDocs = data.filter(doc => doc.approved === true);
          
          console.log("Current approved documents from API:", approvedDocs);
          setApprovedDocuments(approvedDocs);
          
          // Save up-to-date approved list back to localStorage
          localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(approvedDocs));
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

    const startSynthesis = async (isRegenerate = false) => {
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
        const chosenGap = localStorage.getItem(`citewise_chosen_gap_${sessionId}`)?.trim();
        const synthesisUrl = chosenGap
          ? `/api/v1/synthesis/generate?sessionId=${encodeURIComponent(sessionId)}&chosenGap=${encodeURIComponent(chosenGap)}`
          : `/api/v1/synthesis/generate?sessionId=${encodeURIComponent(sessionId)}`;
        const response = await fetch(synthesisUrl, { method: "POST" });
        const payload = await response.json().catch(() => null);
        clearInterval(interval);

        if (!response.ok || !payload || payload.success === false) {
          throw new Error(payload?.message || `Synthesis failed (HTTP ${response.status})`);
        }

        const refsArray = (payload.referencesText || "")
          .split("\n")
          .map((ref) => ref.trim())
          .filter((ref) => ref.length > 0);

        const existingContent = isRegenerate ? "" : (generatedContent || "");
        const newContent = payload.contentText || "";
        
        let mergedContent = newContent;
        let mergedReferences = refsArray;
        
        if (existingContent && existingContent.length > 0) {
          if (!existingContent.includes(newContent.substring(0, 100))) {
            mergedContent = existingContent + "\n\n---\n\n" + newContent;
            const existingRefs = references || [];
            const newRefsSet = new Set([...existingRefs, ...refsArray]);
            mergedReferences = Array.from(newRefsSet);
          }
        }

        setGenerationProgress(100);
        setStatusText("Synthesis Complete!");
        setGenerationStatus("complete");
        setGeneratedContent(mergedContent);
        setReferences(mergedReferences);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2200);
        
        const draftToSave = {
          content: mergedContent,
          references: mergedReferences,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftToSave));
        
      } catch (err) {
        clearInterval(interval);
        console.error("Synthesis error:", err);
        setGenerationStatus("idle");
        setGenerationProgress(0);
        setStatusText(err.message || "Synthesis failed");
      }
    };

    const resetGeneration = () => {
      setGenerationStatus("idle");
      setGenerationProgress(0);
      setGeneratedContent("");
      setReferences([]);
      setStatusText("Ready to Generate");
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      
      // Automatically trigger a clean synthesis
      startSynthesis(true);
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
        try {
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
        {showSuccessToast && (
          <div style={styles.toastOverlay}>
            <div style={styles.toastContainer}>
              <div style={styles.toastIcon}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D98A21" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 style={styles.toastTitle}>Synthesis Complete</h3>
              <p style={styles.toastMessage}>Your literature synthesis has been generated with APA citations.</p>
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
            <ApprovedSourceList documents={approvedDocuments} loading={loading} />
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
                />
              </div>
              <div style={styles.rightPanelContent}>
                <GeneratedDraftDisplay
                  generationStatus={generationStatus}
                  content={generatedContent}
                  references={references}
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
      color: "#f0ece6",
      position: "relative",
    },
    gridContainer: {
      maxWidth: 1280,
      width: "100%",
      margin: "0 auto",
      padding: "24px 32px",
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
      background: "#1E1C19",
      border: "1px solid #3A3630",
      borderRadius: "12px",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      height: "100%",
      minHeight: "500px",
    },
    rightPanelHeader: {
      padding: "16px 24px",
      borderBottom: "1px solid #3A3630",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "rgba(0, 0, 0, 0.15)",
    },
    rightPanelTitle: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 700,
      fontSize: "1.05rem",
      color: "#D98A21",
      letterSpacing: "0.01em",
    },
    rightPanelContent: {
      flex: 1,
      padding: "24px",
      background: "#1E1C19",
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
    },
    toastContainer: {
      background: "#1E1C19",
      border: "1px solid rgba(217, 138, 33, 0.25)",
      borderRadius: "24px",
      padding: "2.5rem 3rem",
      maxWidth: "480px",
      width: "90%",
      textAlign: "center",
    },
    toastIcon: {
      width: "80px",
      height: "80px",
      borderRadius: "50%",
      background: "rgba(216, 90, 48, 0.1)",
      border: "2px solid #D85A30",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 1.5rem",
    },
    toastTitle: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 800,
      fontSize: "1.5rem",
      color: "#f0ece6",
      margin: "0 0 0.5rem 0",
    },
    toastMessage: {
      fontFamily: "'Poppins', sans-serif",
      fontSize: "0.95rem",
      color: "rgba(240, 236, 230, 0.7)",
      lineHeight: "1.6",
      margin: 0,
    },
  };
