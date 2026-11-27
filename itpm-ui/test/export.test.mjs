import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toCsv, toXlsx, tableDeck, fileName } from "../src/export.js";
import { toPptx, toPdf } from "../src/wsr-export.js";

const cols = ["Project", "Budget", "Note"];
const rows = [["Loan, Origination", 52000000, 'He said "go"'], ["Branch", 8e6, "line1\nline2"]];

test("toCsv: BOM, CRLF, quotes doubled, commas and newlines quoted, numbers raw", () => {
  const c = toCsv(cols, rows);
  assert.equal(c.charCodeAt(0), 0xfeff);
  assert.equal(c.slice(1), 'Project,Budget,Note\r\n"Loan, Origination",52000000,"He said ""go"""\r\nBranch,8000000,"line1\nline2"\r\n');
});

test("toXlsx writes a workbook other tools can open, with numbers kept as numbers", async () => {
  const buf = Buffer.from(await toXlsx(cols, rows, "Projects"));
  assert.equal(buf.subarray(0, 2).toString(), "PK");
  const dir = mkdtempSync(join(tmpdir(), "xlsx-")); const f = join(dir, "t.xlsx"); writeFileSync(f, buf);
  const out = execFileSync("python3", ["-I", "-c", `
import zipfile,sys,re
z=zipfile.ZipFile(sys.argv[1]); names=z.namelist()
assert '[Content_Types].xml' in names and 'xl/workbook.xml' in names and 'xl/worksheets/sheet1.xml' in names, names
sheet=z.read('xl/worksheets/sheet1.xml').decode()
print('rows', len(re.findall(r'<row ', sheet)), 'numeric', len(re.findall(r't="n"', sheet)), 'sheet', 'Projects' in z.read('xl/workbook.xml').decode())
try:
    import openpyxl
    ws=openpyxl.load_workbook(sys.argv[1]).active
    print('openpyxl', ws['A2'].value, ws['B2'].value, ws['C3'].value.replace(chr(10),'|'))
except ImportError: print('openpyxl-missing')
`, f]).toString();
  assert.match(out, /rows 3 numeric 2 sheet True/);
  if (!/openpyxl-missing/.test(out)) assert.match(out, /openpyxl Loan, Origination 52000000 line1\|line2/);
});

test("toXlsx escapes XML characters and tolerates empty data", async () => {
  const buf = Buffer.from(await toXlsx(["A&B", "<x>"], [["1 < 2 & 3", null]], "S"));
  assert.equal(buf.subarray(0, 2).toString(), "PK");
  assert.equal(Buffer.from(await toXlsx(["A"], [], "S")).subarray(0, 2).toString(), "PK");
});

test("tableDeck splits long tables over pages with a title and page count; PPT and PDF both write them", async () => {
  const many = Array.from({ length: 70 }, (_, i) => [`Project ${i}`, i * 1000, "A fairly long description that wraps in its column ".repeat(2)]);
  const d = tableDeck({ title: "Projects", subtitle: "Exported 28 Oct 2026", cols, rows: many });
  assert.ok(d.pages.length >= 3);
  assert.match(JSON.stringify(d.pages[0]), /Projects/); assert.match(JSON.stringify(d.pages.at(-1)), new RegExp(`${d.pages.length} / ${d.pages.length}`));
  const tables = d.pages.flatMap((p) => p.filter((e) => e.t === "table")); assert.equal(tables.reduce((n, t) => n + t.rows.length, 0), 70);
  assert.equal(Buffer.from(await toPdf(d)).subarray(0, 5).toString(), "%PDF-");
  assert.equal(Buffer.from(await toPptx(d)).subarray(0, 2).toString(), "PK");
  assert.equal(tableDeck({ title: "Empty", subtitle: "", cols, rows: [] }).pages.length, 1);
});

test("fileName makes a safe name with date and extension", () => { assert.equal(fileName("Risks & Issues: Q4/26", "csv", "2026-10-28"), "Risks-Issues-Q4-26_2026-10-28.csv"); });
