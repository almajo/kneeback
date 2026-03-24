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
      community_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          device_id: string
          user_id: string | null
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          device_id: string
          user_id?: string | null
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          device_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          device_id: string
          author_animal_name: string | null
          author_phase: string | null
          user_id: string | null
          upvote_count: number
          moderation_status: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          device_id: string
          author_animal_name?: string | null
          author_phase?: string | null
          user_id?: string | null
          upvote_count?: number
          moderation_status?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          device_id?: string
          author_animal_name?: string | null
          author_phase?: string | null
          user_id?: string | null
          upvote_count?: number
          moderation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          body: string
          created_at: string
          id: string
          post_type: string
          title: string
          upvote_count: number
          device_id: string
          author_animal_name: string | null
          author_phase: string | null
          user_id: string | null
          moderation_status: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_type: string
          title: string
          upvote_count?: number
          device_id: string
          author_animal_name?: string | null
          author_phase?: string | null
          user_id?: string | null
          moderation_status?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_type?: string
          title?: string
          upvote_count?: number
          device_id?: string
          author_animal_name?: string | null
          author_phase?: string | null
          user_id?: string | null
          moderation_status?: string
        }
        Relationships: []
      }
      community_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          device_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          device_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          device_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          body: string
          id: string
          phase: Database["public"]["Enums"]["exercise_phase"] | null
          sort_order: number
          title: string
          trigger_condition: Json | null
          type: Database["public"]["Enums"]["content_type"]
        }
        Insert: {
          body?: string
          id?: string
          phase?: Database["public"]["Enums"]["exercise_phase"] | null
          sort_order?: number
          title: string
          trigger_condition?: Json | null
          type: Database["public"]["Enums"]["content_type"]
        }
        Update: {
          body?: string
          id?: string
          phase?: Database["public"]["Enums"]["exercise_phase"] | null
          sort_order?: number
          title?: string
          trigger_condition?: Json | null
          type?: Database["public"]["Enums"]["content_type"]
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          created_at: string | null
          date: string
          id: string
          is_rest_day: boolean
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          is_rest_day?: boolean
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          is_rest_day?: boolean
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exercise_logs: {
        Row: {
          actual_reps: number
          actual_sets: number
          completed: boolean
          daily_log_id: string
          id: string
          user_exercise_id: string
        }
        Insert: {
          actual_reps?: number
          actual_sets?: number
          completed?: boolean
          daily_log_id: string
          id?: string
          user_exercise_id: string
        }
        Update: {
          actual_reps?: number
          actual_sets?: number
          completed?: boolean
          daily_log_id?: string
          id?: string
          user_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_logs_user_exercise_id_fkey"
            columns: ["user_exercise_id"]
            isOneToOne: false
            referencedRelation: "user_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string
          default_hold_seconds: number | null
          default_reps: number
          default_sets: number
          description: string
          id: string
          muscle_groups:
            | Database["public"]["Enums"]["exercise_muscle_group"][]
            | null
          name: string
          phase_end: string | null
          phase_start: string
          primary_exercise_id: string | null
          role: Database["public"]["Enums"]["exercise_role"]
          sort_order: number
          status: Database["public"]["Enums"]["exercise_status"]
          submitted_by: string | null
        }
        Insert: {
          category?: string
          default_hold_seconds?: number | null
          default_reps?: number
          default_sets?: number
          description?: string
          id?: string
          muscle_groups?:
            | Database["public"]["Enums"]["exercise_muscle_group"][]
            | null
          name: string
          phase_end?: string | null
          phase_start: string
          primary_exercise_id?: string | null
          role: Database["public"]["Enums"]["exercise_role"]
          sort_order?: number
          status?: Database["public"]["Enums"]["exercise_status"]
          submitted_by?: string | null
        }
        Update: {
          category?: string
          default_hold_seconds?: number | null
          default_reps?: number
          default_sets?: number
          description?: string
          id?: string
          muscle_groups?:
            | Database["public"]["Enums"]["exercise_muscle_group"][]
            | null
          name?: string
          phase_end?: string | null
          phase_start?: string
          primary_exercise_id?: string | null
          role?: Database["public"]["Enums"]["exercise_role"]
          sort_order?: number
          status?: Database["public"]["Enums"]["exercise_status"]
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_primary_exercise_id_fkey"
            columns: ["primary_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          category: string
          created_at: string | null
          date: string
          id: string
          notes: string | null
          template_key: string | null
          title: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          template_key?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          template_key?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          completion_congrats_enabled: boolean
          daily_reminder_time: string
          evening_nudge_enabled: boolean
          evening_nudge_time: string
          id: string
          user_id: string
        }
        Insert: {
          completion_congrats_enabled?: boolean
          daily_reminder_time?: string
          evening_nudge_enabled?: boolean
          evening_nudge_time?: string
          id?: string
          user_id: string
        }
        Update: {
          completion_congrats_enabled?: boolean
          daily_reminder_time?: string
          evening_nudge_enabled?: boolean
          evening_nudge_time?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          expo_push_token: string | null
          graft_type: Database["public"]["Enums"]["graft_type"] | null
          id: string
          knee_side: Database["public"]["Enums"]["knee_side"]
          name: string | null
          surgery_date: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          expo_push_token?: string | null
          graft_type?: Database["public"]["Enums"]["graft_type"] | null
          id: string
          knee_side: Database["public"]["Enums"]["knee_side"]
          name?: string | null
          surgery_date?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          expo_push_token?: string | null
          graft_type?: Database["public"]["Enums"]["graft_type"]
          id?: string
          knee_side?: Database["public"]["Enums"]["knee_side"]
          name?: string | null
          surgery_date?: string | null
          username?: string
        }
        Relationships: []
      }
      rom_measurements: {
        Row: {
          date: string
          extension_degrees: number | null
          flexion_degrees: number | null
          id: string
          quad_activation: boolean
          user_id: string
        }
        Insert: {
          date: string
          extension_degrees?: number | null
          flexion_degrees?: number | null
          id?: string
          quad_activation?: boolean
          user_id: string
        }
        Update: {
          date?: string
          extension_degrees?: number | null
          flexion_degrees?: number | null
          id?: string
          quad_activation?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          content_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          content_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          content_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      user_exercises: {
        Row: {
          exercise_id: string
          hold_seconds: number | null
          id: string
          reps: number
          sets: number
          sort_order: number
          user_id: string
        }
        Insert: {
          exercise_id: string
          hold_seconds?: number | null
          id?: string
          reps?: number
          sets?: number
          sort_order?: number
          user_id: string
        }
        Update: {
          exercise_id?: string
          hold_seconds?: number | null
          id?: string
          reps?: number
          sets?: number
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gate_criteria: {
        Row: {
          confirmed_at: string | null
          criterion_key: string
          gate_key: string
          id: string
          user_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          criterion_key: string
          gate_key: string
          id?: string
          user_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          criterion_key?: string
          gate_key?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_gate_criteria_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user: { Args: never; Returns: undefined }
    }
    Enums: {
      content_type: "achievement" | "daily_message" | "crutch_hack"
      exercise_muscle_group:
        | "Quad"
        | "Hamstring"
        | "Hip"
        | "Calf"
        | "Knee ROM"
        | "Core"
        | "Glute"
      exercise_phase:
        | "early"
        | "mid"
        | "late"
        | "acute"
        | "early_active"
        | "strengthening"
        | "return_to_sport"
        | "prehab"
        | "advanced_strengthening"
      exercise_role: "primary" | "alternative" | "optional"
      exercise_status: "approved" | "pending"
      graft_type: "patellar" | "hamstring" | "quad" | "allograft"
      knee_side: "left" | "right"
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
      content_type: ["achievement", "daily_message", "crutch_hack"],
      exercise_muscle_group: [
        "Quad",
        "Hamstring",
        "Hip",
        "Calf",
        "Knee ROM",
        "Core",
        "Glute",
      ],
      exercise_phase: [
        "early",
        "mid",
        "late",
        "acute",
        "early_active",
        "strengthening",
        "return_to_sport",
        "prehab",
        "advanced_strengthening",
      ],
      exercise_role: ["primary", "alternative", "optional"],
      exercise_status: ["approved", "pending"],
      graft_type: ["patellar", "hamstring", "quad", "allograft"],
      knee_side: ["left", "right"],
    },
  },
} as const
