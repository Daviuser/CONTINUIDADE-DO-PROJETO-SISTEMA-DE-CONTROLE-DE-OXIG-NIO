import "server-only";
import { randomUUID } from "crypto";
import { put, get, del } from "@vercel/blob";
import { StockError } from "./stock";

export type ReceiptMeta = { url: string; pathname: string; contentType: string; size: number };
export const RECEIPT_MAX_BYTES = 4 * 1024 * 1024; // limite de corpo das funções da Vercel é 4,5 MB

// Confere o conteúdo real do arquivo (não confia só no tipo informado pelo navegador)
function sniff(b: Buffer): { mime: string; ext: string } | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

// Envia ao Vercel Blob PRIVADO. Nome do arquivo gerado pelo servidor (nunca usa o nome enviado pelo usuário).
export async function saveReceipt(file: File): Promise<ReceiptMeta> {
  if (file.size > RECEIPT_MAX_BYTES) throw new StockError("A foto do recibo passa de 4 MB. Escolha uma imagem menor.");
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) throw new StockError("A foto do recibo deve ser uma imagem JPG, PNG ou WEBP.");
  const blob = await put(`recibos/${new Date().getUTCFullYear()}/${randomUUID()}.${kind.ext}`, buf, { access: "private", contentType: kind.mime });
  return { url: blob.url, pathname: blob.pathname, contentType: kind.mime, size: buf.length };
}

type BlobRead = { stream?: ReadableStream<Uint8Array> | null } | null;
export async function openReceipt(pathname: string): Promise<ReadableStream<Uint8Array> | null> {
  const r = (await get(pathname, { access: "private" })) as unknown as BlobRead;
  return r?.stream ?? null;
}

// Para embutir no PDF (só JPEG/PNG são suportados pelo gerador)
export async function receiptDataUrl(pathname: string, mime: string): Promise<string | null> {
  try {
    const stream = await openReceipt(pathname);
    if (!stream) return null;
    const buf = Buffer.from(await new Response(stream).arrayBuffer());
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch { return null; }
}

export async function removeReceipt(pathname: string) {
  try { await del(pathname); } catch { /* limpeza best-effort */ }
}
