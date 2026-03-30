-- Preenche client_id nas vendas onde está NULL
-- Cruza o user_id da venda com a tabela client_portal_access para descobrir o cliente
UPDATE client_sales cs
SET client_id = cpa.client_id
FROM client_portal_access cpa
WHERE cs.user_id = cpa.user_id
  AND cs.client_id IS NULL;

-- Mesma coisa para client_products
UPDATE client_products cp
SET client_id = cpa.client_id
FROM client_portal_access cpa
WHERE cp.user_id = cpa.user_id
  AND cp.client_id IS NULL;
