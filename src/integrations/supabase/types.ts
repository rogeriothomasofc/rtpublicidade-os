export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agency_settings: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          currency: string | null
          email: string | null
          id: string
          logo_url: string | null
          main_bank_account: string | null
          monthly_profit_goal: number | null
          monthly_revenue_goal: number | null
          name: string
          phone: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          main_bank_account?: string | null
          monthly_profit_goal?: number | null
          monthly_revenue_goal?: number | null
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          main_bank_account?: string | null
          monthly_profit_goal?: number | null
          monthly_revenue_goal?: number | null
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      automation_alert_log: {
        Row: {
          automation_id: string
          client_id: string
          id: string
          sent_at: string
        }
        Insert: {
          automation_id: string
          client_id: string
          id?: string
          sent_at?: string
        }
        Update: {
          automation_id?: string
          client_id?: string
          id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_alert_log_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_alert_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_configs: {
        Row: {
          cooldown_days: number | null
          created_at: string
          cron_expression: string
          description: string | null
          enabled: boolean
          id: string
          last_run_at: string | null
          last_run_status: string | null
          last_run_summary: Json | null
          name: string
          threshold_days: number | null
          updated_at: string
        }
        Insert: {
          cooldown_days?: number | null
          created_at?: string
          cron_expression?: string
          description?: string | null
          enabled?: boolean
          id: string
          last_run_at?: string | null
          last_run_status?: string | null
          last_run_summary?: Json | null
          name: string
          threshold_days?: number | null
          updated_at?: string
        }
        Update: {
          cooldown_days?: number | null
          created_at?: string
          cron_expression?: string
          description?: string | null
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          last_run_status?: string | null
          last_run_summary?: Json | null
          name?: string
          threshold_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          description: string | null
          execution_count: number
          id: string
          is_active: boolean
          last_executed_at: string | null
          name: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          created_at?: string
          description?: string | null
          execution_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          description?: string | null
          execution_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      banks: {
        Row: {
          balance: number
          created_at: string
          id: string
          name: string
          notes: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_activity_comments: {
        Row: {
          client_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          message: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          message: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          message?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_activity_comments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_access: {
        Row: {
          client_id: string
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_products: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sales: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string | null
          id: string
          product_id: string | null
          product_name: string
          user_id: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "client_products"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          company: string
          cpf: string | null
          created_at: string
          drive_link: string | null
          email: string | null
          fee: number | null
          form_token: string | null
          form_token_created_at: string | null
          id: string
          inscricao_estadual: string | null
          instagram_username: string | null
          meta_ads_account: string | null
          name: string
          notes: string | null
          person_type: string | null
          phone: string | null
          razao_social: string | null
          rg: string | null
          start_date: string | null
          state: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
          whatsapp_group_id: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          company: string
          cpf?: string | null
          created_at?: string
          drive_link?: string | null
          email?: string | null
          fee?: number | null
          form_token?: string | null
          form_token_created_at?: string | null
          id?: string
          inscricao_estadual?: string | null
          instagram_username?: string | null
          meta_ads_account?: string | null
          name: string
          notes?: string | null
          person_type?: string | null
          phone?: string | null
          razao_social?: string | null
          rg?: string | null
          start_date?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          whatsapp_group_id?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          company?: string
          cpf?: string | null
          created_at?: string
          drive_link?: string | null
          email?: string | null
          fee?: number | null
          form_token?: string | null
          form_token_created_at?: string | null
          id?: string
          inscricao_estadual?: string | null
          instagram_username?: string | null
          meta_ads_account?: string | null
          name?: string
          notes?: string | null
          person_type?: string | null
          phone?: string | null
          razao_social?: string | null
          rg?: string | null
          start_date?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          whatsapp_group_id?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      content_items: {
        Row: {
          best_day: string | null
          best_time: string | null
          category: string
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          image_urls: string[]
          is_used: boolean
          platform: string
          post_link: string | null
          posted_date: string | null
          run_id: string | null
          scheduled_date: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          best_day?: string | null
          best_time?: string | null
          category: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[]
          is_used?: boolean
          platform?: string
          post_link?: string | null
          posted_date?: string | null
          run_id?: string | null
          scheduled_date?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          best_day?: string | null
          best_time?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[]
          is_used?: boolean
          platform?: string
          post_link?: string | null
          posted_date?: string | null
          run_id?: string | null
          scheduled_date?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          duration_months: number | null
          end_date: string | null
          id: string
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
          value: number
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          duration_months?: number | null
          end_date?: string | null
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
          value?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          duration_months?: number | null
          end_date?: string | null
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      finance: {
        Row: {
          amount: number
          bank_id: string | null
          category: string | null
          client_id: string | null
          cost_center: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          paid_date: string | null
          recurrence: Database["public"]["Enums"]["finance_recurrence"]
          status: Database["public"]["Enums"]["finance_status"]
          type: Database["public"]["Enums"]["finance_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          bank_id?: string | null
          category?: string | null
          client_id?: string | null
          cost_center?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          paid_date?: string | null
          recurrence?: Database["public"]["Enums"]["finance_recurrence"]
          status?: Database["public"]["Enums"]["finance_status"]
          type?: Database["public"]["Enums"]["finance_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_id?: string | null
          category?: string | null
          client_id?: string | null
          cost_center?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          paid_date?: string | null
          recurrence?: Database["public"]["Enums"]["finance_recurrence"]
          status?: Database["public"]["Enums"]["finance_status"]
          type?: Database["public"]["Enums"]["finance_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          rules: string | null
          type: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          rules?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rules?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      gmb_leads: {
        Row: {
          ai_diagnosis: string | null
          ai_message: string | null
          ai_messages: Json | null
          created_at: string
          endereco: string | null
          especialidades: string | null
          followup_at: string | null
          id: string
          mensagem_enviada: string | null
          nome_empresa: string
          notes: string | null
          pipeline_lead_id: string | null
          rating: number | null
          reviews: number | null
          status: string
          telefone: string | null
          updated_at: string
          website: string | null
          website_issues: Json | null
          whatsapp_jid: string | null
        }
        Insert: {
          ai_diagnosis?: string | null
          ai_message?: string | null
          ai_messages?: Json | null
          created_at?: string
          endereco?: string | null
          especialidades?: string | null
          followup_at?: string | null
          id?: string
          mensagem_enviada?: string | null
          nome_empresa: string
          notes?: string | null
          pipeline_lead_id?: string | null
          rating?: number | null
          reviews?: number | null
          status?: string
          telefone?: string | null
          updated_at?: string
          website?: string | null
          website_issues?: Json | null
          whatsapp_jid?: string | null
        }
        Update: {
          ai_diagnosis?: string | null
          ai_message?: string | null
          ai_messages?: Json | null
          created_at?: string
          endereco?: string | null
          especialidades?: string | null
          followup_at?: string | null
          id?: string
          mensagem_enviada?: string | null
          nome_empresa?: string
          notes?: string | null
          pipeline_lead_id?: string | null
          rating?: number | null
          reviews?: number | null
          status?: string
          telefone?: string | null
          updated_at?: string
          website?: string | null
          website_issues?: Json | null
          whatsapp_jid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gmb_leads_pipeline_lead_id_fkey"
            columns: ["pipeline_lead_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_prospects: {
        Row: {
          ai_analysis: string | null
          ai_creative_concept: string | null
          ai_dm_message: string | null
          ai_proposal_brief: string | null
          bio: string | null
          created_at: string
          diagnosis_report: string | null
          email: string | null
          engagement_rate: number | null
          followers_count: number | null
          following_count: number | null
          followup_at: string | null
          full_name: string | null
          google_address: string | null
          google_rating: number | null
          google_reviews_count: number | null
          id: string
          loss_reason: string | null
          meeting_date: string | null
          niche: string | null
          notes: string | null
          pipeline_lead_id: string | null
          posts_count: number | null
          profile_url: string | null
          status: string
          updated_at: string
          username: string
          website: string | null
          website_issues: Json | null
          whatsapp: string | null
        }
        Insert: {
          ai_analysis?: string | null
          ai_creative_concept?: string | null
          ai_dm_message?: string | null
          ai_proposal_brief?: string | null
          bio?: string | null
          created_at?: string
          diagnosis_report?: string | null
          email?: string | null
          engagement_rate?: number | null
          followers_count?: number | null
          following_count?: number | null
          followup_at?: string | null
          full_name?: string | null
          google_address?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          id?: string
          loss_reason?: string | null
          meeting_date?: string | null
          niche?: string | null
          notes?: string | null
          pipeline_lead_id?: string | null
          posts_count?: number | null
          profile_url?: string | null
          status?: string
          updated_at?: string
          username: string
          website?: string | null
          website_issues?: Json | null
          whatsapp?: string | null
        }
        Update: {
          ai_analysis?: string | null
          ai_creative_concept?: string | null
          ai_dm_message?: string | null
          ai_proposal_brief?: string | null
          bio?: string | null
          created_at?: string
          diagnosis_report?: string | null
          email?: string | null
          engagement_rate?: number | null
          followers_count?: number | null
          following_count?: number | null
          followup_at?: string | null
          full_name?: string | null
          google_address?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          id?: string
          loss_reason?: string | null
          meeting_date?: string | null
          niche?: string | null
          notes?: string | null
          pipeline_lead_id?: string | null
          posts_count?: number | null
          profile_url?: string | null
          status?: string
          updated_at?: string
          username?: string
          website?: string | null
          website_issues?: Json | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_prospects_pipeline_lead_id_fkey"
            columns: ["pipeline_lead_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_accounts: {
        Row: {
          account_external_id: string
          account_name: string
          client_id: string | null
          created_at: string
          id: string
          integration_id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          account_external_id: string
          account_name: string
          client_id?: string | null
          created_at?: string
          id?: string
          integration_id: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          account_external_id?: string
          account_name?: string
          client_id?: string | null
          created_at?: string
          id?: string
          integration_id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_accounts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          integration_id: string
          message: string | null
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          integration_id: string
          message?: string | null
          status?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          integration_id?: string
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          last_sync_at: string | null
          name: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_cadence: {
        Row: {
          ai_unified_analysis: string | null
          cadence_steps: Json | null
          company: string | null
          created_at: string | null
          current_step: number | null
          email: string | null
          gmb_lead_id: string | null
          gmb_score: number | null
          heat_score: number | null
          id: string
          instagram_prospect_id: string | null
          instagram_score: number | null
          lead_name: string
          phone: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          ai_unified_analysis?: string | null
          cadence_steps?: Json | null
          company?: string | null
          created_at?: string | null
          current_step?: number | null
          email?: string | null
          gmb_lead_id?: string | null
          gmb_score?: number | null
          heat_score?: number | null
          id?: string
          instagram_prospect_id?: string | null
          instagram_score?: number | null
          lead_name: string
          phone?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          ai_unified_analysis?: string | null
          cadence_steps?: Json | null
          company?: string | null
          created_at?: string | null
          current_step?: number | null
          email?: string | null
          gmb_lead_id?: string | null
          gmb_score?: number | null
          heat_score?: number | null
          id?: string
          instagram_prospect_id?: string | null
          instagram_score?: number | null
          lead_name?: string
          phone?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_cadence_gmb_lead_id_fkey"
            columns: ["gmb_lead_id"]
            isOneToOne: false
            referencedRelation: "gmb_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_cadence_instagram_prospect_id_fkey"
            columns: ["instagram_prospect_id"]
            isOneToOne: false
            referencedRelation: "instagram_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_reminders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_dismissed: boolean
          lead_id: string
          note: string | null
          remind_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_dismissed?: boolean
          lead_id: string
          note?: string | null
          remind_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_dismissed?: boolean
          lead_id?: string
          note?: string | null
          remind_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_reminders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          created_at: string | null
          domain: string | null
          id: string
          key: string
          last_seen: string | null
          status: string
          supabase_anon_key: string | null
          supabase_db_password: string | null
          supabase_project_ref: string | null
          supabase_service_key: string | null
          supabase_url: string | null
        }
        Insert: {
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          key: string
          last_seen?: string | null
          status?: string
          supabase_anon_key?: string | null
          supabase_db_password?: string | null
          supabase_project_ref?: string | null
          supabase_service_key?: string | null
          supabase_url?: string | null
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          key?: string
          last_seen?: string | null
          status?: string
          supabase_anon_key?: string | null
          supabase_db_password?: string | null
          supabase_project_ref?: string | null
          supabase_service_key?: string | null
          supabase_url?: string | null
        }
        Relationships: []
      }
      member_permissions: {
        Row: {
          created_at: string
          id: string
          page_slug: string
          team_member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_slug: string
          team_member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_slug?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_permissions_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads: {
        Row: {
          adset_id: string
          body: string | null
          carousel_cards: Json | null
          created_at: string
          cta_type: string | null
          description: string | null
          display_url: string | null
          format: string
          headline: string | null
          id: string
          image_url: string | null
          link_url: string | null
          local_status: string
          meta_creative_id: string | null
          meta_id: string | null
          meta_status: string | null
          name: string
          notes: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          adset_id: string
          body?: string | null
          carousel_cards?: Json | null
          created_at?: string
          cta_type?: string | null
          description?: string | null
          display_url?: string | null
          format?: string
          headline?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          local_status?: string
          meta_creative_id?: string | null
          meta_id?: string | null
          meta_status?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          adset_id?: string
          body?: string | null
          carousel_cards?: Json | null
          created_at?: string
          cta_type?: string | null
          description?: string | null
          display_url?: string | null
          format?: string
          headline?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          local_status?: string
          meta_creative_id?: string | null
          meta_id?: string | null
          meta_status?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_adset_id_fkey"
            columns: ["adset_id"]
            isOneToOne: false
            referencedRelation: "meta_adsets"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_adsets: {
        Row: {
          bid_amount: number | null
          billing_event: string
          budget_type: string | null
          budget_value: number | null
          campaign_id: string
          created_at: string
          end_time: string | null
          id: string
          local_status: string
          meta_id: string | null
          meta_status: string | null
          name: string
          notes: string | null
          optimization_goal: string
          placement_type: string | null
          placements: Json | null
          start_time: string | null
          targeting: Json | null
          updated_at: string
        }
        Insert: {
          bid_amount?: number | null
          billing_event?: string
          budget_type?: string | null
          budget_value?: number | null
          campaign_id: string
          created_at?: string
          end_time?: string | null
          id?: string
          local_status?: string
          meta_id?: string | null
          meta_status?: string | null
          name: string
          notes?: string | null
          optimization_goal?: string
          placement_type?: string | null
          placements?: Json | null
          start_time?: string | null
          targeting?: Json | null
          updated_at?: string
        }
        Update: {
          bid_amount?: number | null
          billing_event?: string
          budget_type?: string | null
          budget_value?: number | null
          campaign_id?: string
          created_at?: string
          end_time?: string | null
          id?: string
          local_status?: string
          meta_id?: string | null
          meta_status?: string | null
          name?: string
          notes?: string | null
          optimization_goal?: string
          placement_type?: string | null
          placements?: Json | null
          start_time?: string | null
          targeting?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_adsets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_campaigns: {
        Row: {
          budget_type: string
          budget_value: number | null
          buying_type: string | null
          client_id: string
          created_at: string
          created_by: string | null
          end_time: string | null
          id: string
          local_status: string
          meta_id: string | null
          meta_status: string | null
          name: string
          notes: string | null
          objective: string
          special_ad_categories: string[] | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          budget_type?: string
          budget_value?: number | null
          buying_type?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: string
          local_status?: string
          meta_id?: string | null
          meta_status?: string | null
          name: string
          notes?: string | null
          objective: string
          special_ad_categories?: string[] | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          budget_type?: string
          budget_value?: number | null
          buying_type?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: string
          local_status?: string
          meta_id?: string | null
          meta_status?: string | null
          name?: string
          notes?: string | null
          objective?: string
          special_ad_categories?: string[] | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_goals: {
        Row: {
          ai_action_plan: string | null
          clients_to_close: number
          created_at: string
          id: string
          leads_per_day: number
          leads_per_month: number
          month: string
          revenue_target: number
          updated_at: string
        }
        Insert: {
          ai_action_plan?: string | null
          clients_to_close?: number
          created_at?: string
          id?: string
          leads_per_day?: number
          leads_per_month?: number
          month: string
          revenue_target?: number
          updated_at?: string
        }
        Update: {
          ai_action_plan?: string | null
          clients_to_close?: number
          created_at?: string
          id?: string
          leads_per_day?: number
          leads_per_month?: number
          month?: string
          revenue_target?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_system: boolean
          name: string
          position: number
          probability: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_system?: boolean
          name: string
          position?: number
          probability?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_system?: boolean
          name?: string
          position?: number
          probability?: number
          updated_at?: string
        }
        Relationships: []
      }
      planning_audiences: {
        Row: {
          created_at: string
          description: string | null
          estimated_size: string | null
          id: string
          name: string
          planning_id: string
          structure_id: string | null
          tags: string[] | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_size?: string | null
          id?: string
          name: string
          planning_id: string
          structure_id?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_size?: string | null
          id?: string
          name?: string
          planning_id?: string
          structure_id?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_audiences_planning_id_fkey"
            columns: ["planning_id"]
            isOneToOne: false
            referencedRelation: "planning_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_audiences_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "planning_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_campaigns: {
        Row: {
          ai_summary: string | null
          client_id: string | null
          created_at: string
          daily_budget: number | null
          end_date: string | null
          id: string
          kpis: Json | null
          name: string
          notes: string | null
          objective: string | null
          platform: string
          start_date: string | null
          status: Database["public"]["Enums"]["planning_status"]
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          client_id?: string | null
          created_at?: string
          daily_budget?: number | null
          end_date?: string | null
          id?: string
          kpis?: Json | null
          name: string
          notes?: string | null
          objective?: string | null
          platform?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["planning_status"]
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          client_id?: string | null
          created_at?: string
          daily_budget?: number | null
          end_date?: string | null
          id?: string
          kpis?: Json | null
          name?: string
          notes?: string | null
          objective?: string | null
          platform?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["planning_status"]
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_checklists: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_completed: boolean
          planning_id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          planning_id: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          planning_id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_checklists_planning_id_fkey"
            columns: ["planning_id"]
            isOneToOne: false
            referencedRelation: "planning_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_creatives: {
        Row: {
          copy_text: string | null
          created_at: string
          cta: string | null
          file_url: string | null
          format: string
          headline: string | null
          id: string
          name: string
          notes: string | null
          planning_id: string
          status: string
          structure_id: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          copy_text?: string | null
          created_at?: string
          cta?: string | null
          file_url?: string | null
          format?: string
          headline?: string | null
          id?: string
          name: string
          notes?: string | null
          planning_id: string
          status?: string
          structure_id?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          copy_text?: string | null
          created_at?: string
          cta?: string | null
          file_url?: string | null
          format?: string
          headline?: string | null
          id?: string
          name?: string
          notes?: string | null
          planning_id?: string
          status?: string
          structure_id?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_creatives_planning_id_fkey"
            columns: ["planning_id"]
            isOneToOne: false
            referencedRelation: "planning_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_creatives_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "planning_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_forecasts: {
        Row: {
          clicks: number | null
          conversions: number | null
          cpa: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          id: string
          impressions: number | null
          is_custom: boolean
          label: string
          planning_id: string
          revenue: number | null
          roas: number | null
          spend: number | null
          updated_at: string
        }
        Insert: {
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number | null
          is_custom?: boolean
          label: string
          planning_id: string
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          updated_at?: string
        }
        Update: {
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number | null
          is_custom?: boolean
          label?: string
          planning_id?: string
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_forecasts_planning_id_fkey"
            columns: ["planning_id"]
            isOneToOne: false
            referencedRelation: "planning_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_structures: {
        Row: {
          budget: number | null
          created_at: string
          id: string
          kpis: Json | null
          name: string
          objective: string | null
          planning_id: string
          position: number
          type: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          id?: string
          kpis?: Json | null
          name: string
          objective?: string | null
          planning_id: string
          position?: number
          type?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          id?: string
          kpis?: Json | null
          name?: string
          objective?: string | null
          planning_id?: string
          position?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_structures_planning_id_fkey"
            columns: ["planning_id"]
            isOneToOne: false
            referencedRelation: "planning_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_tests: {
        Row: {
          created_at: string
          hypothesis: string
          id: string
          metric: string | null
          planning_id: string
          results: string | null
          status: string
          updated_at: string
          variable: string
          variants: Json | null
          winner: string | null
        }
        Insert: {
          created_at?: string
          hypothesis: string
          id?: string
          metric?: string | null
          planning_id: string
          results?: string | null
          status?: string
          updated_at?: string
          variable: string
          variants?: Json | null
          winner?: string | null
        }
        Update: {
          created_at?: string
          hypothesis?: string
          id?: string
          metric?: string | null
          planning_id?: string
          results?: string | null
          status?: string
          updated_at?: string
          variable?: string
          variants?: Json | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_tests_planning_id_fkey"
            columns: ["planning_id"]
            isOneToOne: false
            referencedRelation: "planning_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_access_logs: {
        Row: {
          client_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_access_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_ai_summaries: {
        Row: {
          client_id: string
          created_at: string
          generated_at: string
          id: string
          summary: string
        }
        Insert: {
          client_id: string
          created_at?: string
          generated_at?: string
          id?: string
          summary: string
        }
        Update: {
          client_id?: string
          created_at?: string
          generated_at?: string
          id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_ai_summaries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_announcements: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          is_global: boolean
          is_read: boolean
          message: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          is_global?: boolean
          is_read?: boolean
          message: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          is_global?: boolean
          is_read?: boolean
          message?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_announcements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string
          created_at: string
          id: string
          is_active: boolean | null
          kpi: string | null
          name: string
          platform: Database["public"]["Enums"]["platform_type"]
          review_date: string | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          kpi?: string | null
          name: string
          platform?: Database["public"]["Enums"]["platform_type"]
          review_date?: string | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          kpi?: string | null
          name?: string
          platform?: Database["public"]["Enums"]["platform_type"]
          review_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          automations: string | null
          campaign_objective: string | null
          cancellation_terms: string | null
          client_id: string | null
          commission: number | null
          company: string | null
          created_at: string
          creatives: string | null
          id: string
          landing_pages: string | null
          margin: number | null
          media_budget: number | null
          monthly_fee: number | null
          notes: string | null
          parent_proposal_id: string | null
          penalty: string | null
          pipeline_lead_id: string | null
          plan_type: string | null
          platforms: string[] | null
          probability: number | null
          renewal_terms: string | null
          response_deadline: number | null
          responsible_member_id: string | null
          segment: string | null
          services_included: string | null
          setup_fee: number | null
          sla: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          tax_rate: number | null
          updated_at: string
          validity_months: number | null
          version: number | null
        }
        Insert: {
          automations?: string | null
          campaign_objective?: string | null
          cancellation_terms?: string | null
          client_id?: string | null
          commission?: number | null
          company?: string | null
          created_at?: string
          creatives?: string | null
          id?: string
          landing_pages?: string | null
          margin?: number | null
          media_budget?: number | null
          monthly_fee?: number | null
          notes?: string | null
          parent_proposal_id?: string | null
          penalty?: string | null
          pipeline_lead_id?: string | null
          plan_type?: string | null
          platforms?: string[] | null
          probability?: number | null
          renewal_terms?: string | null
          response_deadline?: number | null
          responsible_member_id?: string | null
          segment?: string | null
          services_included?: string | null
          setup_fee?: number | null
          sla?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          tax_rate?: number | null
          updated_at?: string
          validity_months?: number | null
          version?: number | null
        }
        Update: {
          automations?: string | null
          campaign_objective?: string | null
          cancellation_terms?: string | null
          client_id?: string | null
          commission?: number | null
          company?: string | null
          created_at?: string
          creatives?: string | null
          id?: string
          landing_pages?: string | null
          margin?: number | null
          media_budget?: number | null
          monthly_fee?: number | null
          notes?: string | null
          parent_proposal_id?: string | null
          penalty?: string | null
          pipeline_lead_id?: string | null
          plan_type?: string | null
          platforms?: string[] | null
          probability?: number | null
          renewal_terms?: string | null
          response_deadline?: number | null
          responsible_member_id?: string | null
          segment?: string | null
          services_included?: string | null
          setup_fee?: number | null
          sla?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          tax_rate?: number | null
          updated_at?: string
          validity_months?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_parent_proposal_id_fkey"
            columns: ["parent_proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_pipeline_lead_id_fkey"
            columns: ["pipeline_lead_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_responsible_member_id_fkey"
            columns: ["responsible_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          device_info: string | null
          endpoint: string
          id: string
          keys_auth: string
          keys_p256dh: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          endpoint: string
          id?: string
          keys_auth: string
          keys_p256dh: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_info?: string | null
          endpoint?: string
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sales_pipeline: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          deal_value: number | null
          duration_months: number | null
          email: string | null
          id: string
          lead_name: string
          loss_reason: string | null
          notes: string | null
          phone: string | null
          probability: number | null
          responded: boolean
          source: string
          stage: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          deal_value?: number | null
          duration_months?: number | null
          email?: string | null
          id?: string
          lead_name: string
          loss_reason?: string | null
          notes?: string | null
          phone?: string | null
          probability?: number | null
          responded?: boolean
          source?: string
          stage?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          deal_value?: number | null
          duration_months?: number | null
          email?: string | null
          id?: string
          lead_name?: string
          loss_reason?: string | null
          notes?: string | null
          phone?: string | null
          probability?: number | null
          responded?: boolean
          source?: string
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      smtp_settings: {
        Row: {
          created_at: string
          encryption: string
          from_email: string
          from_name: string
          host: string
          id: string
          is_active: boolean
          password: string
          port: number
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          encryption?: string
          from_email: string
          from_name?: string
          host: string
          id?: string
          is_active?: boolean
          password: string
          port?: number
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          encryption?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_active?: boolean
          password?: string
          port?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_subtask_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          created_at: string
          id: string
          member_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_subtask_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          recurrence: Database["public"]["Enums"]["task_recurrence"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          type: Database["public"]["Enums"]["task_type"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence?: Database["public"]["Enums"]["task_recurrence"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence?: Database["public"]["Enums"]["task_recurrence"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          role: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          role?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          role?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      user_access_logs: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_contact_labels: {
        Row: {
          created_at: string
          id: string
          label_id: string
          lead_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label_id: string
          lead_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label_id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contact_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contact_labels_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_labels: {
        Row: {
          color: string | null
          created_at: string
          id: string
          label_id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          label_id: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          label_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          direction: string
          external_id: string | null
          id: string
          lead_id: string | null
          media_type: string | null
          media_url: string | null
          message: string
          phone: string
          read_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          direction: string
          external_id?: string | null
          id?: string
          lead_id?: string | null
          media_type?: string | null
          media_url?: string | null
          message: string
          phone: string
          read_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          direction?: string
          external_id?: string | null
          id?: string
          lead_id?: string | null
          media_type?: string | null
          media_url?: string | null
          message?: string
          phone?: string
          read_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      tasks_with_subtask_counts: {
        Row: {
          client_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          project_id: string | null
          recurrence: Database["public"]["Enums"]["task_recurrence"] | null
          status: Database["public"]["Enums"]["task_status"] | null
          subtasks_done: number | null
          subtasks_total: number | null
          title: string | null
          type: Database["public"]["Enums"]["task_type"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_next_due_date: {
        Args: {
          p_due_date: string
          p_recurrence: Database["public"]["Enums"]["finance_recurrence"]
        }
        Returns: string
      }
      check_and_create_notifications: { Args: never; Returns: undefined }
      create_task_with_relations:
        | {
            Args: {
              p_assignee_ids?: string[]
              p_client_id?: string
              p_description?: string
              p_due_date?: string
              p_priority?: Database["public"]["Enums"]["task_priority"]
              p_project_id?: string
              p_recurrence?: Database["public"]["Enums"]["task_recurrence"]
              p_status?: Database["public"]["Enums"]["task_status"]
              p_subtask_titles?: string[]
              p_title: string
              p_type?: Database["public"]["Enums"]["task_type"]
            }
            Returns: string
          }
        | {
            Args: {
              p_assignee_ids?: string[]
              p_client_id?: string
              p_description?: string
              p_due_date?: string
              p_due_time?: string
              p_priority?: Database["public"]["Enums"]["task_priority"]
              p_project_id?: string
              p_recurrence?: Database["public"]["Enums"]["task_recurrence"]
              p_status?: Database["public"]["Enums"]["task_status"]
              p_subtask_titles?: string[]
              p_title: string
              p_type?: Database["public"]["Enums"]["task_type"]
            }
            Returns: string
          }
      get_client_last_sale: {
        Args: { p_client_id: string }
        Returns: {
          created_at: string
        }[]
      }
      get_dashboard_metrics: {
        Args: { period_end: string; period_start: string }
        Returns: Json
      }
      get_user_access_stats: {
        Args: never
        Returns: {
          avatar_url: string
          last_access: string
          total_sessions: number
          total_time_seconds: number
          user_id: string
          user_name: string
        }[]
      }
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      is_agency_staff: { Args: never; Returns: boolean }
      update_overdue_finance: { Args: never; Returns: undefined }
      update_overdue_tasks: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "member" | "client"
      client_status: "Lead" | "Ativo" | "Pausado" | "Cancelado"
      contract_status: "Ativo" | "Expirado" | "Cancelado"
      finance_recurrence:
        | "Nenhuma"
        | "Mensal"
        | "Trimestral"
        | "Semestral"
        | "Anual"
      finance_status: "Pago" | "Pendente" | "Atrasado"
      finance_type: "Receita" | "Despesa"
      notification_type:
        | "task_due_soon"
        | "task_overdue"
        | "payment_due_soon"
        | "payment_overdue"
        | "contract_expiring"
        | "lead_reminder"
      pipeline_stage:
        | "Novo"
        | "Contatado"
        | "Proposta"
        | "Ganho"
        | "Perdido"
        | "Qualificação"
        | "Diagnóstico"
        | "Reunião Agendada"
        | "Proposta Enviada"
        | "Negociação"
      planning_status:
        | "Rascunho"
        | "Em Aprovação"
        | "Pronto para Subir"
        | "Publicado"
        | "Em Teste"
        | "Escalando"
        | "Pausado"
      platform_type: "Meta" | "Google" | "TikTok" | "LinkedIn" | "Other"
      proposal_status:
        | "Rascunho"
        | "Enviada"
        | "Em negociação"
        | "Aprovada"
        | "Perdida"
        | "Expirada"
      task_priority: "Baixa" | "Média" | "Alta" | "Urgente"
      task_recurrence:
        | "Nenhuma"
        | "Diária"
        | "Semanal"
        | "Mensal"
        | "Trimestral"
      task_status: "A Fazer" | "Fazendo" | "Atrasado" | "Concluído"
      task_type:
        | "Campanha"
        | "Criativo"
        | "Relatório"
        | "Onboarding"
        | "Outro"
        | "Otimização"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member", "client"],
      client_status: ["Lead", "Ativo", "Pausado", "Cancelado"],
      contract_status: ["Ativo", "Expirado", "Cancelado"],
      finance_recurrence: [
        "Nenhuma",
        "Mensal",
        "Trimestral",
        "Semestral",
        "Anual",
      ],
      finance_status: ["Pago", "Pendente", "Atrasado"],
      finance_type: ["Receita", "Despesa"],
      notification_type: [
        "task_due_soon",
        "task_overdue",
        "payment_due_soon",
        "payment_overdue",
        "contract_expiring",
        "lead_reminder",
      ],
      pipeline_stage: [
        "Novo",
        "Contatado",
        "Proposta",
        "Ganho",
        "Perdido",
        "Qualificação",
        "Diagnóstico",
        "Reunião Agendada",
        "Proposta Enviada",
        "Negociação",
      ],
      planning_status: [
        "Rascunho",
        "Em Aprovação",
        "Pronto para Subir",
        "Publicado",
        "Em Teste",
        "Escalando",
        "Pausado",
      ],
      platform_type: ["Meta", "Google", "TikTok", "LinkedIn", "Other"],
      proposal_status: [
        "Rascunho",
        "Enviada",
        "Em negociação",
        "Aprovada",
        "Perdida",
        "Expirada",
      ],
      task_priority: ["Baixa", "Média", "Alta", "Urgente"],
      task_recurrence: ["Nenhuma", "Diária", "Semanal", "Mensal", "Trimestral"],
      task_status: ["A Fazer", "Fazendo", "Atrasado", "Concluído"],
      task_type: [
        "Campanha",
        "Criativo",
        "Relatório",
        "Onboarding",
        "Outro",
        "Otimização",
      ],
    },
  },
} as const
