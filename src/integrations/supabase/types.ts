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
          created_at: string | null
          description: string | null
          dulzura: number
          estilo: string
          grape_varieties: string[] | null
          id: string
          maridage_recommendations: string[] | null
          name: string
          potencia: number
          producer: string | null
          region: string | null
          taninos: number
          updated_at: string | null
          vintage: number | null
        }
        Insert: {
          acidez: number
          afrutado: number
          created_at?: string | null
          description?: string | null
          dulzura: number
          estilo: string
          grape_varieties?: string[] | null
          id?: string
          maridage_recommendations?: string[] | null
          name: string
          potencia: number
          producer?: string | null
          region?: string | null
          taninos: number
          updated_at?: string | null
          vintage?: number | null
        }
        Update: {
          acidez?: number
          afrutado?: number
          created_at?: string | null
          description?: string | null
          dulzura?: number
          estilo?: string
          grape_varieties?: string[] | null
          id?: string
          maridage_recommendations?: string[] | null
          name?: string
          potencia?: number
          producer?: string | null
          region?: string | null
          taninos?: number
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
