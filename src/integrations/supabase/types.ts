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
      group_announcements: {
        Row: {
          body: string
          created_at: string
          creator_id: string
          group_id: string
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          creator_id: string
          group_id: string
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          creator_id?: string
          group_id?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
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
      group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
      test_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          test_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          test_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          test_id?: string
          user_id?: string
        }
        Relationships: []
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_group: { Args: { _group_id: string }; Returns: Json }
      admin_delete_test: { Args: { _test_id: string }; Returns: Json }
      admin_delete_user: { Args: { _user_id: string }; Returns: Json }
      admin_list_groups: {
        Args: { _limit?: number; _q: string }
        Returns: {
          access_code: string
          created_at: string
          creator_id: string
          creator_name: string
          id: string
          member_count: number
          name: string
          test_count: number
        }[]
      }
      admin_list_tests: {
        Args: { _limit?: number; _q: string }
        Returns: {
          attempt_count: number
          created_at: string
          creator_id: string
          creator_name: string
          id: string
          question_count: number
          test_code: string
          title: string
        }[]
      }
      admin_recent_activity: {
        Args: { _limit?: number }
        Returns: {
          at: string
          kind: string
          subtitle: string
          title: string
        }[]
      }
      admin_search_users: {
        Args: { _limit?: number; _q: string }
        Returns: {
          attempt_count: number
          created_at: string
          full_name: string
          id: string
          is_admin: boolean
          phone: string
          test_count: number
          username: string
        }[]
      }
      admin_toggle_admin: { Args: { _user_id: string }; Returns: Json }
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
      get_admin_stats: { Args: never; Returns: Json }
      get_global_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          avg_pct: number
          completed_count: number
          full_name: string
          total_score: number
          user_id: string
          username: string
        }[]
      }
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
      get_group_stats: { Args: { _group_id: string }; Returns: Json }
      get_test_review_summary: { Args: { _test_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_group_creator: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_test_creator: {
        Args: { _test_id: string; _user_id: string }
        Returns: boolean
      }
      join_group_by_code: { Args: { _code: string }; Returns: Json }
      recompute_question_stats: {
        Args: { _test_id: string }
        Returns: undefined
      }
      user_can_view_test: {
        Args: { _test_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
