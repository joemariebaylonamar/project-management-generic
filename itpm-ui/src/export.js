// REP001: write a table as CSV, Excel, PowerPoint or PDF. PPT and PDF go through the deck writers in wsr-export.js.
const needsQuote = /[",\r\n]/;
const csvCell = (v) => { const s = v === null || v === undefined ? "" : String(v); return needsQuote.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCsv(cols, rows) {
  return "﻿" + [cols, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
const colName = (i) => { let s = ""; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
export async function toXlsx(cols, rows, sheet = "Sheet1") {
  const JSZip = (await import("jszip")).default; const z = new JSZip();
  const cell = (v, r, c, head) => {
    const ref = colName(c) + (r + 1); const st = head ? ' s="1"' : "";
    if (v === null || v === undefined || v === "") return `<c r="${ref}"${st}/>`;
    if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}" t="n"${st}><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  };
  const all = [cols, ...rows];
  const widths = cols.map((_, c) => Math.min(60, Math.max(8, ...all.map((r) => String(r[c] ?? "").split("\n").reduce((m, l) => Math.max(m, l.length), 0))) + 2));
  const body = all.map((r, i) => `<row r="${i + 1}">${r.map((v, c) => cell(v, i, c, i === 0)).join("")}</row>`).join("");
  z.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
  z.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  z.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheet).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  z.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  z.file("xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFB11116"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0"/><xf fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`);
  z.file("xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${body}</sheetData></worksheet>`);
  return z.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}

// A table as a deck: one or more pages of rows under the BPI header, paginated by estimated row height.
export function tableDeck({ title, subtitle = "", cols, rows }) {
  const W = 13.333, H = 7.5, size = 9, tw = 12.3, lh = size * 1.25 / 72, pad = 0.05, top = 1.15, maxY = 7.0;
  const weight = cols.map((c, i) => Math.min(40, Math.max(String(c).length, ...rows.slice(0, 200).map((r) => String(r[i] ?? "").length), 4)));
  const sum = weight.reduce((a, b) => a + b, 0); const w = weight.map((x) => Math.max(0.6, x / sum * tw));
  const scale = tw / w.reduce((a, b) => a + b, 0); const cw = w.map((x) => +(x * scale).toFixed(3));
  const cpl = cw.map((x) => Math.max(1, Math.floor((x - pad * 2) * 72 / (size * 0.48))));
  const clip = (v, i) => { const s = String(v ?? ""); const max = cpl[i] * 4; return s.length > max ? s.slice(0, max - 1) + "…" : s; };
  const cells = rows.map((r) => r.map((v, i) => clip(v, i)));
  const rh = (r) => Math.max(...r.map((s, i) => s.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / cpl[i])), 0))) * lh + pad * 2;
  const pages = []; let cur = [], y = top + rh(cols.map((c) => String(c)));
  for (const r of cells) { const h = rh(r); if (cur.length && y + h > maxY) { pages.push(cur); cur = []; y = top + rh(cols.map(String)); } cur.push(r); y += h; }
  pages.push(cur);
  const out = pages.map((chunk, i) => [
    { t: "rect", x: 0, y: 0, w: W, h: 0.9, fill: "B11116" },
    { t: "text", x: 0.5, y: 0.12, w: 9, h: 0.4, text: title, size: 20, bold: true, color: "FFFFFF" },
    { t: "text", x: 0.5, y: 0.52, w: 10, h: 0.3, text: subtitle, size: 11, color: "F1D9DA" },
    { t: "text", x: 10.3, y: 0.3, w: 2.6, h: 0.3, text: "BPI · TPMO", size: 12, bold: true, color: "F1D9DA", align: "right" },
    { t: "table", x: 0.5, y: top, w: tw, cols: cw, size, head: cols.map(String), rows: chunk },
    { t: "text", x: 11.3, y: 7.1, w: 1.5, h: 0.25, text: `${i + 1} / ${pages.length}`, size: 8, color: "6B6060", align: "right" },
  ]);
  return { w: W, h: H, title, pages: out };
}
export const fileName = (title, ext, date) => `${String(title).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}_${date}.${ext}`;
