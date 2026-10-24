"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

const OK = ["image/jpeg", "image/png", "image/webp"];
const MAX_ORIGINAL = 25 * 1024 * 1024;
const MAX_FINAL = 4 * 1024 * 1024;

async function toJpeg(file: File, maxSide: number, quality: number): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d"); if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h); bmp.close?.();
  return new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("blob"))), "image/jpeg", quality));
}

export function ReceiptField() {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const clear = () => { if (ref.current) ref.current.value = ""; setPreview(null); setInfo(""); };

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; setErr("");
    if (!f) return clear();
    if (!OK.includes(f.type)) { setErr("Formato inválido. Use uma imagem JPG, PNG ou WEBP."); return clear(); }
    if (f.size > MAX_ORIGINAL) { setErr("A imagem é muito grande (máximo 25 MB)."); return clear(); }
    setBusy(true);
    try { // reduz a foto (tamanho e peso) antes de enviar; o resultado é sempre JPEG
      let blob = await toJpeg(f, 1600, 0.82);
      if (blob.size > MAX_FINAL * 0.85) blob = await toJpeg(f, 1200, 0.65);
      if (blob.size > MAX_FINAL) throw new Error("grande");
      const dt = new DataTransfer(); dt.items.add(new File([blob], "recibo.jpg", { type: "image/jpeg" }));
      if (ref.current) ref.current.files = dt.files;
      setPreview(URL.createObjectURL(blob)); setInfo(`Imagem pronta (${Math.max(1, Math.round(blob.size / 1024))} KB).`);
    } catch { setErr("Não foi possível preparar esta imagem. Tente outra foto."); clear(); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">Anexar foto do recibo <span className="font-normal text-slate-400">(opcional)</span></p>
      <input ref={ref} id="receipt" name="receipt" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="sr-only" />
      {!preview ? (
        <label htmlFor="receipt" className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 transition hover:border-verde-600 hover:bg-verde-50">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-verde-700 shadow-sm"><Icon name="camera" /></span>
          <span><b className="text-grafite-900">Anexar foto do recibo</b><br /><span className="text-xs">Tirar foto ou escolher do aparelho · JPG, PNG ou WEBP</span></span>
        </label>
      ) : (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border bg-white p-3">
          <img src={preview} alt="Pré-visualização do recibo" className="max-h-48 rounded-lg border object-contain" />
          <div className="space-y-2 text-sm">
            <p className="text-slate-500">{info}</p>
            <div className="flex flex-wrap gap-2">
              <label htmlFor="receipt" className="btn btn-secondary !py-1.5 cursor-pointer">Trocar foto</label>
              <button type="button" onClick={clear} className="btn btn-secondary !py-1.5">Remover</button>
            </div>
          </div>
        </div>
      )}
      {busy && <p role="status" className="text-xs text-slate-500">Preparando a imagem…</p>}
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
    </div>
  );
}
