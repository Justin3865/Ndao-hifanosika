import test from "node:test";
import assert from "node:assert/strict";
import { buildXlsx, colName, crc32, safeSheetName, xmlEscape } from "../xlsx";

test("crc32 : valeur de référence (« 123456789 » = CBF43926)", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("colName / safeSheetName / xmlEscape", () => {
  assert.equal(colName(0), "A"); assert.equal(colName(25), "Z"); assert.equal(colName(26), "AA"); assert.equal(colName(701), "ZZ");
  assert.equal(safeSheetName("Bénéficiaires: 2026/Q1?", "x"), "Bénéficiaires 2026 Q1");
  assert.equal(safeSheetName("   ", "Feuille1"), "Feuille1");
  assert.equal(safeSheetName("a".repeat(50), "x").length, 31);
  assert.equal(xmlEscape('a&b<c>"d"\u0001'), "a&amp;b&lt;c&gt;&quot;d&quot;");
});

test("buildXlsx produit un zip valide (signature PK, fin de répertoire central)", () => {
  const bytes = buildXlsx([{ name: "Test", headers: ["A", "B"], rows: [[1, "x"], [null, true]] }]);
  assert.equal(bytes[0], 0x50); assert.equal(bytes[1], 0x4b);              // "PK"
  const tail = Array.from(bytes.slice(bytes.length - 22, bytes.length - 18));
  assert.deepEqual(tail, [0x50, 0x4b, 0x05, 0x06]);                        // EOCD
  const text = Buffer.from(bytes).toString("latin1");
  assert.ok(text.includes("xl/worksheets/sheet1.xml") && text.includes("[Content_Types].xml"));
});

test("noms de feuilles dupliqués rendus uniques", () => {
  const bytes = Buffer.from(buildXlsx([{ name: "X", headers: [], rows: [] }, { name: "x", headers: [], rows: [] }])).toString("latin1");
  assert.ok(bytes.includes('name="X"') && bytes.includes('name="x 2"'));
});
