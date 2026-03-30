-- Função que busca a última venda de um cliente
-- Aceita tanto registros com client_id direto quanto pelo user_id vinculado
CREATE OR REPLACE FUNCTION get_client_last_sale(p_client_id uuid)
RETURNS TABLE(created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT cs.created_at
  FROM client_sales cs
  WHERE
    cs.client_id = p_client_id
    OR cs.user_id IN (
      SELECT cpa.user_id
      FROM client_portal_access cpa
      WHERE cpa.client_id = p_client_id
    )
  ORDER BY cs.created_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_client_last_sale(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION get_client_last_sale(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_last_sale(uuid) TO anon;
