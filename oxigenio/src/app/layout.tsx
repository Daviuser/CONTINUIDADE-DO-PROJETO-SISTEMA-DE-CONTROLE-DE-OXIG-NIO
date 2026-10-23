import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = { title: "Sistema de Controle de Oxigênio — Hospital Municipal de Santaluz" };
export const viewport: Viewport = { themeColor: "#1e7a2e", width: "device-width", initialScale: 1 };

export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR" className={`${inter.variable} ${manrope.variable}`}><body>{children}</body></html>;
}
