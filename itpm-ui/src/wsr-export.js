// WSR016: write the 3-page deck model (src/wsr.js buildDeck) as a PowerPoint file and as a PDF. Libraries load on demand.
const hex = (h) => `#${h}`;
export const pdfSafe = (s) => String(s ?? "").replace(/₱/g, "PHP ").replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/÷/g, "/").replace(/→/g, "->").replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF–—‘’“”•·]/g, "");

export async function toPptx(deck) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "BPI_WIDE", width: deck.w, height: deck.h }); pptx.layout = "BPI_WIDE"; pptx.title = deck.title; pptx.company = "BPI";
  for (const page of deck.pages) {
    const slide = pptx.addSlide();
    for (const e of page) {
      if (e.t === "rect") slide.addShape(pptx.ShapeType.rect, { x: e.x, y: e.y, w: e.w, h: e.h, fill: { color: e.fill }, line: e.line ? { color: e.line, width: 0.75 } : { color: e.fill, width: 0 } });
      else if (e.t === "text") slide.addText(String(e.text), { x: e.x, y: e.y, w: e.w, h: e.h, fontSize: e.size, bold: !!e.bold, color: e.color, align: e.align || "left", valign: "top", margin: 0, fontFace: "Calibri", ...(e.fit ? { fit: "shrink" } : {}) });
      else if (e.t === "table") {
        const rows = [...(e.head ? [e.head.map((c) => ({ text: c, options: { bold: true, color: "FFFFFF", fill: { color: "B11116" } } }))] : []), ...e.rows.map((r) => r.map((c) => ({ text: String(c), options: {} })))];
        slide.addTable(rows, { x: e.x, y: e.y, w: e.w, colW: e.cols, fontSize: e.size, fontFace: "Calibri", color: "211A1A", border: { type: "solid", color: "E8E1E1", pt: 0.75 }, margin: 0.05, valign: "middle" });
      }
    }
  }
  return pptx.write({ outputType: "arraybuffer" });
}

export async function toPdf(deck) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "in", format: [deck.w, deck.h] });
  const color = (h, set) => { const n = parseInt(h, 16); doc[set]((n >> 16) & 255, (n >> 8) & 255, n & 255); };
  const text = (s, x, y, w, size, bold, col, align = "left", maxH = Infinity) => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); color(col || "211A1A", "setTextColor");
    let lines = doc.splitTextToSize(pdfSafe(s), w); const lh = size * 1.25 / 72; const max = Math.max(1, Math.floor(maxH / lh)); if (lines.length > max) lines = lines.slice(0, max);
    doc.text(lines, align === "right" ? x + w : x, y + size / 72 * 0.85, { align, baseline: "alphabetic", lineHeightFactor: 1.25 }); return lines.length * lh;
  };
  deck.pages.forEach((page, i) => {
    if (i) doc.addPage([deck.w, deck.h], "landscape");
    for (const e of page) {
      if (e.t === "rect") { color(e.fill, "setFillColor"); if (e.line) { color(e.line, "setDrawColor"); doc.setLineWidth(0.01); doc.rect(e.x, e.y, e.w, e.h, "FD"); } else doc.rect(e.x, e.y, e.w, e.h, "F"); }
      else if (e.t === "text") text(e.text, e.x, e.y, e.w, e.size, e.bold, e.color, e.align, e.h);
      else if (e.t === "table") {
        let y = e.y; const pad = 0.05; const lh = e.size * 1.25 / 72;
        const rows = [...(e.head ? [{ cells: e.head, head: true }] : []), ...e.rows.map((cells) => ({ cells }))];
        for (const r of rows) {
          doc.setFont("helvetica", r.head ? "bold" : "normal"); doc.setFontSize(e.size);
          const wrapped = r.cells.map((c, ci) => doc.splitTextToSize(pdfSafe(c), e.cols[ci] - pad * 2)); const h = Math.max(...wrapped.map((l) => l.length)) * lh + pad * 2;
          let x = e.x;
          r.cells.forEach((c, ci) => { if (r.head) { color("B11116", "setFillColor"); doc.rect(x, y, e.cols[ci], h, "F"); } color("E8E1E1", "setDrawColor"); doc.setLineWidth(0.01); doc.rect(x, y, e.cols[ci], h, "S");
            text(c, x + pad, y + pad, e.cols[ci] - pad * 2, e.size, !!r.head, r.head ? "FFFFFF" : "211A1A"); x += e.cols[ci]; });
          y += h;
        }
      }
    }
  });
  return doc.output("arraybuffer");
}
