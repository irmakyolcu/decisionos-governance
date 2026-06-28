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
      action_approvals: {
        Row: {
          action_id: string
          action_version: number
          approver_id: string
          conditions: string | null
          created_at: string
          id: string
          rationale: string | null
          vote: string
          workspace_id: string
        }
        Insert: {
          action_id: string
          action_version: number
          approver_id: string
          conditions?: string | null
          created_at?: string
          id?: string
          rationale?: string | null
          vote: string
          workspace_id: string
        }
        Update: {
          action_id?: string
          action_version?: number
          approver_id?: string
          conditions?: string | null
          created_at?: string
          id?: string
          rationale?: string | null
          vote?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_approvals_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "action_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_approvals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      action_proposals: {
        Row: {
          action_type: string
          agent_id: string | null
          approval_status: Database["public"]["Enums"]["action_status"]
          authority_level: Database["public"]["Enums"]["authority_level"]
          content_hash: string | null
          created_at: string
          created_by: string
          decision_id: string | null
          expires_at: string | null
          id: string
          policy_result: Database["public"]["Enums"]["policy_effect"] | null
          proposed_payload: Json
          reason: string | null
          required_approver_count: number
          required_approver_roles: string[] | null
          risk_level: string
          rollback_available: boolean | null
          supporting_evidence: Json | null
          target_system: string | null
          title: string
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          action_type: string
          agent_id?: string | null
          approval_status?: Database["public"]["Enums"]["action_status"]
          authority_level?: Database["public"]["Enums"]["authority_level"]
          content_hash?: string | null
          created_at?: string
          created_by: string
          decision_id?: string | null
          expires_at?: string | null
          id?: string
          policy_result?: Database["public"]["Enums"]["policy_effect"] | null
          proposed_payload?: Json
          reason?: string | null
          required_approver_count?: number
          required_approver_roles?: string[] | null
          risk_level?: string
          rollback_available?: boolean | null
          supporting_evidence?: Json | null
          target_system?: string | null
          title: string
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          action_type?: string
          agent_id?: string | null
          approval_status?: Database["public"]["Enums"]["action_status"]
          authority_level?: Database["public"]["Enums"]["authority_level"]
          content_hash?: string | null
          created_at?: string
          created_by?: string
          decision_id?: string | null
          expires_at?: string | null
          id?: string
          policy_result?: Database["public"]["Enums"]["policy_effect"] | null
          proposed_payload?: Json
          reason?: string | null
          required_approver_count?: number
          required_approver_roles?: string[] | null
          risk_level?: string
          rollback_available?: boolean | null
          supporting_evidence?: Json | null
          target_system?: string | null
          title?: string
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_proposals_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_proposals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_items: {
        Row: {
          created_at: string
          description: string | null
          duration: number
          id: string
          linked_decision_id: string | null
          meeting_id: string
          presenter_id: string | null
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          linked_decision_id?: string | null
          meeting_id: string
          presenter_id?: string | null
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          linked_decision_id?: string | null
          meeting_id?: string
          presenter_id?: string | null
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_items_linked_decision_id_fkey"
            columns: ["linked_decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          created_at: string
          decision_id: string | null
          id: string
          latency_ms: number | null
          model: string | null
          notes: string | null
          status: string
          tokens_input: number | null
          tokens_output: number | null
          was_helpful: boolean | null
          was_overridden: boolean | null
          workspace_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          decision_id?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          notes?: string | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          was_helpful?: boolean | null
          was_overridden?: boolean | null
          workspace_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          decision_id?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          notes?: string | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          was_helpful?: boolean | null
          was_overridden?: boolean | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_evaluations: {
        Row: {
          break_even_months: number
          budget_change: number
          change_percentage: number
          decision_id: string
          evaluated_at: string
          expected_roi: number
          expected_value: number
          id: string
          impact_breakdown: Json
          risk_adjusted_roi: number
          risk_change: number
          summary: string
          timeline_change: number
        }
        Insert: {
          break_even_months?: number
          budget_change?: number
          change_percentage?: number
          decision_id: string
          evaluated_at?: string
          expected_roi?: number
          expected_value?: number
          id?: string
          impact_breakdown?: Json
          risk_adjusted_roi?: number
          risk_change?: number
          summary?: string
          timeline_change?: number
        }
        Update: {
          break_even_months?: number
          budget_change?: number
          change_percentage?: number
          decision_id?: string
          evaluated_at?: string
          expected_roi?: number
          expected_value?: number
          id?: string
          impact_breakdown?: Json
          risk_adjusted_roi?: number
          risk_change?: number
          summary?: string
          timeline_change?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_evaluations_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: true
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      anomalies: {
        Row: {
          action_id: string | null
          created_at: string
          decision_id: string | null
          description: string | null
          detector: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          signal: Json
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          action_id?: string | null
          created_at?: string
          decision_id?: string | null
          description?: string | null
          detector: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          signal?: Json
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          action_id?: string | null
          created_at?: string
          decision_id?: string | null
          description?: string | null
          detector?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          signal?: Json
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomalies_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "action_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action_id: string | null
          actor_user_id: string | null
          after_state: Json | null
          agent_id: string | null
          before_state: Json | null
          created_at: string
          decision_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          model: string | null
          policy_version: number | null
          reason: string | null
          trace_id: string | null
          workspace_id: string
        }
        Insert: {
          action_id?: string | null
          actor_user_id?: string | null
          after_state?: Json | null
          agent_id?: string | null
          before_state?: Json | null
          created_at?: string
          decision_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          model?: string | null
          policy_version?: number | null
          reason?: string | null
          trace_id?: string | null
          workspace_id: string
        }
        Update: {
          action_id?: string | null
          actor_user_id?: string | null
          after_state?: Json | null
          agent_id?: string | null
          before_state?: Json | null
          created_at?: string
          decision_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          policy_version?: number | null
          reason?: string | null
          trace_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_reports: {
        Row: {
          created_at: string
          findings: Json
          framework: string
          generated_by: string | null
          id: string
          period_end: string
          period_start: string
          scope: Json
          status: string
          summary: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          findings?: Json
          framework: string
          generated_by?: string | null
          id?: string
          period_end: string
          period_start: string
          scope?: Json
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          findings?: Json
          framework?: string
          generated_by?: string | null
          id?: string
          period_end?: string
          period_start?: string
          scope?: Json
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_alternatives: {
        Row: {
          complexity: string | null
          confidence: number | null
          created_at: string
          decision_id: string
          description: string | null
          estimated_cost: number | null
          expected_value: number | null
          id: string
          is_recommended: boolean | null
          reversibility: string | null
          risk_level: string | null
          time_to_impact: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          complexity?: string | null
          confidence?: number | null
          created_at?: string
          decision_id: string
          description?: string | null
          estimated_cost?: number | null
          expected_value?: number | null
          id?: string
          is_recommended?: boolean | null
          reversibility?: string | null
          risk_level?: string | null
          time_to_impact?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          complexity?: string | null
          confidence?: number | null
          created_at?: string
          decision_id?: string
          description?: string | null
          estimated_cost?: number | null
          expected_value?: number | null
          id?: string
          is_recommended?: boolean | null
          reversibility?: string | null
          risk_level?: string | null
          time_to_impact?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_alternatives_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_alternatives_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_approvals: {
        Row: {
          approved_at: string
          decision_id: string
          id: string
          user_id: string
        }
        Insert: {
          approved_at?: string
          decision_id: string
          id?: string
          user_id: string
        }
        Update: {
          approved_at?: string
          decision_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_approvals_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_assumptions: {
        Row: {
          confidence: number | null
          created_at: string
          decision_id: string
          id: string
          status: string | null
          text: string
          workspace_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          decision_id: string
          id?: string
          status?: string | null
          text: string
          workspace_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          decision_id?: string
          id?: string
          status?: string | null
          text?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_assumptions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_assumptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          decision_id: string
          id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          decision_id: string
          id?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          decision_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_comments_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_evidence: {
        Row: {
          contradicts: string | null
          created_at: string
          decision_id: string
          id: string
          is_verified: boolean | null
          owner: string | null
          reliability: string | null
          source: string
          source_date: string | null
          summary: string | null
          supports: string | null
          workspace_id: string
        }
        Insert: {
          contradicts?: string | null
          created_at?: string
          decision_id: string
          id?: string
          is_verified?: boolean | null
          owner?: string | null
          reliability?: string | null
          source: string
          source_date?: string | null
          summary?: string | null
          supports?: string | null
          workspace_id: string
        }
        Update: {
          contradicts?: string | null
          created_at?: string
          decision_id?: string
          id?: string
          is_verified?: boolean | null
          owner?: string | null
          reliability?: string | null
          source?: string
          source_date?: string | null
          summary?: string | null
          supports?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_evidence_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_evidence_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_pros_cons: {
        Row: {
          added_by: string
          created_at: string
          decision_id: string
          description: string
          id: string
          type: Database["public"]["Enums"]["procon_type"]
        }
        Insert: {
          added_by: string
          created_at?: string
          decision_id: string
          description: string
          id?: string
          type: Database["public"]["Enums"]["procon_type"]
        }
        Update: {
          added_by?: string
          created_at?: string
          decision_id?: string
          description?: string
          id?: string
          type?: Database["public"]["Enums"]["procon_type"]
        }
        Relationships: [
          {
            foreignKeyName: "decision_pros_cons_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_recommendations: {
        Row: {
          confidence: number | null
          created_at: string
          decision_id: string
          devils_advocate: string | null
          id: string
          invalidation_conditions: string | null
          model: string | null
          rationale: string | null
          recommended_alternative_id: string | null
          workspace_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          decision_id: string
          devils_advocate?: string | null
          id?: string
          invalidation_conditions?: string | null
          model?: string | null
          rationale?: string | null
          recommended_alternative_id?: string | null
          workspace_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          decision_id?: string
          devils_advocate?: string | null
          id?: string
          invalidation_conditions?: string | null
          model?: string | null
          rationale?: string | null
          recommended_alternative_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_recommendations_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_recommendations_recommended_alternative_id_fkey"
            columns: ["recommended_alternative_id"]
            isOneToOne: false
            referencedRelation: "decision_alternatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_recommendations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_reviews: {
        Row: {
          actual_outcome: string | null
          completed_at: string | null
          created_at: string
          decision_id: string
          delta_summary: string | null
          expected_outcome: string | null
          id: string
          lessons: string[] | null
          rating: number | null
          reviewer_id: string | null
          scheduled_for: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actual_outcome?: string | null
          completed_at?: string | null
          created_at?: string
          decision_id: string
          delta_summary?: string | null
          expected_outcome?: string | null
          id?: string
          lessons?: string[] | null
          rating?: number | null
          reviewer_id?: string | null
          scheduled_for?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          actual_outcome?: string | null
          completed_at?: string | null
          created_at?: string
          decision_id?: string
          delta_summary?: string | null
          expected_outcome?: string | null
          id?: string
          lessons?: string[] | null
          rating?: number | null
          reviewer_id?: string | null
          scheduled_for?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_reviews_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_reviews_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          decision_id: string
          id: string
          role: Database["public"]["Enums"]["decision_role_kind"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          decision_id: string
          id?: string
          role: Database["public"]["Enums"]["decision_role_kind"]
          user_id: string
          workspace_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          decision_id?: string
          id?: string
          role?: Database["public"]["Enums"]["decision_role_kind"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_roles_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_scenarios: {
        Row: {
          assumptions: Json | null
          created_at: string
          decision_id: string
          financial_impact: number | null
          id: string
          probability: number | null
          scenario: string
          summary: string | null
          workspace_id: string
        }
        Insert: {
          assumptions?: Json | null
          created_at?: string
          decision_id: string
          financial_impact?: number | null
          id?: string
          probability?: number | null
          scenario: string
          summary?: string | null
          workspace_id: string
        }
        Update: {
          assumptions?: Json | null
          created_at?: string
          decision_id?: string
          financial_impact?: number | null
          id?: string
          probability?: number | null
          scenario?: string
          summary?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_scenarios_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_scenarios_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_unknowns: {
        Row: {
          created_at: string
          decision_id: string
          id: string
          is_blocking: boolean | null
          resolved: boolean | null
          text: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          decision_id: string
          id?: string
          is_blocking?: boolean | null
          resolved?: boolean | null
          text: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          decision_id?: string
          id?: string
          is_blocking?: boolean | null
          resolved?: boolean | null
          text?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_unknowns_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_unknowns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          budget: number
          created_at: string
          created_by: string
          deadline: string | null
          decision_type: string | null
          description: string
          id: string
          meeting_id: string | null
          options_considered: Json
          outcome_status: Database["public"]["Enums"]["outcome_status"] | null
          problem_statement: string
          review_due_at: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          status: Database["public"]["Enums"]["decision_status"]
          strategic_importance: string | null
          success_criteria: Json | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          budget?: number
          created_at?: string
          created_by: string
          deadline?: string | null
          decision_type?: string | null
          description?: string
          id?: string
          meeting_id?: string | null
          options_considered?: Json
          outcome_status?: Database["public"]["Enums"]["outcome_status"] | null
          problem_statement?: string
          review_due_at?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["decision_status"]
          strategic_importance?: string | null
          success_criteria?: Json | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          budget?: number
          created_at?: string
          created_by?: string
          deadline?: string | null
          decision_type?: string | null
          description?: string
          id?: string
          meeting_id?: string | null
          options_considered?: Json
          outcome_status?: Database["public"]["Enums"]["outcome_status"] | null
          problem_statement?: string
          review_due_at?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["decision_status"]
          strategic_importance?: string | null
          success_criteria?: Json | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_records: {
        Row: {
          action_id: string
          action_version: number
          error_details: string | null
          executed_at: string
          executed_payload: Json | null
          id: string
          result: string
          rollback_at: string | null
          target_system: string | null
          verification_status: string | null
          workspace_id: string
        }
        Insert: {
          action_id: string
          action_version: number
          error_details?: string | null
          executed_at?: string
          executed_payload?: Json | null
          id?: string
          result: string
          rollback_at?: string | null
          target_system?: string | null
          verification_status?: string | null
          workspace_id: string
        }
        Update: {
          action_id?: string
          action_version?: number
          error_details?: string | null
          executed_at?: string
          executed_payload?: Json | null
          id?: string
          result?: string
          rollback_at?: string | null
          target_system?: string | null
          verification_status?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_records_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "action_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_sync_schedules: {
        Row: {
          cadence_minutes: number
          created_at: string
          created_by: string
          decision_id: string
          enabled: boolean
          id: string
          last_count: number | null
          last_run_at: string | null
          last_status: string | null
          max_results: number
          next_run_at: string
          query: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cadence_minutes?: number
          created_at?: string
          created_by: string
          decision_id: string
          enabled?: boolean
          id?: string
          last_count?: number | null
          last_run_at?: string | null
          last_status?: string | null
          max_results?: number
          next_run_at?: string
          query?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cadence_minutes?: number
          created_at?: string
          created_by?: string
          decision_id?: string
          enabled?: boolean
          id?: string
          last_count?: number | null
          last_run_at?: string | null
          last_status?: string | null
          max_results?: number
          next_run_at?: string
          query?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_sync_schedules_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: true
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gmail_sync_schedules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          kind: string
          last_synced_at: string | null
          provider: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          display_name: string
          id?: string
          kind?: string
          last_synced_at?: string | null
          provider: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          kind?: string
          last_synced_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          meeting_id: string
          user_id: string
        }
        Insert: {
          meeting_id: string
          user_id: string
        }
        Update: {
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_recordings: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          id: string
          meeting_id: string
          mime_type: string
          notes: string | null
          uploaded_at: string
          uploaded_by: string | null
          workspace_id: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          meeting_id: string
          mime_type?: string
          notes?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          meeting_id?: string
          mime_type?: string
          notes?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_recordings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          approved_at: string | null
          chairperson_id: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          is_approved: boolean
          location: string
          start_time: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          chairperson_id?: string | null
          created_at?: string
          date: string
          end_time?: string
          id?: string
          is_approved?: boolean
          location?: string
          start_time?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          chairperson_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          is_approved?: boolean
          location?: string
          start_time?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_entries: {
        Row: {
          context: string | null
          created_at: string
          created_by: string | null
          decision_id: string | null
          embedding: Json | null
          id: string
          outcome: string | null
          sensitivity: string
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          created_by?: string | null
          decision_id?: string | null
          embedding?: Json | null
          id?: string
          outcome?: string | null
          sensitivity?: string
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          created_by?: string | null
          decision_id?: string | null
          embedding?: Json | null
          id?: string
          outcome?: string | null
          sensitivity?: string
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_entries_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          severity: string
          title: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          severity?: string
          title: string
          user_id: string
          workspace_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          applicable_action_types: string[] | null
          applicable_departments: string[] | null
          category: string | null
          created_at: string
          description: string | null
          effect: Database["public"]["Enums"]["policy_effect"]
          effective_at: string | null
          expires_at: string | null
          id: string
          name: string
          owner_id: string | null
          priority: number
          rule_tree: Json
          status: string
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          applicable_action_types?: string[] | null
          applicable_departments?: string[] | null
          category?: string | null
          created_at?: string
          description?: string | null
          effect?: Database["public"]["Enums"]["policy_effect"]
          effective_at?: string | null
          expires_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          priority?: number
          rule_tree?: Json
          status?: string
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          applicable_action_types?: string[] | null
          applicable_departments?: string[] | null
          category?: string | null
          created_at?: string
          description?: string | null
          effect?: Database["public"]["Enums"]["policy_effect"]
          effective_at?: string | null
          expires_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          priority?: number
          rule_tree?: Json
          status?: string
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_evaluations: {
        Row: {
          action_id: string
          created_at: string
          details: Json | null
          id: string
          matched: boolean
          policy_id: string | null
          policy_version: number | null
          result: Database["public"]["Enums"]["policy_effect"]
          workspace_id: string
        }
        Insert: {
          action_id: string
          created_at?: string
          details?: Json | null
          id?: string
          matched?: boolean
          policy_id?: string | null
          policy_version?: number | null
          result: Database["public"]["Enums"]["policy_effect"]
          workspace_id: string
        }
        Update: {
          action_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          matched?: boolean
          policy_id?: string | null
          policy_version?: number | null
          result?: Database["public"]["Enums"]["policy_effect"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_evaluations_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "action_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_evaluations_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_evaluations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_versions: {
        Row: {
          changed_by: string | null
          created_at: string
          effect: Database["public"]["Enums"]["policy_effect"]
          id: string
          policy_id: string
          rule_tree: Json
          version: number
          workspace_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          effect: Database["public"]["Enums"]["policy_effect"]
          id?: string
          policy_id: string
          rule_tree: Json
          version: number
          workspace_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          effect?: Database["public"]["Enums"]["policy_effect"]
          id?: string
          policy_id?: string
          rule_tree?: Json
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_versions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          display_name: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          budget: number
          created_at: string
          department: string
          description: string
          id: string
          status: Database["public"]["Enums"]["proposal_status"]
          submitted_by: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          budget?: number
          created_at?: string
          department?: string
          description?: string
          id?: string
          status?: Database["public"]["Enums"]["proposal_status"]
          submitted_by: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          budget?: number
          created_at?: string
          department?: string
          description?: string
          id?: string
          status?: Database["public"]["Enums"]["proposal_status"]
          submitted_by?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_corrections: {
        Row: {
          ai_recommendation: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          decision_id: string | null
          human_choice: string | null
          id: string
          proposed_learning: string | null
          reason: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          ai_recommendation?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          decision_id?: string | null
          human_choice?: string | null
          id?: string
          proposed_learning?: string | null
          reason?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          ai_recommendation?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          decision_id?: string | null
          human_choice?: string | null
          id?: string
          proposed_learning?: string | null
          reason?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_corrections_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "twin_corrections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_preferences: {
        Row: {
          active: boolean
          category: string
          created_at: string
          created_by: string | null
          id: string
          statement: string
          weight: number
          workspace_id: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          statement: string
          weight?: number
          workspace_id: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          statement?: string
          weight?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_preferences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_profiles: {
        Row: {
          communication_style: string | null
          created_at: string
          decision_style: string | null
          id: string
          notes: string | null
          red_lines: string | null
          risk_appetite: string | null
          twin_name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          communication_style?: string | null
          created_at?: string
          decision_style?: string | null
          id?: string
          notes?: string | null
          red_lines?: string | null
          risk_appetite?: string | null
          twin_name?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          communication_style?: string | null
          created_at?: string
          decision_style?: string | null
          id?: string
          notes?: string | null
          red_lines?: string | null
          risk_appetite?: string | null
          twin_name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          accepted_at: string
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          workspace_id: string
          workspace_name: string
        }[]
      }
      get_user_workspace_id: { Args: { _user_id: string }; Returns: string }
      get_workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
      is_workspace_admin: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_writer: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      seed_workspace_demo_data: {
        Args: { _creator: string; _workspace_id: string }
        Returns: undefined
      }
    }
    Enums: {
      action_status:
        | "draft"
        | "awaiting_policy"
        | "awaiting_approval"
        | "partially_approved"
        | "approved"
        | "scheduled"
        | "executing"
        | "completed"
        | "failed"
        | "rolled_back"
        | "cancelled"
        | "expired"
      authority_level: "observe" | "prepare" | "act" | "commit"
      decision_role_kind:
        | "approver"
        | "legal"
        | "compliance"
        | "observer"
        | "contributor"
        | "owner"
      decision_status:
        | "Draft"
        | "Pending"
        | "Under Review"
        | "Approved"
        | "Rejected"
        | "Escalated"
        | "Executed"
      outcome_status: "Success" | "Partial Success" | "Failure" | "Pending"
      policy_effect:
        | "allow"
        | "allow_with_logging"
        | "require_approval"
        | "require_multi_approval"
        | "warn"
        | "block"
        | "escalate"
      procon_type: "pro" | "con"
      proposal_status: "Submitted" | "Under Review" | "Approved" | "Rejected"
      risk_level: "Low" | "Medium" | "High" | "Critical"
      workspace_role: "admin" | "approver" | "viewer"
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
      action_status: [
        "draft",
        "awaiting_policy",
        "awaiting_approval",
        "partially_approved",
        "approved",
        "scheduled",
        "executing",
        "completed",
        "failed",
        "rolled_back",
        "cancelled",
        "expired",
      ],
      authority_level: ["observe", "prepare", "act", "commit"],
      decision_role_kind: [
        "approver",
        "legal",
        "compliance",
        "observer",
        "contributor",
        "owner",
      ],
      decision_status: [
        "Draft",
        "Pending",
        "Under Review",
        "Approved",
        "Rejected",
        "Escalated",
        "Executed",
      ],
      outcome_status: ["Success", "Partial Success", "Failure", "Pending"],
      policy_effect: [
        "allow",
        "allow_with_logging",
        "require_approval",
        "require_multi_approval",
        "warn",
        "block",
        "escalate",
      ],
      procon_type: ["pro", "con"],
      proposal_status: ["Submitted", "Under Review", "Approved", "Rejected"],
      risk_level: ["Low", "Medium", "High", "Critical"],
      workspace_role: ["admin", "approver", "viewer"],
    },
  },
} as const
