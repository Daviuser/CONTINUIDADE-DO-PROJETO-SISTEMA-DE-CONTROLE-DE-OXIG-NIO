-- Ajuste dos locais internos (migration complementar; a 20261026000000_locais_internos já foi aplicada e NÃO é alterada).
--  * Novo local: "Sala ao lado da Sala de Parto".
--  * "Emergência e Estabilização" é separado em "Emergência" e "Estabilização".
-- Somente dados da tabela "Location": nenhuma tabela, coluna ou enum é alterada e nenhuma linha é apagada.

-- 1) A linha existente (MESMO id) passa a guardar o saldo anterior. Saldos, movimentações, histórico
--    e máquinas continuam ligados a ela, sem cópia e sem divisão automática.
UPDATE "Location"
SET "code" = 'EMERGENCIA_ESTAB_ANTERIOR',
    "name" = 'Emergência e Estabilização (saldo anterior)'
WHERE "code" = 'EMERGENCIA'
  AND NOT EXISTS (SELECT 1 FROM "Location" WHERE "code" = 'EMERGENCIA_ESTAB_ANTERIOR');

-- 2) Novos locais, vazios (idempotente: "code" é único; rodar de novo não duplica nada).
INSERT INTO "Location" ("id", "code", "name")
SELECT gen_random_uuid()::text, v.code, v.name FROM (VALUES
  ('SALA_AO_LADO_PARTO', 'Sala ao lado da Sala de Parto'),
  ('EMERGENCIA',         'Emergência'),
  ('ESTABILIZACAO',      'Estabilização')
) AS v(code, name)
ON CONFLICT ("code") DO NOTHING;
