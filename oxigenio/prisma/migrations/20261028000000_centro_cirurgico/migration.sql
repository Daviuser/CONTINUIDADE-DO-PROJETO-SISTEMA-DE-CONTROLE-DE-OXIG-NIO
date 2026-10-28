-- Adiciona Centro Cirúrgico à tabela de localizações existente sem alterar ou remover registros.
INSERT INTO "Location" ("id", "code", "name")
SELECT gen_random_uuid()::text, 'CENTRO_CIRURGICO', 'Centro Cirúrgico'
WHERE NOT EXISTS (SELECT 1 FROM "Location" WHERE "code" = 'CENTRO_CIRURGICO');
