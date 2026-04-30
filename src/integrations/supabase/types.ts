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
      accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: string
          available_balance: number
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          account_type: string
          available_balance?: number
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string
          available_balance?: number
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          consumed: boolean
          created_at: string
          email: string
          expires_at: string
          id: string
          purpose: string
        }
        Insert: {
          code: string
          consumed?: boolean
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          purpose?: string
        }
        Update: {
          code?: string
          consumed?: boolean
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          purpose?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          transfer_pin: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          transfer_pin?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          transfer_pin?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          clears_at: string | null
          created_at: string
          description: string
          display_style: string | null
          id: string
          running_balance: number | null
          status: string
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          clears_at?: string | null
          created_at?: string
          description: string
          display_style?: string | null
          id?: string
          running_balance?: number | null
          status?: string
          transaction_date?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          clears_at?: string | null
          created_at?: string
          description?: string
          display_style?: string | null
          id?: string
          running_balance?: number | null
          status?: string
          transaction_date?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          admin_note: string | null
          amount: number
          bank_address: string | null
          created_at: string
          currency: string | null
          details: Json | null
          from_account_id: string | null
          id: string
          memo: string | null
          recipient_account: string | null
          recipient_bank: string | null
          recipient_name: string | null
          routing_number: string | null
          status: string
          swift_code: string | null
          transfer_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bank_address?: string | null
          created_at?: string
          currency?: string | null
          details?: Json | null
          from_account_id?: string | null
          id?: string
          memo?: string | null
          recipient_account?: string | null
          recipient_bank?: string | null
          recipient_name?: string | null
          routing_number?: string | null
          status?: string
          swift_code?: string | null
          transfer_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bank_address?: string | null
          created_at?: string
          currency?: string | null
          details?: Json | null
          from_account_id?: string | null
          id?: string
          memo?: string | null
          recipient_account?: string | null
          recipient_bank?: string | null
          recipient_name?: string | null
          routing_number?: string | null
          status?: string
          swift_code?: string | null
          transfer_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      [_ in never]: never
    }
    Functions: {
      admin_add_check_deposit:
        | {
            Args: {
              _account_id: string
              _amount: number
              _description: string
              _running_balance: number
              _transaction_date: string
            }
            Returns: string
          }
        | {
            Args: {
              _account_id: string
              _amount: number
              _clears_at?: string
              _description: string
              _running_balance: number
              _transaction_date: string
            }
            Returns: string
          }
      admin_adjust_balance:
        | {
            Args: { _account_id: string; _amount: number; _op: string }
            Returns: number
          }
        | {
            Args: {
              _account_id: string
              _amount: number
              _clears_at?: string
              _op: string
            }
            Returns: number
          }
      admin_cancel_pending_transaction: {
        Args: { _transaction_id: string }
        Returns: undefined
      }
      admin_clear_pending_transaction: {
        Args: { _transaction_id: string }
        Returns: undefined
      }
      admin_edit_pending_transaction: {
        Args: {
          _new_amount: number
          _new_clears_at: string
          _transaction_id: string
        }
        Returns: undefined
      }
      admin_generate_random_transactions: {
        Args: {
          _account_id: string
          _count: number
          _days_back?: number
          _max_amount?: number
          _min_amount?: number
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      submit_user_transfer: {
        Args: {
          _amount: number
          _bank_address: string
          _currency: string
          _details: Json
          _from_account_id: string
          _memo: string
          _recipient_account: string
          _recipient_bank: string
          _recipient_name: string
          _routing_number: string
          _swift_code: string
          _transfer_type: string
        }
        Returns: string
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
