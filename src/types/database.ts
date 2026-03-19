export type ClientStatus = 'Lead' | 'Ativo' | 'Pausado' | 'Cancelado';
export type TaskStatus = 'A Fazer' | 'Fazendo' | 'Atrasado' | 'Concluído';
export type TaskPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';
export type TaskType = 'Campanha' | 'Criativo' | 'Relatório' | 'Onboarding' | 'Otimização' | 'Outro';
export type TaskRecurrence = 'Nenhuma' | 'Diária' | 'Semanal' | 'Mensal' | 'Trimestral';
export type PlatformType = 'Meta' | 'Google' | 'TikTok' | 'LinkedIn' | 'Other';
export type PipelineStage = 'Novo' | 'Qualificação' | 'Diagnóstico' | 'Reunião Agendada' | 'Proposta Enviada' | 'Negociação' | 'Ganho' | 'Perdido' | 'Contatado' | 'Proposta';
export type FinanceStatus = 'Pago' | 'Pendente' | 'Atrasado';
export type FinanceType = 'Receita' | 'Despesa';

export type PersonType = 'pf' | 'pj';

export interface Client {
  id: string;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  status: ClientStatus;
  fee: number;
  start_date?: string;
  notes?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  person_type?: PersonType;
  cnpj?: string;
  cpf?: string;
  rg?: string;
  razao_social?: string;
  inscricao_estadual?: string;
  drive_link?: string;
  meta_ads_account?: string;
  whatsapp_group_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  platform: PlatformType;
  budget: number;
  kpi?: string;
  review_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  recurrence: TaskRecurrence;
  client_id?: string;
  project_id?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
  project?: Project;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type LeadSource = 'manual' | 'whatsapp_sync';

export interface SalesPipeline {
  id: string;
  lead_name: string;
  company?: string;
  email?: string;
  phone?: string;
  stage: PipelineStage;
  deal_value: number;
  probability: number;
  notes?: string;
  duration_months?: number;
  avatar_url?: string | null;
  source: LeadSource;
  created_at: string;
  updated_at: string;
}

export type FinanceCategory = 'Tráfego' | 'Ferramentas' | 'Salários' | 'Freelancer' | 'Impostos' | 'Outros';
export type FinanceRecurrence = 'Nenhuma' | 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';

export interface Finance {
  id: string;
  client_id: string | null;
  bank_id?: string | null;
  description?: string | null;
  amount: number;
  due_date: string;
  paid_date?: string | null;
  status: FinanceStatus;
  type: FinanceType;
  category?: FinanceCategory | null;
  cost_center?: string | null;
  recurrence: FinanceRecurrence;
  created_at: string;
  updated_at: string;
  client?: Client;
  bank?: Bank;
}

export interface Bank {
  id: string;
  name: string;
  type: string;
  balance: number;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceCategoryRecord {
  id: string;
  name: string;
  type: string;
  color: string;
  is_active: boolean;
  rules?: string | null;
  created_at: string;
  updated_at: string;
}
