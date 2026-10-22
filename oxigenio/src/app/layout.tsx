import "./globals.css";
export const metadata = { title: "Sistema de Controle de Oxigênio — Hospital Municipal de Santaluz" };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body className="bg-neutral-50 text-grafite-900 antialiased">{children}</body></html>;
}
