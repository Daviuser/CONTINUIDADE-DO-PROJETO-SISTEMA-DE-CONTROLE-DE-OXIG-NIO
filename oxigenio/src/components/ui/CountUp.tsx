"use client";
import { useEffect, useState } from "react";

// Anima de 0 até o valor (700 ms). O servidor já entrega o valor final; respeita "reduzir movimento".
export function CountUp({ value }: { value: number }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    if (value === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(value); return; }
    const t0 = performance.now(); let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 700);
      setV(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    setV(0); raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{v.toLocaleString("pt-BR")}</>;
}
