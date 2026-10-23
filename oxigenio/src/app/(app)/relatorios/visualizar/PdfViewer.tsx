"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export function PdfViewer({ src, downloadHref }: { src: string; downloadHref: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const print = () => {
    try { ref.current?.contentWindow?.focus(); ref.current?.contentWindow?.print(); }
    catch { window.open(src, "_blank"); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/relatorios" className="btn btn-secondary"><Icon name="arrowLeft" className="h-4 w-4" />Voltar</Link>
        <a href={downloadHref} className="btn btn-primary">Baixar PDF</a>
        <button type="button" onClick={print} className="btn btn-secondary">Imprimir</button>
        <a href={src} target="_blank" rel="noopener" className="btn btn-secondary">Abrir em nova aba</a>
      </div>
      <div className="card relative h-[78vh] overflow-hidden">
        {!loaded && <div className="skeleton absolute inset-0 grid place-items-center text-sm text-slate-500" role="status">Gerando PDF…</div>}
        <iframe ref={ref} src={src} title="Visualização do relatório em PDF" onLoad={() => setLoaded(true)} className="h-full w-full" />
      </div>
      <p className="text-xs text-slate-500">Se o PDF não aparecer neste quadro (comum em celulares), use “Abrir em nova aba” ou “Baixar PDF”.</p>
    </div>
  );
}
