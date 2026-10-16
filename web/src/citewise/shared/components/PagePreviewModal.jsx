// Shows the PDF page an excerpt or citation came from: the original page when
// the PDF is stored, plus the extracted page text with the quote highlighted.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, FileText, ExternalLink, Loader2 } from "lucide-react";
import { apiFetch } from "../../../api/http";
import { useTheme } from "../../../context/ThemeContext";
import PdfPageHighlight from "./PdfPageHighlight";
import { excerptParagraph } from "../utils/excerptParagraph";

export default function PagePreviewModal({ open, onClose, documentId, sessionId, pageNumber, quote }) {
  const { isDark } = useTheme();
  // Results and the chosen tab are keyed by request, so opening a different
  // excerpt starts fresh without resetting state inside an effect.
  const requestKey = open && documentId ? `${documentId}|${pageNumber ?? ""}|${quote ?? ""}` : null;
  const [result, setResult] = useState({ key: null, error: null, data: null });
  const [viewChoice, setViewChoice] = useState({ key: null, view: null });

  useEffect(() => {
    if (!requestKey) return;
    let cancelled = false;
    const params = new URLSearchParams();
    if (pageNumber) params.set("page", String(pageNumber));
    if (quote) params.set("quote", String(quote).slice(0, 1500));
    apiFetch(`/api/v1/documents/${documentId}/page?${params}`, {
      headers: { "X-Session-Id": sessionId },
    })
      .then(({ res, data }) => {
        if (!res.ok || !data?.success) throw new Error(data?.message || "Could not load the page preview.");
        if (!cancelled) setResult({ key: requestKey, error: null, data: data.data });
      })
      .catch((err) => !cancelled && setResult({ key: requestKey, error: err.message, data: null }));
    return () => { cancelled = true; };
  }, [requestKey, documentId, sessionId, pageNumber, quote]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const current = result.key === requestKey;
  const loading = !current;
  const error = current ? result.error : null;
  const data = current ? result.data : null;
  const view = viewChoice.key === requestKey ? viewChoice.view : (data?.pdfUrl ? "pdf" : "text");
  const setView = (v) => setViewChoice({ key: requestKey, view: v });
  const page = data?.pageNumber ?? pageNumber ?? null;
  const pdfSrc = data?.pdfUrl && page ? `${data.pdfUrl}#page=${page}&view=FitH` : data?.pdfUrl;
  const muted = isDark ? "#94a3b8" : "#6b7280";
  const border = isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e5e7eb";

  const tab = (key, label, disabled) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setView(key)}
      style={{
        fontFamily: "'Poppins', sans-serif",
        fontSize: "12px",
        fontWeight: 600,
        padding: "6px 12px",
        borderRadius: "6px",
        border: view === key ? "1px solid #f97316" : border,
        background: view === key ? (isDark ? "rgba(249, 115, 22, 0.15)" : "#fff7ef") : "transparent",
        color: disabled ? muted : view === key ? "#f97316" : isDark ? "#e2e8f0" : "#374151",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );

  const renderText = () => {
    if (!data?.pageText) {
      return <p style={{ color: muted, fontSize: "13px", fontStyle: "italic" }}>No extracted text is available for this page.</p>;
    }
    const paragraph = excerptParagraph(data.pageText, data.highlight);
    if (!paragraph) {
      return <p style={{ color: muted, fontSize: "13px", fontStyle: "italic" }}>The excerpt could not be located in this page's text.</p>;
    }
    const { text, highlight } = paragraph;
    return (
      <div style={{ fontSize: "13px", lineHeight: 1.75, color: isDark ? "#e2e8f0" : "#1f2937" }}>
        <div style={{ fontWeight: 700, fontSize: "12px", color: "#f97316", marginBottom: "8px", letterSpacing: "0.02em" }}>
          Page {page}
        </div>
        <p style={{ margin: 0, textAlign: "justify" }}>
          {text.slice(0, highlight.start)}
          <mark style={{ background: isDark ? "rgba(249, 115, 22, 0.35)" : "#fed7aa", color: "inherit", borderRadius: "3px", padding: "0 2px" }}>
            {text.slice(highlight.start, highlight.end)}
          </mark>
          {text.slice(highlight.end)}
        </p>
      </div>
    );
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Source page preview"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15, 14, 23, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(920px, 100%)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: isDark ? "#15141f" : "#ffffff",
          border,
          borderRadius: "14px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.35)",
          fontFamily: "'Poppins', sans-serif",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 18px", borderBottom: border }}>
          <FileText size={18} color="#f97316" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: isDark ? "#f9fafb" : "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {data?.fileName || "Source document"}
            </div>
            <div style={{ fontSize: "12px", color: muted }}>
              {page ? `Page ${page}${data?.pageCount ? ` of ${data.pageCount}` : ""}` : "Page not identified"}
              {data && quote && !data.located ? " · quote could not be matched exactly in the text" : ""}
            </div>
          </div>
          {data?.pdfUrl && (
            <a href={pdfSrc} target="_blank" rel="noreferrer" title="Open in a new tab" style={{ color: muted, display: "inline-flex" }}>
              <ExternalLink size={16} />
            </a>
          )}
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: muted, cursor: "pointer", display: "inline-flex", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {quote && (
          <div style={{ padding: "10px 18px", borderBottom: border, fontSize: "12.5px", fontStyle: "italic", color: isDark ? "#cbd5e1" : "#4b5563", lineHeight: 1.6 }}>
            “{quote}”
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", padding: "10px 18px" }}>
          {tab("pdf", "PDF page", !data?.pdfUrl)}
          {tab("text", "Excerpt paragraph", !data?.pageText)}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "0 18px 18px" }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: muted, fontSize: "13px", padding: "40px 0", justifyContent: "center" }}>
              <Loader2 size={16} className="animate-spin" /> Loading page…
            </div>
          )}
          {error && <p style={{ color: "#dc2626", fontSize: "13px" }}>{error}</p>}
          {data && view === "pdf" && data.pdfUrl && (
            <PdfPageHighlight
              documentId={data.documentId}
              sessionId={sessionId}
              pageNumber={page}
              quote={quote}
              isDark={isDark}
            />
          )}
          {data && view === "text" && renderText()}
        </div>
      </div>
    </div>,
    document.body
  );
}
