import { BrandLogo } from "@/components/BrandLogo";
import { Icon } from "@/components/Icon";

const pillars = [["shieldCheck", "Mais Saúde"], ["users", "Mais Atendimento"], ["heart", "Uma Santaluz mais forte"]];

function Shapes() {
  return (<>
    <svg aria-hidden="true" viewBox="0 0 260 150" className="pointer-events-none absolute left-0 top-0 w-36 sm:w-52 lg:w-64">
      <path d="M0 0h250C190 40 120 95 0 140z" fill="#2f8a2c" />
      <path d="M0 140C120 95 190 40 250 0" fill="none" stroke="#fff" strokeWidth="2" opacity=".7" />
      <path d="M0 152C110 114 190 64 234 30" fill="none" stroke="#f28a1e" strokeWidth="5" strokeLinecap="round" />
    </svg>
    <svg aria-hidden="true" viewBox="0 0 320 200" className="pointer-events-none absolute bottom-0 right-0 w-40 sm:w-64 lg:w-80">
      <path d="M320 70C250 90 190 140 150 200H320z" fill="#f28a1e" />
      <path d="M320 20C255 50 195 115 165 200H105C150 115 230 40 320 0z" fill="#3f9a35" />
      <path d="M320 42C262 72 206 128 180 200" fill="none" stroke="#fff" strokeWidth="2" opacity=".75" />
    </svg>
  </>);
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f3f7f4] lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <Shapes />
      {/* Foto do hospital: public/brand/hospital.jpg (opcional; se o arquivo não existir, o fundo fica limpo) */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-60 bg-cover bg-center opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)] lg:hidden" style={{ backgroundImage: "url(/brand/hospital.jpg)" }} />

      <section className="relative hidden flex-col justify-between px-14 py-14 lg:flex xl:px-20">
        <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: "url(/brand/hospital.jpg)" }} />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#f3f7f4]/60 via-[#f3f7f4]/85 to-[#f3f7f4]" />
        <div className="relative mt-16"><BrandLogo className="w-full max-w-[30rem]" /></div>
        <div className="relative max-w-md pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-verde-700">Sistema de Controle de Oxigênio</p>
          <p className="mt-3 font-display text-3xl font-semibold leading-snug text-grafite-700">Cuidando de pessoas, fortalecendo nossa cidade.</p>
          <div className="mt-5 h-1 w-12 rounded bg-verde-600" />
          <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm text-grafite-700">
            {pillars.map(([i, t]) => <li key={t} className="flex items-center gap-2"><Icon name={i} className="h-6 w-6 text-verde-600" />{t}</li>)}
          </ul>
        </div>
      </section>

      <section className="relative flex flex-col items-center justify-center px-5 pb-28 pt-10 sm:px-10 lg:pb-10">
        <div className="mb-8 w-full max-w-md lg:hidden"><BrandLogo className="w-full max-w-sm" /></div>
        <div className="w-full max-w-md lg:rounded-2xl lg:border lg:bg-white lg:p-10 lg:shadow-pop">{children}</div>
      </section>
    </main>
  );
}
