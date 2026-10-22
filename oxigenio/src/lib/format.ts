export const fmtDate = (d?: Date | null) => d ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia" }).format(d) : "—";
export const fmtDateTime = (d?: Date | null) => d ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short", hour12: false }).format(d) : "—";
export const toInputDate = (d?: Date | null) => d ? d.toISOString().slice(0, 10) : "";
export const parseDate = (v: string) => new Date(v + "T12:00:00.000Z");
// Converte FormData em objeto, trocando campos vazios por undefined
export const formObj = (fd: FormData) =>
  Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$ACTION")).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v]));
