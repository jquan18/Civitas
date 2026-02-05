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
            chat_messages: {
                Row: {
                    content: string
                    created_at: string | null
                    id: string
                    role: string
                    session_id: string
                }
                Insert: {
                    content: string
                    created_at?: string | null
                    id?: string
                    role: string
                    session_id: string
                }
                Update: {
                    content?: string
                    created_at?: string | null
                    id?: string
                    role?: string
                    session_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "fk_message_session"
                        columns: ["session_id"]
                        isOneToOne: false
                        referencedRelation: "chat_sessions"
                        referencedColumns: ["id"]
                    },
                ]
            }
            chat_sessions: {
                Row: {
                    contract_address: string | null
                    created_at: string | null
                    id: string
                    updated_at: string | null
                    user_address: string
                }
                Insert: {
                    contract_address?: string | null
                    created_at?: string | null
                    id?: string
                    updated_at?: string | null
                    user_address: string
                }
                Update: {
                    contract_address?: string | null
                    created_at?: string | null
                    id?: string
                    updated_at?: string | null
                    user_address?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "fk_session_contract"
                        columns: ["contract_address"]
                        isOneToOne: false
                        referencedRelation: "rental_contracts"
                        referencedColumns: ["contract_address"]
                    },
                    {
                        foreignKeyName: "fk_session_user"
                        columns: ["user_address"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["wallet_address"]
                    },
                ]
            }
            contracts: {
                Row: {
                    id: string
                    contract_address: string
                    template_id: string
                    creator_address: string
                    chain_id: number
                    state: number
                    basename: string | null
                    config: Json
                    on_chain_state: Json | null
                    created_at: string | null
                    updated_at: string | null
                    last_synced_at: string | null
                }
                Insert: {
                    id?: string
                    contract_address: string
                    template_id: string
                    creator_address: string
                    chain_id?: number
                    state?: number
                    basename?: string | null
                    config: Json
                    on_chain_state?: Json | null
                    created_at?: string | null
                    updated_at?: string | null
                    last_synced_at?: string | null
                }
                Update: {
                    id?: string
                    contract_address?: string
                    template_id?: string
                    creator_address?: string
                    chain_id?: number
                    state?: number
                    basename?: string | null
                    config?: Json
                    on_chain_state?: Json | null
                    created_at?: string | null
                    updated_at?: string | null
                    last_synced_at?: string | null
                }
                Relationships: []
            }
            contract_events: {
                Row: {
                    block_number: number
                    contract_address: string
                    created_at: string | null
                    event_data: Json | null
                    event_type: string
                    id: string
                    transaction_hash: string
                }
                Insert: {
                    block_number: number
                    contract_address: string
                    created_at?: string | null
                    event_data?: Json | null
                    event_type: string
                    id?: string
                    transaction_hash: string
                }
                Update: {
                    block_number?: number
                    contract_address?: string
                    created_at?: string | null
                    event_data?: Json | null
                    event_type?: string
                    id?: string
                    transaction_hash?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "fk_contract_event"
                        columns: ["contract_address"]
                        isOneToOne: false
                        referencedRelation: "rental_contracts"
                        referencedColumns: ["contract_address"]
                    },
                ]
            }
            contract_transactions: {
                Row: {
                    amount: number | null
                    block_number: number
                    block_timestamp: string
                    contract_address: string
                    contract_id: string | null
                    created_at: string | null
                    currency: string | null
                    event_data: Json
                    from_address: string | null
                    gas_price: number | null
                    gas_used: number | null
                    id: string
                    indexed_at: string | null
                    log_index: number
                    status: string | null
                    template_id: string
                    to_address: string | null
                    transaction_hash: string
                    transaction_type: string
                }
                Insert: {
                    amount?: number | null
                    block_number: number
                    block_timestamp: string
                    contract_address: string
                    contract_id?: string | null
                    created_at?: string | null
                    currency?: string | null
                    event_data?: Json
                    from_address?: string | null
                    gas_price?: number | null
                    gas_used?: number | null
                    id?: string
                    indexed_at?: string | null
                    log_index: number
                    status?: string | null
                    template_id: string
                    to_address?: string | null
                    transaction_hash: string
                    transaction_type: string
                }
                Update: {
                    amount?: number | null
                    block_number?: number
                    block_timestamp?: string
                    contract_address?: string
                    contract_id?: string | null
                    created_at?: string | null
                    currency?: string | null
                    event_data?: Json
                    from_address?: string | null
                    gas_price?: number | null
                    gas_used?: number | null
                    id?: string
                    indexed_at?: string | null
                    log_index?: number
                    status?: string | null
                    template_id?: string
                    to_address?: string | null
                    transaction_hash?: string
                    transaction_type?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "contract_transactions_contract_id_fkey"
                        columns: ["contract_id"]
                        isOneToOne: false
                        referencedRelation: "contracts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            rental_contracts: {
                Row: {
                    basename: string | null
                    contract_address: string
                    created_at: string | null
                    id: string
                    is_active: boolean | null
                    landlord_address: string
                    last_synced_at: string | null
                    monthly_amount: number
                    start_timestamp: number | null
                    state: number
                    tenant_address: string | null
                    tenant_ens_name: string | null
                    termination_initiated_at: number | null
                    total_amount: number | null
                    total_months: number
                    updated_at: string | null
                }
                Insert: {
                    basename?: string | null
                    contract_address: string
                    created_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    landlord_address: string
                    last_synced_at?: string | null
                    monthly_amount: number
                    start_timestamp?: number | null
                    state?: number
                    tenant_address?: string | null
                    tenant_ens_name?: string | null
                    termination_initiated_at?: number | null
                    total_amount?: number | null
                    total_months: number
                    updated_at?: string | null
                }
                Update: {
                    basename?: string | null
                    contract_address?: string
                    created_at?: string | null
                    id?: string
                    is_active?: boolean | null
                    landlord_address?: string
                    last_synced_at?: string | null
                    monthly_amount?: number
                    start_timestamp?: number | null
                    state?: number
                    tenant_address?: string | null
                    tenant_ens_name?: string | null
                    termination_initiated_at?: number | null
                    total_amount?: number | null
                    total_months?: number
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "fk_landlord"
                        columns: ["landlord_address"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["wallet_address"]
                    },
                ]
            }
            user_contracts: {
                Row: {
                    contract_address: string
                    created_at: string | null
                    id: string
                    role: string
                    user_address: string
                }
                Insert: {
                    contract_address: string
                    created_at?: string | null
                    id?: string
                    role: string
                    user_address: string
                }
                Update: {
                    contract_address?: string
                    created_at?: string | null
                    id?: string
                    role?: string
                    user_address?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "fk_contract"
                        columns: ["contract_address"]
                        isOneToOne: false
                        referencedRelation: "rental_contracts"
                        referencedColumns: ["contract_address"]
                    },
                    {
                        foreignKeyName: "fk_user"
                        columns: ["user_address"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["wallet_address"]
                    },
                ]
            }
            users: {
                Row: {
                    created_at: string | null
                    ens_name: string | null
                    id: string
                    updated_at: string | null
                    wallet_address: string
                }
                Insert: {
                    created_at?: string | null
                    ens_name?: string | null
                    id?: string
                    updated_at?: string | null
                    wallet_address: string
                }
                Update: {
                    created_at?: string | null
                    ens_name?: string | null
                    id?: string
                    updated_at?: string | null
                    wallet_address?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
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
