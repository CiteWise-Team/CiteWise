// Client-side PDF export utility for CiteWise Module 3 (Synthesis Draft)
// Ensures Unicode characters (such as Turkish "İ", accented Latin, etc.)
// render accurately without replacement glyphs, and enforces standard page margins
// with multiline text wrapping to prevent text overflowing the page.

let cachedRegularBase64 = null;
let cachedBoldBase64 = null;

/**
 * Convert an ArrayBuffer to a Base64 string safely in chunks to avoid
 * call-stack size limits on large font files.
 */
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return window.btoa(binary);
}

/**
 * Fetch a TTF font file from a local path or fallback CDN and return base64.
 */
async function fetchFontBase64(localUrl, fallbackUrl) {
  try {
    const res = await fetch(localUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${localUrl}`);
    const buf = await res.arrayBuffer();
    return arrayBufferToBase64(buf);
  } catch (err) {
    if (fallbackUrl) {
      try {
        const res = await fetch(fallbackUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} from ${fallbackUrl}`);
        const buf = await res.arrayBuffer();
        return arrayBufferToBase64(buf);
      } catch (fallbackErr) {
        console.warn(`[pdfExport] Fallback font fetch also failed:`, fallbackErr.message);
      }
    }
    throw err;
  }
}

/**
 * Injects Unicode-compliant fonts (Roboto Regular & Bold) into a jsPDF instance.
 */
export async function injectUnicodeFonts(doc) {
  try {
    if (!cachedRegularBase64) {
      cachedRegularBase64 = await fetchFontBase64(
        "/fonts/Roboto-Regular.ttf",
        "https://fonts.gstatic.com/s/roboto/v51/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbWmT.ttf"
      );
    }
    if (!cachedBoldBase64) {
      cachedBoldBase64 = await fetchFontBase64(
        "/fonts/Roboto-Bold.ttf",
        "https://fonts.gstatic.com/s/roboto/v51/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWuYjammT.ttf"
      );
    }

    doc.addFileToVFS("Roboto-Regular.ttf", cachedRegularBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFileToVFS("Roboto-Bold.ttf", cachedBoldBase64);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    return true;
  } catch (err) {
    console.warn("[pdfExport] Could not load Roboto Unicode font, falling back to standard font:", err.message);
    return false;
  }
}

/**
 * Generates and downloads a clean, margin-compliant, Unicode-safe PDF.
 * 
 * @param {string} fullText - Draft content text
 * @param {string} fileName - Destination file name (without .pdf extension)
 */
export async function exportDraftToPdf(fullText, fileName) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const hasUnicodeFont = await injectUnicodeFonts(doc);
  const primaryFont = hasUnicodeFont ? "Roboto" : "Helvetica";

  // Standard 1-inch (72pt) page margins
  const margin = 72;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;

  const bodyFontSize = 10;
  const headingFontSize = 12;
  const lineHeight = 15;
  let cursorY = margin;

  const rawParas = (fullText || "").split(/\r?\n\r?\n/);

  for (let pIdx = 0; pIdx < rawParas.length; pIdx++) {
    const para = rawParas[pIdx].trim();
    if (!para) continue;

    const isHeading = /^#{1,6}\s+/.test(para) || /^(References|Background|Rationale|Research Gap)$/i.test(para);

    if (isHeading) {
      doc.setFont(primaryFont, "bold");
      doc.setFontSize(headingFontSize);
      const headingText = para.replace(/^#{1,6}\s+/, "");
      const headingLines = doc.splitTextToSize(headingText, usableWidth);

      if (cursorY + headingLines.length * (lineHeight + 3) > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      } else if (cursorY > margin) {
        cursorY += 8;
      }

      for (const hLine of headingLines) {
        doc.text(hLine, margin, cursorY);
        cursorY += lineHeight + 3;
      }
      cursorY += 4;
      continue;
    }

    // Body paragraph with multiline text wrapping
    doc.setFont(primaryFont, "normal");
    doc.setFontSize(bodyFontSize);

    const lines = doc.splitTextToSize(para, usableWidth);

    for (let i = 0; i < lines.length; i++) {
      if (cursorY + lineHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }

      const line = lines[i];
      doc.text(line, margin, cursorY);
      cursorY += lineHeight;
    }
    cursorY += 6;
  }

  doc.save(`${fileName}.pdf`);
}
