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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          email: string
          id: string
          reason: string | null
          requested_at: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          email: string
          id?: string
          reason?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_events: {
        Row: {
          app_version: string | null
          created_at: string
          event_name: string
          id: string
          metadata: Json
          platform: string | null
          route: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json
          platform?: string | null
          route?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json
          platform?: string | null
          route?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      classification_history: {
        Row: {
          acidez: number
          afrutado: number
          created_at: string | null
          dulzura: number
          estilo: string
          id: string
          potencia: number
          session_id: string | null
          taninos: number
          wine_id: string | null
        }
        Insert: {
          acidez: number
          afrutado: number
          created_at?: string | null
          dulzura: number
          estilo: string
          id?: string
          potencia: number
          session_id?: string | null
          taninos: number
          wine_id?: string | null
        }
        Update: {
          acidez?: number
          afrutado?: number
          created_at?: string | null
          dulzura?: number
          estilo?: string
          id?: string
          potencia?: number
          session_id?: string | null
          taninos?: number
          wine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classification_history_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          contact_name: string
          created_at: string
          email: string | null
          id: string
          phone_number: string
          restaurant_name: string
        }
        Insert: {
          contact_name: string
          created_at?: string
          email?: string | null
          id?: string
          phone_number: string
          restaurant_name: string
        }
        Update: {
          contact_name?: string
          created_at?: string
          email?: string | null
          id?: string
          phone_number?: string
          restaurant_name?: string
        }
        Relationships: []
      }
      dietary_preferences: {
        Row: {
          created_at: string
          dietary_restrictions: string[] | null
          food_pairings: string[] | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dietary_restrictions?: string[] | null
          food_pairings?: string[] | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dietary_restrictions?: string[] | null
          food_pairings?: string[] | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      liquid_intelligence_queries: {
        Row: {
          completion_tokens: number | null
          context: string | null
          cost_usd: number | null
          created_at: string
          event_details: Json | null
          function_type: string
          had_profile: boolean
          id: string
          input1: string
          input2: string | null
          model: string | null
          prompt_tokens: number | null
          recommended_wine_ids: string[] | null
          response_summary: string | null
          user_id: string
        }
        Insert: {
          completion_tokens?: number | null
          context?: string | null
          cost_usd?: number | null
          created_at?: string
          event_details?: Json | null
          function_type: string
          had_profile?: boolean
          id?: string
          input1: string
          input2?: string | null
          model?: string | null
          prompt_tokens?: number | null
          recommended_wine_ids?: string[] | null
          response_summary?: string | null
          user_id: string
        }
        Update: {
          completion_tokens?: number | null
          context?: string | null
          cost_usd?: number | null
          created_at?: string
          event_details?: Json | null
          function_type?: string
          had_profile?: boolean
          id?: string
          input1?: string
          input2?: string | null
          model?: string | null
          prompt_tokens?: number | null
          recommended_wine_ids?: string[] | null
          response_summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      matchrim_profiles: {
        Row: {
          acidez: number
          afrutado: number
          created_at: string
          description: string | null
          dulce: number
          grape_recommendations: string[] | null
          id: string
          name: string
          potente: number
          region_recommendations: string[] | null
          style_recommendations: string[] | null
          tanico: number
          updated_at: string
        }
        Insert: {
          acidez: number
          afrutado: number
          created_at?: string
          description?: string | null
          dulce: number
          grape_recommendations?: string[] | null
          id?: string
          name: string
          potente: number
          region_recommendations?: string[] | null
          style_recommendations?: string[] | null
          tanico: number
          updated_at?: string
        }
        Update: {
          acidez?: number
          afrutado?: number
          created_at?: string
          description?: string | null
          dulce?: number
          grape_recommendations?: string[] | null
          id?: string
          name?: string
          potente?: number
          region_recommendations?: string[] | null
          style_recommendations?: string[] | null
          tanico?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          location: string | null
          name: string | null
          preferred_language: string | null
          privacy_accepted: boolean | null
          terms_accepted: boolean | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          location?: string | null
          name?: string | null
          preferred_language?: string | null
          privacy_accepted?: boolean | null
          terms_accepted?: boolean | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          name?: string | null
          preferred_language?: string | null
          privacy_accepted?: boolean | null
          terms_accepted?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          acidez: number
          afrutado: number
          created_at: string
          dulce: number
          id: string
          potente: number
          profile_description: string
          tanico: number
          user_id: string
        }
        Insert: {
          acidez: number
          afrutado: number
          created_at?: string
          dulce: number
          id?: string
          potente: number
          profile_description: string
          tanico: number
          user_id: string
        }
        Update: {
          acidez?: number
          afrutado?: number
          created_at?: string
          dulce?: number
          id?: string
          potente?: number
          profile_description?: string
          tanico?: number
          user_id?: string
        }
        Relationships: []
      }
      restaurant_matchrim_sessions: {
        Row: {
          created_at: string
          id: string
          is_winerim_restaurant: boolean
          matchrim_code: string
          matchrim_profile: Json
          menu_scan_used: boolean
          restaurant_address: string | null
          restaurant_name: string
          restaurant_place_id: string | null
          source: string
          user_id: string | null
          wines_detected: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_winerim_restaurant?: boolean
          matchrim_code: string
          matchrim_profile?: Json
          menu_scan_used?: boolean
          restaurant_address?: string | null
          restaurant_name: string
          restaurant_place_id?: string | null
          source?: string
          user_id?: string | null
          wines_detected?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_winerim_restaurant?: boolean
          matchrim_code?: string
          matchrim_profile?: Json
          menu_scan_used?: boolean
          restaurant_address?: string | null
          restaurant_name?: string
          restaurant_place_id?: string | null
          source?: string
          user_id?: string | null
          wines_detected?: number | null
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
      user_wines: {
        Row: {
          alcohol_content: number | null
          consumption_date: string | null
          consumption_place: string | null
          consumption_place_type: string | null
          country: string | null
          created_at: string
          grape_varieties: string[] | null
          id: string
          image_url: string | null
          is_favorite: boolean | null
          matchrim_affinity: number | null
          name: string
          personal_note: string | null
          place_details: Json | null
          price: number | null
          producer: string | null
          quantity: number | null
          rating: string | null
          region: string | null
          restaurant_id: string | null
          sensory_attributes: Json | null
          status: string
          tasting_notes: string | null
          updated_at: string
          use_for_profile_training: boolean | null
          user_id: string
          vintage: number | null
        }
        Insert: {
          alcohol_content?: number | null
          consumption_date?: string | null
          consumption_place?: string | null
          consumption_place_type?: string | null
          country?: string | null
          created_at?: string
          grape_varieties?: string[] | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          matchrim_affinity?: number | null
          name: string
          personal_note?: string | null
          place_details?: Json | null
          price?: number | null
          producer?: string | null
          quantity?: number | null
          rating?: string | null
          region?: string | null
          restaurant_id?: string | null
          sensory_attributes?: Json | null
          status?: string
          tasting_notes?: string | null
          updated_at?: string
          use_for_profile_training?: boolean | null
          user_id: string
          vintage?: number | null
        }
        Update: {
          alcohol_content?: number | null
          consumption_date?: string | null
          consumption_place?: string | null
          consumption_place_type?: string | null
          country?: string | null
          created_at?: string
          grape_varieties?: string[] | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          matchrim_affinity?: number | null
          name?: string
          personal_note?: string | null
          place_details?: Json | null
          price?: number | null
          producer?: string | null
          quantity?: number | null
          rating?: string | null
          region?: string | null
          restaurant_id?: string | null
          sensory_attributes?: Json | null
          status?: string
          tasting_notes?: string | null
          updated_at?: string
          use_for_profile_training?: boolean | null
          user_id?: string
          vintage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_wines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wine_preferences: {
        Row: {
          created_at: string
          experience_type: string[] | null
          id: string
          price_range: string | null
          taste_preferences: string[] | null
          updated_at: string
          user_id: string
          wine_types: string[] | null
        }
        Insert: {
          created_at?: string
          experience_type?: string[] | null
          id?: string
          price_range?: string | null
          taste_preferences?: string[] | null
          updated_at?: string
          user_id: string
          wine_types?: string[] | null
        }
        Update: {
          created_at?: string
          experience_type?: string[] | null
          id?: string
          price_range?: string | null
          taste_preferences?: string[] | null
          updated_at?: string
          user_id?: string
          wine_types?: string[] | null
        }
        Relationships: []
      }
      wine_recommendations: {
        Row: {
          compatibility_score: number
          country: string
          created_at: string
          id: string
          quiz_result_id: string
          region: string
          user_id: string
          wine_name: string
          wine_type: string
          winery: string
        }
        Insert: {
          compatibility_score: number
          country: string
          created_at?: string
          id?: string
          quiz_result_id: string
          region: string
          user_id: string
          wine_name: string
          wine_type: string
          winery: string
        }
        Update: {
          compatibility_score?: number
          country?: string
          created_at?: string
          id?: string
          quiz_result_id?: string
          region?: string
          user_id?: string
          wine_name?: string
          wine_type?: string
          winery?: string
        }
        Relationships: [
          {
            foreignKeyName: "wine_recommendations_quiz_result_id_fkey"
            columns: ["quiz_result_id"]
            isOneToOne: false
            referencedRelation: "quiz_results"
            referencedColumns: ["id"]
          },
        ]
      }
      wine_styles: {
        Row: {
          acidez: number
          afrutado: number
          created_at: string
          description: string | null
          dulce: number
          id: string
          name: string
          potente: number
          tanico: number
          updated_at: string
        }
        Insert: {
          acidez: number
          afrutado: number
          created_at?: string
          description?: string | null
          dulce: number
          id?: string
          name: string
          potente: number
          tanico: number
          updated_at?: string
        }
        Update: {
          acidez?: number
          afrutado?: number
          created_at?: string
          description?: string | null
          dulce?: number
          id?: string
          name?: string
          potente?: number
          tanico?: number
          updated_at?: string
        }
        Relationships: []
      }
      wines: {
        Row: {
          acidez: number
          afrutado: number
          alternativas_reasignacion: Json | null
          created_at: string | null
          description: string | null
          dulzura: number
          encaje_pct: number | null
          estilo: string
          estilo_origen: string | null
          flag_reasignacion: string | null
          grape_varieties: string[] | null
          id: string
          maridage_recommendations: string[] | null
          name: string
          potencia: number
          producer: string | null
          region: string | null
          taninos: number
          tipo: string
          updated_at: string | null
          vintage: number | null
        }
        Insert: {
          acidez: number
          afrutado: number
          alternativas_reasignacion?: Json | null
          created_at?: string | null
          description?: string | null
          dulzura: number
          encaje_pct?: number | null
          estilo: string
          estilo_origen?: string | null
          flag_reasignacion?: string | null
          grape_varieties?: string[] | null
          id?: string
          maridage_recommendations?: string[] | null
          name: string
          potencia: number
          producer?: string | null
          region?: string | null
          taninos: number
          tipo: string
          updated_at?: string | null
          vintage?: number | null
        }
        Update: {
          acidez?: number
          afrutado?: number
          alternativas_reasignacion?: Json | null
          created_at?: string | null
          description?: string | null
          dulzura?: number
          encaje_pct?: number | null
          estilo?: string
          estilo_origen?: string | null
          flag_reasignacion?: string | null
          grape_varieties?: string[] | null
          id?: string
          maridage_recommendations?: string[] | null
          name?: string
          potencia?: number
          producer?: string | null
          region?: string | null
          taninos?: number
          tipo?: string
          updated_at?: string | null
          vintage?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      matchrim_email_registered: {
        Args: { email_input: string }
        Returns: boolean
      }
      winerim_calcular_encaje_v4_1: {
        Args: {
          acidez: number
          afrutado: number
          dulzura: number
          potente: number
          style_name: string
          taninos: number
        }
        Returns: number
      }
      winerim_clasificar_por_atributos_v4_1: {
        Args: {
          acidez: number
          afrutado: number
          dulzura: number
          potente: number
          taninos: number
        }
        Returns: string
      }
      winerim_clasificar_v4_1: {
        Args: {
          acidez: number
          afrutado: number
          dulzura: number
          potente: number
          taninos: number
          tipo: string
        }
        Returns: {
          alternativas: Json
          encaje_pct: number
          estilo_final: string
          estilo_origen: string
          flag: string
        }[]
      }
      winerim_especificidad_v4_1: {
        Args: { style_name: string }
        Returns: number
      }
      winerim_estilo_compatible_v4_1: {
        Args: { style_name: string; tipo_input: string }
        Returns: boolean
      }
      winerim_estilos_del_tipo_v4_1: {
        Args: { incluir_excluidos?: boolean; tipo_input: string }
        Returns: {
          estilo: string
        }[]
      }
      winerim_infer_tipo_v4_1: {
        Args: {
          acidez: number
          afrutado: number
          dulzura: number
          potente: number
          style_name: string
          taninos: number
        }
        Returns: string
      }
      winerim_rangos_estilo_v4_1: {
        Args: { style_name: string }
        Returns: {
          a_max: number
          a_min: number
          af_max: number
          af_min: number
          d_max: number
          d_min: number
          estilo: string
          p_max: number
          p_min: number
          t_max: number
          t_min: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
