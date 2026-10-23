// Logotipo oficial (public/brand/logo.jpeg), sem redesenho. Apenas recorte da margem branca e fusão com o fundo claro.
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <div className={"aspect-[1600/250] overflow-hidden " + className}>
      <img src="/brand/logo.jpeg" alt="Hospital Municipal de Santaluz — Prefeitura de Santaluz" className="h-full w-full select-none object-cover mix-blend-multiply" draggable={false} />
    </div>
  );
}
