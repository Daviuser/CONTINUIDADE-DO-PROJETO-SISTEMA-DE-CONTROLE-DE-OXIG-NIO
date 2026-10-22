# Sistema de Controle de Oxigênio — HM de Santaluz

## Rodar localmente
1. `npm install`
2. Copie `.env.example` para `.env` e preencha (crie um banco no Neon ou use Postgres local).
3. `npx prisma migrate dev --name init`
4. `npm run db:seed` (cria localizações, tipos P/M/G e o administrador)
5. `npm run dev` → http://localhost:3000

## Implantação na Vercel
1. Crie o banco no Neon (região próxima, ex.: São Paulo). Copie as duas URLs (pooled e direta).
2. Suba o código para um repositório privado (o `.env` NÃO vai ao Git).
3. Na Vercel: importe o repositório e cadastre `DATABASE_URL`, `DIRECT_URL`, `SESSION_IDLE_MINUTES`.
4. Rode `npx prisma migrate deploy` e o seed uma vez, com as variáveis de produção, a partir da sua máquina.
5. HTTPS é automático na Vercel.

## Logo
`public/brand/logo.jpeg` (arquivo fornecido pela instituição, sem alterações). Substitua mantendo o nome.
