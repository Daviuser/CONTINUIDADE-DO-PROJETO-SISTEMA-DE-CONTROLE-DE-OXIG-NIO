/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import "server-only";
import fs from "fs";
import path from "path";
import { fmtDateTime } from "@/lib/format";
import type { Report, Block } from "./data";

const GREEN = "#1e7a2e", INK = "#1c2733", MUTED = "#6b7a73";
let logoCache: string | null | undefined;

// Logotipo oficial: public/brand/logo.jpeg (sem redesenho). Se o arquivo não for encontrado, o cabeçalho usa o nome da instituição em texto.
function logo(): string | null {
  if (logoCache !== undefined) return logoCache;
  try { logoCache = "data:image/jpeg;base64," + fs.readFileSync(path.join(process.cwd(), "public", "brand", "logo.jpeg")).toString("base64"); }
  catch { logoCache = null; }
  return logoCache;
}

function printer() {
  const PdfPrinter = require("pdfmake");
  const mod = require("pdfmake/build/vfs_fonts");
  const vfs = mod?.pdfMake?.vfs ?? mod?.vfs ?? mod;
  const f = (n: string) => Buffer.from(vfs[n], "base64");
  return new PdfPrinter({ Roboto: { normal: f("Roboto-Regular.ttf"), bold: f("Roboto-Medium.ttf"), italics: f("Roboto-Italic.ttf"), bolditalics: f("Roboto-MediumItalic.ttf") } });
}

const line = (w: number) => ({ canvas: [{ type: "line", x1: 0, y1: 0, x2: w, y2: 0, lineWidth: 0.8, lineColor: "#3b4a43" }] });

function table(b: Block) {
  const n = b.columns.length;
  const al = (i: number) => b.columns[i].align ?? "left";
  const body: any[][] = [b.columns.map((c, i) => ({ text: c.header, bold: true, color: INK, alignment: al(i) }))];
  b.rows.forEach(r => body.push(r.map((v, i) => ({ text: String(v ?? ""), alignment: al(i) }))));
  if (!b.rows.length) body.push([{ text: "Nenhum registro encontrado para os filtros informados.", colSpan: n, alignment: "center", color: MUTED, margin: [0, 8, 0, 8] }, ...Array(n - 1).fill({})]);
  if (b.totals) body.push(b.totals.map((v, i) => ({ text: String(v), bold: true, fillColor: "#eef3f0", alignment: al(i) })));
  const out: any[] = [];
  if (b.heading) out.push({ text: b.heading, bold: true, fontSize: 9.5, color: GREEN, margin: [0, 10, 0, 5], keepWithNext: true });
  out.push({ fontSize: n > 8 ? 7.5 : 8.5, table: { headerRows: 1, dontBreakRows: true, keepWithHeaderRows: 1, widths: b.columns.map(c => c.width ?? "*"), body },
    layout: { hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 0.8 : 0.4), vLineWidth: () => 0, hLineColor: () => "#c3cfc8",
      fillColor: (row: number) => (row === 0 ? "#e4f1e1" : null), paddingTop: () => 4, paddingBottom: () => 4, paddingLeft: () => 5, paddingRight: () => 5 } });
  if (b.note) out.push({ text: b.note, fontSize: 7.5, color: MUTED, margin: [0, 4, 0, 0] });
  return out;
}

function signatures(labels: string[], usable: number) {
  const gap = 30, n = labels.length;
  const colW = (usable - gap * (n - 1)) / n, lw = colW - 6;
  const small = (t: string) => ({ text: t, fontSize: 7, color: MUTED, margin: [0, 2, 0, 0] });
  return { unbreakable: true, margin: [0, 34, 0, 0], columnGap: gap, columns: labels.map(l => ({ width: "*", stack: [
    { text: l, bold: true, fontSize: 9, margin: [0, 0, 0, 30] }, line(lw), small("Nome do responsável"),
    { ...line(lw), margin: [0, 26, 0, 0] }, small("Cargo ou função"),
    { ...line(lw), margin: [0, 30, 0, 0] }, small("Assinatura"),
    { text: "Data: ______ / ______ / __________", fontSize: 9, margin: [0, 16, 0, 0] } ] })) };
}

export function renderPdf(r: Report, by: { name: string }): Promise<Buffer> {
  const usable = r.landscape ? 770 : 523;
  const lg = logo();
  const def: any = {
    pageSize: "A4", pageOrientation: r.landscape ? "landscape" : "portrait", pageMargins: [36, 78, 36, 52],
    info: { title: r.title, author: "Hospital Municipal de Santaluz", subject: "Sistema de Controle de Oxigênio" },
    defaultStyle: { font: "Roboto", fontSize: 9, color: INK },
    header: () => ({ margin: [36, 22, 36, 0], stack: [
      { columns: [
        lg ? { width: 190, image: lg, fit: undefined, cover: { width: 190, height: 31, valign: "center", align: "center" }, height: 31 } : { width: 190, text: "HOSPITAL MUNICIPAL DE SANTALUZ", bold: true, fontSize: 11, color: GREEN },
        { width: "*", alignment: "right", stack: [{ text: "Hospital Municipal de Santaluz", bold: true, fontSize: 9 }, { text: "Sistema de Controle de Oxigênio", fontSize: 8, color: MUTED }] } ] },
      { ...line(usable), margin: [0, 8, 0, 0] }] }),
    footer: (page: number, count: number) => ({ margin: [36, 12, 36, 0], columns: [
      { text: "Hospital Municipal de Santaluz — Sistema de Controle de Oxigênio", fontSize: 7, color: MUTED },
      { text: `Página ${page} de ${count}`, fontSize: 7, color: MUTED, alignment: "right" }] }),
    content: [
      { columns: [
        { width: "*", stack: [{ text: r.title, fontSize: 15, bold: true }, { text: r.period, fontSize: 9, color: "#4b5a53", margin: [0, 3, 0, 0] }, ...(r.filters ? [{ text: r.filters, fontSize: 8, color: MUTED, margin: [0, 2, 0, 0] }] : [])] },
        { width: "auto", alignment: "right", stack: [{ text: `Emitido em: ${fmtDateTime(new Date())}`, fontSize: 8 }, { text: `Emitido por: ${by.name}`, fontSize: 8 }] }], margin: [0, 0, 0, 6] },
      ...r.blocks.flatMap(table),
      signatures(r.signatures, usable),
    ],
  };
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = printer().createPdfKitDocument(def);
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.end();
    } catch (e) { reject(e); }
  });
}
