export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_profiles": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "composition_care_text": string,"id": string,"name": string,"parent_id": string | null,"slug": string,"sort_order": number
                  }
                  Insert: {
                    "composition_care_text"?: string,"id"?: string,"name": string,"parent_id"?: string | null,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "composition_care_text"?: string,"id"?: string,"name"?: string,"parent_id"?: string | null,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "color": string,"id": string,"order_id": string,"product_name": string,"qty": number,"size": string,"sku": string | null,"unit_price_cents": number,"variant_id": string | null
                  }
                  Insert: {
                    "color": string,"id"?: string,"order_id": string,"product_name": string,"qty": number,"size": string,"sku"?: string | null,"unit_price_cents": number,"variant_id"?: string | null
                  }
                  Update: {
                    "color"?: string,"id"?: string,"order_id"?: string,"product_name"?: string,"qty"?: number,"size"?: string,"sku"?: string | null,"unit_price_cents"?: number,"variant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "access_token": string,"cancel_reason": Database["public"]['Enums']["cancel_reason"] | null,"cancelled_at": string | null,"code": string,"created_at": string,"customer_name": string,"discount_cents": number,"email": string,"id": string,"installments": number,"payment_method": Database["public"]['Enums']["payment_method"],"payway_link_attempt": number,"payway_payment_id": string | null,"payway_site_transaction_id": string | null,"phone": string,"reservation_expires_at": string | null,"shipping_address": Json | null,"shipping_cents": number,"shipping_method": Database["public"]['Enums']["shipping_method"],"status": Database["public"]['Enums']["order_status"],"subtotal_cents": number,"total_cents": number,"updated_at": string
                  }
                  Insert: {
                    "access_token": string,"cancel_reason"?: Database["public"]['Enums']["cancel_reason"] | null,"cancelled_at"?: string | null,"code": string,"created_at"?: string,"customer_name": string,"discount_cents": number,"email": string,"id"?: string,"installments"?: number,"payment_method": Database["public"]['Enums']["payment_method"],"payway_link_attempt"?: number,"payway_payment_id"?: string | null,"payway_site_transaction_id"?: string | null,"phone": string,"reservation_expires_at"?: string | null,"shipping_address"?: Json | null,"shipping_cents": number,"shipping_method": Database["public"]['Enums']["shipping_method"],"status"?: Database["public"]['Enums']["order_status"],"subtotal_cents": number,"total_cents": number,"updated_at"?: string
                  }
                  Update: {
                    "access_token"?: string,"cancel_reason"?: Database["public"]['Enums']["cancel_reason"] | null,"cancelled_at"?: string | null,"code"?: string,"created_at"?: string,"customer_name"?: string,"discount_cents"?: number,"email"?: string,"id"?: string,"installments"?: number,"payment_method"?: Database["public"]['Enums']["payment_method"],"payway_link_attempt"?: number,"payway_payment_id"?: string | null,"payway_site_transaction_id"?: string | null,"phone"?: string,"reservation_expires_at"?: string | null,"shipping_address"?: Json | null,"shipping_cents"?: number,"shipping_method"?: Database["public"]['Enums']["shipping_method"],"status"?: Database["public"]['Enums']["order_status"],"subtotal_cents"?: number,"total_cents"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"payway_webhook_events": {
                  Row: {
                    "error": string | null,"id": string,"order_id": string | null,"payload": Json,"processed_at": string | null,"received_at": string
                  }
                  Insert: {
                    "error"?: string | null,"id"?: string,"order_id"?: string | null,"payload": Json,"processed_at"?: string | null,"received_at"?: string
                  }
                  Update: {
                    "error"?: string | null,"id"?: string,"order_id"?: string | null,"payload"?: Json,"processed_at"?: string | null,"received_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"payment_proofs": {
                  Row: {
                    "id": string,"order_id": string,"storage_path": string,"uploaded_at": string
                  }
                  Insert: {
                    "id"?: string,"order_id": string,"storage_path": string,"uploaded_at"?: string
                  }
                  Update: {
                    "id"?: string,"order_id"?: string,"storage_path"?: string,"uploaded_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_proofs_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"product_images": {
                  Row: {
                    "alt": string,"id": string,"product_id": string,"sort_order": number,"storage_path": string
                  }
                  Insert: {
                    "alt"?: string,"id"?: string,"product_id": string,"sort_order"?: number,"storage_path": string
                  }
                  Update: {
                    "alt"?: string,"id"?: string,"product_id"?: string,"sort_order"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_images_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"product_variants": {
                  Row: {
                    "color": string,"id": string,"product_id": string,"size": string,"sku": string | null,"stock_on_hand": number
                  }
                  Insert: {
                    "color": string,"id"?: string,"product_id": string,"size": string,"sku"?: string | null,"stock_on_hand"?: number
                  }
                  Update: {
                    "color"?: string,"id"?: string,"product_id"?: string,"size"?: string,"sku"?: string | null,"stock_on_hand"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_variants_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "category_id": string,"created_at": string,"description": string,"id": string,"is_published": boolean,"list_price_cents": number,"name": string,"promo_price_cents": number | null,"size_guide_id": string | null,"slug": string,"updated_at": string
                  }
                  Insert: {
                    "category_id": string,"created_at"?: string,"description"?: string,"id"?: string,"is_published"?: boolean,"list_price_cents": number,"name": string,"promo_price_cents"?: number | null,"size_guide_id"?: string | null,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "category_id"?: string,"created_at"?: string,"description"?: string,"id"?: string,"is_published"?: boolean,"list_price_cents"?: number,"name"?: string,"promo_price_cents"?: number | null,"size_guide_id"?: string | null,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_size_guide_id_fkey"
      columns: ["size_guide_id"]
isOneToOne: false
      referencedRelation: "size_guides"
      referencedColumns: ["id"]
    }
                  ]
                },"size_guides": {
                  Row: {
                    "id": string,"name": string,"storage_path": string | null
                  }
                  Insert: {
                    "id"?: string,"name": string,"storage_path"?: string | null
                  }
                  Update: {
                    "id"?: string,"name"?: string,"storage_path"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"stock_reservations": {
                  Row: {
                    "expires_at": string,"id": string,"order_id": string,"qty": number,"status": Database["public"]['Enums']["reservation_status"],"variant_id": string
                  }
                  Insert: {
                    "expires_at": string,"id"?: string,"order_id": string,"qty": number,"status"?: Database["public"]['Enums']["reservation_status"],"variant_id": string
                  }
                  Update: {
                    "expires_at"?: string,"id"?: string,"order_id"?: string,"qty"?: number,"status"?: Database["public"]['Enums']["reservation_status"],"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_reservations_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_reservations_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"store_settings": {
                  Row: {
                    "andreani_fee_cents": number,"contact_address": string,"contact_email": string,"free_shipping_threshold_cents": number,"id": number,"instagram_url": string,"payment_discount_bps": number,"payway_installments": number[],"season_label": string,"transfer_cbu_alias_text": string,"updated_at": string,"whatsapp_prefill_message": string,"whatsapp_url_or_phone": string
                  }
                  Insert: {
                    "andreani_fee_cents"?: number,"contact_address"?: string,"contact_email"?: string,"free_shipping_threshold_cents"?: number,"id"?: number,"instagram_url"?: string,"payment_discount_bps"?: number,"payway_installments"?: number[],"season_label"?: string,"transfer_cbu_alias_text"?: string,"updated_at"?: string,"whatsapp_prefill_message"?: string,"whatsapp_url_or_phone"?: string
                  }
                  Update: {
                    "andreani_fee_cents"?: number,"contact_address"?: string,"contact_email"?: string,"free_shipping_threshold_cents"?: number,"id"?: number,"instagram_url"?: string,"payment_discount_bps"?: number,"payway_installments"?: number[],"season_label"?: string,"transfer_cbu_alias_text"?: string,"updated_at"?: string,"whatsapp_prefill_message"?: string,"whatsapp_url_or_phone"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "place_order_tx":
{ Args: { "p": Json }; Returns: Json
                           }
            "confirm_payment_tx":
{ Args: { "p_order_id": string }; Returns: undefined
                           }
            "cancel_order_tx":
{ Args: { "p_order_id": string, "p_reason": Database["public"]["Enums"]["cancel_reason"] }; Returns: undefined
                           }
          }
          Enums: {
            "cancel_reason": "admin"|"expired","order_status": "pendiente_pago"|"pago_confirmado"|"preparando"|"listo_retiro"|"enviado"|"entregado"|"cancelado","payment_method": "transfer"|"cash"|"payway","reservation_status": "active"|"consumed"|"released","shipping_method": "pickup"|"andreani"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "cancel_reason": ["admin", "expired"],"order_status": ["pendiente_pago", "pago_confirmado", "preparando", "listo_retiro", "enviado", "entregado", "cancelado"],"payment_method": ["transfer", "cash", "payway"],"reservation_status": ["active", "consumed", "released"],"shipping_method": ["pickup", "andreani"]
          }
        }
} as const

