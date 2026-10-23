import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "Sistema de Controle de Oxigênio — Hospital Municipal de Santaluz" };
export const viewport: Viewport = { themeColor: "#1e7a2e", width: "device-width", initialScale: 1 };

export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
