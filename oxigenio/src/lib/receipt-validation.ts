export const RECEIPT_MAX_BYTES = 4 * 1024 * 1024;

export class ReceiptValidationError extends Error {}

export function validateReceiptBytes(bytes: Uint8Array): { mime: string; ext: string } {
  if (bytes.length > RECEIPT_MAX_BYTES) {
    throw new ReceiptValidationError("A foto do recibo passa de 4 MB. Escolha uma imagem menor.");
  }

  if (bytes.length > 12 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (bytes.length > 8 && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: "image/png", ext: "png" };
  }
  if (bytes.length > 12 && Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP") {
    return { mime: "image/webp", ext: "webp" };
  }
  throw new ReceiptValidationError("A foto do recibo deve ser uma imagem JPG, PNG ou WEBP.");
}
