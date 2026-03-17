-- Enum types
CREATE TYPE client_status AS ENUM ('Lead', 'Active', 'Paused', 'Cancelled');
CREATE TYPE task_status AS ENUM ('Backlog', 'Planning', 'In Progress', 'Done');
CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
CREATE TYPE task_type AS ENUM ('Campaign', 'Creative', 'Report', 'Onboarding', 'Other');
CREATE TYPE platform_type AS ENUM ('Meta', 'Google', 'TikTok', 'LinkedIn', 'Other');
CREATE TYPE pipeline_stage AS ENUM ('New', 'Contacted', 'Proposal', 'Won', 'Lost');
CREATE TYPE finance_status AS ENUM ('Paid', 'Pending', 'Overdue');

-- Clients table
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status client_status NOT NULL DEFAULT 'Lead',
    fee DECIMAL(10, 2) DEFAULT 0,
    start_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    platform platform_type NOT NULL DEFAULT 'Meta',
    budget DECIMAL(10, 2) DEFAULT 0,
    kpi TEXT,
    review_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'Backlog',
    priority task_priority NOT NULL DEFAULT 'Medium',
    type task_type NOT NULL DEFAULT 'Other',
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales Pipeline table
CREATE TABLE public.sales_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    stage pipeline_stage NOT NULL DEFAULT 'New',
    deal_value DECIMAL(10, 2) DEFAULT 0,
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Finance table
CREATE TABLE public.finance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    status finance_status NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_pipeline_updated_at BEFORE UPDATE ON public.sales_pipeline FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_finance_updated_at BEFORE UPDATE ON public.finance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS (public access for now, can be restricted later with auth)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance ENABLE ROW LEVEL SECURITY;

-- Policies for public access (temporary until auth is added)
CREATE POLICY "Allow all access to clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sales_pipeline" ON public.sales_pipeline FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to finance" ON public.finance FOR ALL USING (true) WITH CHECK (true);