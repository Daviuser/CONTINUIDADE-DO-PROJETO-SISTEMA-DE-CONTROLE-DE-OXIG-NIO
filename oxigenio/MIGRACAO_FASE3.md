# Migration da Fase 3 (NÃO aplicada)
Arquivo: prisma/migrations/20261023000000_fase3_estoque_quantitativo/migration.sql

Impacto: remove as tabelas Cylinder, Supply, HomeExchange, StockMovement, StockBalance, Flowmeter e FlowmeterMovement
(modelo antigo) e cria o modelo quantitativo. Fluxômetros nos estados Hospital e Domicílio são copiados para
FlowmeterBalance; os que estavam em Manutenção/Indisponível NÃO são contados (recadastre se necessário).
Pacientes, usuários, localizações, tipos de cilindro e auditoria permanecem intactos.

Aplicar (somente com sua autorização): em banco local `npx prisma migrate dev`; no Neon `npx prisma migrate deploy`.
Se o `migrate dev` apontar divergência, apague essa pasta e rode `npx prisma migrate dev --create-only --name fase3_estoque_quantitativo`
para o Prisma gerar o SQL a partir do schema.prisma (fonte da verdade).
