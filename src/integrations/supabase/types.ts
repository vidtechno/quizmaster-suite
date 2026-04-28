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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      group_members: {
        Row: {
          attempts_limit: number
          group_id: string
          id: string
          joined_at: string
          joined_via: string
          user_id: string
        }
        Insert: {
          attempts_limit?: number
          group_id: string
          id?: string
          joined_at?: string
          joined_via?: string
          user_id: string
        }
        Update: {
          attempts_limit?: number
          group_id?: string
          id?: string
          joined_at?: string
          joined_via?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          access_code: string
          created_at: string
          creator_id: string
          description: string | null
          id: string
          member_limit: number | null
          name: string
          updated_at: string
        }
        Insert: {
          access_code: string
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          member_limit?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          access_code?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          member_limit?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          phone: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name: string
          id: string
          phone: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          username?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          attempts_count: number
          correct_answer_index: number
          created_at: string
          error_rate: number
          explanation: string | null
          id: string
          options: Json
          position: number
          question_text: string
          test_id: string
        }
        Insert: {
          attempts_count?: number
          correct_answer_index: number
          created_at?: string
          error_rate?: number
          explanation?: string | null
          id?: string
          options: Json
          position?: number
          question_text: string
          test_id: string
        }
        Update: {
          attempts_count?: number
          correct_answer_index?: number
          created_at?: string
          error_rate?: number
          explanation?: string | null
          id?: string
          options?: Json
          position?: number
          question_text?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          answers_log: Json
          archived: boolean
          completed_at: string
          id: string
          score: number
          test_id: string
          time_spent: number
          total_questions: number
          user_id: string
        }
        Insert: {
          answers_log?: Json
          archived?: boolean
          completed_at?: string
          id?: string
          score: number
          test_id: string
          time_spent: number
          total_questions: number
          user_id: string
        }
        Update: {
          answers_log?: Json
          archived?: boolean
          completed_at?: string
          id?: string
          score?: number
          test_id?: string
          time_spent?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          answers_log: Json
          attempt_number: number
          id: string
          score: number
          started_at: string
          status: string
          submitted_at: string | null
          test_id: string
          time_spent: number
          total_questions: number
          user_id: string
        }
        Insert: {
          answers_log?: Json
          attempt_number?: number
          id?: string
          score?: number
          started_at?: string
          status?: string
          submitted_at?: string | null
          test_id: string
          time_spent?: number
          total_questions?: number
          user_id: string
        }
        Update: {
          answers_log?: Json
          attempt_number?: number
          id?: string
          score?: number
          started_at?: string
          status?: string
          submitted_at?: string | null
          test_id?: string
          time_spent?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_groups: {
        Row: {
          created_at: string
          group_id: string
          id: string
          test_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          test_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_groups_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          id: string
          max_attempts: number
          questions_per_attempt: number | null
          random_enabled: boolean
          test_code: string
          time_limit: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          max_attempts?: number
          questions_per_attempt?: number | null
          random_enabled?: boolean
          test_code: string
          time_limit?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          max_attempts?: number
          questions_per_attempt?: number | null
          random_enabled?: boolean
          test_code?: string
          time_limit?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attach_test_to_group: {
        Args: { _group_id: string; _test_code: string }
        Returns: Json
      }
      can_user_attempt_test: {
        Args: { _test_id: string; _user_id: string }
        Returns: Json
      }
      detach_test_from_group: {
        Args: { _group_id: string; _test_id: string }
        Returns: Json
      }
      gen_code6: { Args: never; Returns: string }
      gen_unique_group_code: { Args: never; Returns: string }
      gen_unique_test_code: { Args: never; Returns: string }
      get_group_leaderboard: {
        Args: { _group_id: string; _limit?: number; _test_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          pct: number
          score: number
          submitted_at: string
          time_spent: number
          total_questions: number
          user_id: string
          username: string
        }[]
      }
      get_group_member_stats: {
        Args: { _group_id: string }
        Returns: {
          attempts_limit: number
          avg_score: number
          best_score: number
          completed_count: number
          full_name: string
          joined_at: string
          last_attempt_at: string
          user_id: string
          username: string
        }[]
      }
      join_group_by_code: { Args: { _code: string }; Returns: Json }
      recompute_question_stats: {
        Args: { _test_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
