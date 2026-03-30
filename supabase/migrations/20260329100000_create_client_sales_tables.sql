-- Produtos dos clientes
CREATE TABLE IF NOT EXISTS client_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Vendas dos clientes
CREATE TABLE IF NOT EXISTS client_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES client_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS client_sales_client_id_idx ON client_sales(client_id);
CREATE INDEX IF NOT EXISTS client_sales_created_at_idx ON client_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS client_products_client_id_idx ON client_products(client_id);

-- RLS
ALTER TABLE client_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_sales ENABLE ROW LEVEL SECURITY;

-- Políticas para authenticated (usuários logados)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_products' AND policyname = 'authenticated_client_products') THEN
    CREATE POLICY "authenticated_client_products" ON client_products
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_sales' AND policyname = 'authenticated_client_sales') THEN
    CREATE POLICY "authenticated_client_sales" ON client_sales
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Grants para service_role (usado pelo n8n via REST API)
GRANT SELECT, INSERT, UPDATE, DELETE ON client_products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_sales TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_sales TO anon;
