import { describe, expect, it } from "vitest";
import { RECEIPT_MAX_BYTES, ReceiptValidationError, validateReceiptBytes } from "./receipt-validation";

describe("validateReceiptBytes", () => {
  it.each([
    ["JPEG", Uint8Array.from([0xff, 0xd8, 0xff, ...new Array(10).fill(0)]), { mime: "image/jpeg", ext: "jpg" }],
    ["PNG", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]), { mime: "image/png", ext: "png" }],
    ["WEBP", Uint8Array.from([..."RIFF"].map(c => c.charCodeAt(0)).concat([0, 0, 0, 0], [..."WEBP"].map(c => c.charCodeAt(0)), [0])), { mime: "image/webp", ext: "webp" }],
  ])("accepts a valid %s signature", (_label, bytes, expected) => {
    expect(validateReceiptBytes(bytes as Uint8Array)).toEqual(expected);
  });

  it("rejects unsupported content based on bytes, regardless of browser MIME", () => {
    expect(() => validateReceiptBytes(new Uint8Array(32))).toThrow(ReceiptValidationError);
  });

  it("rejects files larger than 4 MB", () => {
    expect(() => validateReceiptBytes(new Uint8Array(RECEIPT_MAX_BYTES + 1))).toThrow("passa de 4 MB");
  });
});
