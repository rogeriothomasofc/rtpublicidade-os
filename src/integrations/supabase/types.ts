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
    PostgrestVersion: "14.1"
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
      calendar_event_mappings: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          google_event_id: string
          id: string
          last_synced_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          google_event_id: string
          id?: string
          last_synced_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          google_event_id?: string
          id?: string
          last_synced_at?: string
          updated_at?: string
          user_id?: string
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
          zip_code?: string | null
        }
        Relationships: []
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
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      lead_reminders: {
        Row: {
          created_at: string
          id: string
          is_dismissed: boolean
          lead_id: string
          note: string | null
          remind_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_dismissed?: boolean
          lead_id: string
          note?: string | null
          remind_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
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
      pipeline_lead_activities: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          lead_id: string
          position: number
          stage_activity_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          lead_id: string
          position?: number
          stage_activity_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          lead_id?: string
          position?: number
          stage_activity_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_lead_activities_stage_activity_id_fkey"
            columns: ["stage_activity_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stage_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stage_activities: {
        Row: {
          created_at: string
          id: string
          position: number
          stage_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          stage_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          stage_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stage_activities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
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
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          endpoint: string
          id?: string
          keys_auth: string
          keys_p256dh: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          endpoint?: string
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          updated_at?: string
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
          source: string
          stage: Database["public"]["Enums"]["pipeline_stage"]
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
          source?: string
          stage?: Database["public"]["Enums"]["pipeline_stage"]
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
          source?: string
          stage?: Database["public"]["Enums"]["pipeline_stage"]
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
      get_dashboard_metrics: {
        Args: { period_end: string; period_start: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
