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
      decisions: {
        Row: {
          budget: number
          created_at: string
          created_by: string
          description: string
          id: string
          meeting_id: string | null
          options_considered: Json
          outcome_status: Database["public"]["Enums"]["outcome_status"] | null
          problem_statement: string
          risk_level: Database["public"]["Enums"]["risk_level"]
          status: Database["public"]["Enums"]["decision_status"]
          success_criteria: Json | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          budget?: number
          created_at?: string
          created_by: string
          description?: string
          id?: string
          meeting_id?: string | null
          options_considered?: Json
          outcome_status?: Database["public"]["Enums"]["outcome_status"] | null
          problem_statement?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["decision_status"]
          success_criteria?: Json | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          budget?: number
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          meeting_id?: string | null
          options_considered?: Json
          outcome_status?: Database["public"]["Enums"]["outcome_status"] | null
          problem_statement?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["decision_status"]
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
      decision_status:
        | "Draft"
        | "Pending"
        | "Under Review"
        | "Approved"
        | "Rejected"
        | "Escalated"
        | "Executed"
      outcome_status: "Success" | "Partial Success" | "Failure" | "Pending"
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
      procon_type: ["pro", "con"],
      proposal_status: ["Submitted", "Under Review", "Approved", "Rejected"],
      risk_level: ["Low", "Medium", "High", "Critical"],
      workspace_role: ["admin", "approver", "viewer"],
    },
  },
} as const
