"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Barra de progresso no topo: aparece ao navegar por links e ao enviar formulários, e some quando a página responde.
export function NavProgress() {
  const key = usePathname() + "?" + useSearchParams().toString();
  const [w, setW] = useState(0);
  const [show, setShow] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const safe = useRef<ReturnType<typeof setTimeout> | null>(null);
  const obs = useRef<MutationObserver | null>(null);
  const startedAt = useRef(0);

  const stop = () => {
    if (tick.current) clearInterval(tick.current);
    if (safe.current) clearTimeout(safe.current);
    obs.current?.disconnect(); obs.current = null; tick.current = safe.current = null;
  };
  const done = () => {
    stop();
    document.querySelectorAll("[data-submitting]").forEach(f => f.removeAttribute("data-submitting"));
    setW(100);
    setTimeout(() => { setShow(false); setW(0); }, 260);
  };
  const start = (watchDom: boolean) => {
    stop(); startedAt.current = Date.now(); setShow(true); setW(8);
    tick.current = setInterval(() => setW(v => v + (90 - v) * 0.08), 200);
    safe.current = setTimeout(done, 15000);
    if (watchDom) { // envio de formulário que volta para a mesma URL: a troca do conteúdo indica o fim
      obs.current = new MutationObserver(() => { if (Date.now() - startedAt.current > 250) done(); });
      obs.current.observe(document.body, { childList: true, subtree: true });
    }
  };

  useEffect(() => { done(); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/relatorios/pdf")) return;
      if (url.pathname + url.search === location.pathname + location.search) return;
      start(false);
    };
    const onSubmit = (e: SubmitEvent) => {
      if (e.defaultPrevented) return;
      (e.target as HTMLFormElement).setAttribute("data-submitting", "");
      start(true);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => { document.removeEventListener("click", onClick, true); document.removeEventListener("submit", onSubmit, true); stop(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]" style={{ opacity: show ? 1 : 0, transition: "opacity .25s" }}>
      <div className="h-full bg-gradient-to-r from-verde-600 via-verde-500 to-laranja-500 shadow-[0_0_8px_rgba(63,154,53,.6)]" style={{ width: w + "%", transition: "width .2s ease-out" }} />
    </div>
  );
}
