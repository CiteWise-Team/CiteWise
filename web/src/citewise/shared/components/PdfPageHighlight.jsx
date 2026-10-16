// Renders one page of the original PDF with pdf.js and marks the excerpt on
// it. The browser's built-in viewer cannot highlight arbitrary text, so the
// page is drawn to a canvas and highlight boxes are placed over the matching
// text runs.

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getApiUrl } from "../../../api/http";
import { buildSearchIndex, locateQuote } from "../utils/quoteMatch";

let pdfjsPromise = null;
function loadPdfjs() {
  pdfjsPromise ||= Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return pdfjsPromise;
}

// One download per document per page load; reopening previews reuses it.
const documentCache = new Map();
function loadDocument(documentId, sessionId) {
  if (!documentCache.has(documentId)) {
    const promise = (async () => {
      const pdfjs = await loadPdfjs();
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl(`/api/v1/documents/${documentId}/pdf`), {
        headers: { "X-Session-Id": sessionId, ...(token && { Authorization: `Bearer ${token}` }) },
      });
      if (!res.ok) throw new Error(res.status === 404 ? "The original PDF is not stored for this document." : `Could not load the PDF (HTTP ${res.status}).`);
      const data = new Uint8Array(await res.arrayBuffer());
      return { pdfjs, doc: await pdfjs.getDocument({ data }).promise };
    })();
    promise.catch(() => documentCache.delete(documentId));
    documentCache.set(documentId, promise);
  }
  return documentCache.get(documentId);
}

// Joins text items the way pdf-parse does (items on one line run together,
// a new line starts a new line) and remembers which item each character is from.
function joinItems(items) {
  let text = "";
  const owner = [];
  items.forEach((item, idx) => {
    for (let c = 0; c < item.str.length; c++) { owner.push([idx, c]); }
    text += item.str;
    const sep = item.hasEOL ? "\n" : " ";
    text += sep;
    owner.push(null);
  });
  return { text, owner };
}

function highlightBoxes(pdfjs, viewport, items, owner, hit) {
  const spans = new Map();
  for (let i = hit.start; i < hit.end; i++) {
    const o = owner[i];
    if (!o) continue;
    const [idx, c] = o;
    const s = spans.get(idx);
    if (s) { s.from = Math.min(s.from, c); s.to = Math.max(s.to, c + 1); } else spans.set(idx, { from: c, to: c + 1 });
  }
  const boxes = [];
  for (const [idx, { from, to }] of spans) {
    const item = items[idx];
    const len = item.str.length || 1;
    const tx = pdfjs.Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(tx[2], tx[3]);
    const width = item.width * viewport.scale;
    boxes.push({
      left: tx[4] + (width * from) / len,
      top: tx[5] - fontHeight,
      width: Math.max(2, (width * (to - from)) / len),
      height: fontHeight * 1.2,
    });
  }
  return boxes;
}

export default function PdfPageHighlight({ documentId, sessionId, pageNumber, quote, isDark }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [page, setPage] = useState({ key: null, number: pageNumber || 1 });
  const [render, setRender] = useState({ key: null, error: null, boxes: [], size: null, pageCount: null, matched: false });

  const docKey = `${documentId}|${pageNumber}|${quote}`;
  const currentPage = page.key === docKey ? page.number : pageNumber || 1;
  const renderKey = `${docKey}|${currentPage}`;

  useEffect(() => {
    let cancelled = false;
    let task = null;
    (async () => {
      try {
        const { pdfjs, doc } = await loadDocument(documentId, sessionId);
        const pdfPage = await doc.getPage(Math.min(Math.max(1, currentPage), doc.numPages));
        const width = Math.max(320, (containerRef.current?.clientWidth ?? 820) - 2);
        const base = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: width / base.width });
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        task = pdfPage.render({ canvas, canvasContext: canvas.getContext("2d"), viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined });
        await task.promise;

        let boxes = [];
        if (quote) {
          const content = await pdfPage.getTextContent();
          const items = content.items.filter((it) => typeof it.str === "string");
          const { text, owner } = joinItems(items);
          const hit = locateQuote(buildSearchIndex(text), quote);
          if (hit) boxes = highlightBoxes(pdfjs, viewport, items, owner, hit);
        }
        if (!cancelled) {
          setRender({ key: renderKey, error: null, boxes, size: { w: viewport.width, h: viewport.height }, pageCount: doc.numPages, matched: boxes.length > 0 });
        }
      } catch (err) {
        if (!cancelled && err?.name !== "RenderingCancelledException") {
          setRender({ key: renderKey, error: err.message, boxes: [], size: null, pageCount: null, matched: false });
        }
      }
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [documentId, sessionId, currentPage, quote, renderKey]);

  const ready = render.key === renderKey;
  const muted = isDark ? "#94a3b8" : "#6b7280";
  const goTo = (n) => setPage({ key: docKey, number: n });
  const navButton = (disabled, onClick, icon, label) => (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{ background: "none", border: "none", color: disabled ? muted : "#f97316", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, display: "inline-flex", padding: 4 }}
    >
      {icon}
    </button>
  );

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, fontSize: "12px", color: muted }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {navButton(currentPage <= 1, () => goTo(currentPage - 1), <ChevronLeft size={16} />, "Previous page")}
          <span>Page {currentPage}{render.pageCount ? ` of ${render.pageCount}` : ""}</span>
          {navButton(!render.pageCount || currentPage >= render.pageCount, () => goTo(currentPage + 1), <ChevronRight size={16} />, "Next page")}
        </div>
        {ready && quote && currentPage === (pageNumber || 1) && (
          <span style={{ color: render.matched ? "#f97316" : muted }}>
            {render.matched ? "Excerpt highlighted" : "Exact passage could not be marked on this page"}
          </span>
        )}
      </div>

      {ready && render.error && <p style={{ color: "#dc2626", fontSize: "13px" }}>{render.error}</p>}
      {!ready && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: muted, fontSize: "13px", padding: "40px 0", justifyContent: "center" }}>
          <Loader2 size={16} className="animate-spin" /> Rendering page…
        </div>
      )}

      <div style={{ position: "relative", width: render.size?.w, margin: "0 auto", display: ready && !render.error ? "block" : "none", boxShadow: "0 2px 12px rgba(0,0,0,0.25)", background: "#fff" }}>
        <canvas ref={canvasRef} style={{ display: "block" }} />
        {ready && render.boxes.map((b, i) => (
          <div
            key={i}
            ref={i === 0 ? (el) => el?.scrollIntoView({ block: "center" }) : undefined}
            style={{
              position: "absolute",
              left: b.left,
              top: b.top,
              width: b.width,
              height: b.height,
              background: "rgba(250, 204, 21, 0.45)",
              mixBlendMode: "multiply",
              borderRadius: 2,
              pointerEvents: "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}
