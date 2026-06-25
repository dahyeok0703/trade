/**
 * Database types.
 *
 * Hand-authored to mirror `supabase/migrations`. Once the Supabase CLI is
 * running locally, regenerate with `pnpm db:types` to keep this in sync.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MemberRole = "owner" | "staff";
export type MemberStatus = "active" | "invited" | "suspended";
export type WorkspacePlan = "free" | "pro";
export type ShipmentStatus = "draft" | "documents_ready" | "shipped" | "done";
export type TradeDocType =
  | "commercial_invoice"
  | "packing_list"
  | "certificate_of_origin"
  | "other";
export type PaymentTerm = "TT" | "LC";
export type PaymentStatus = "pending" | "partial" | "paid" | "overdue";

type Timestamps = { created_at: string };
type WithUpdated = { updated_at: string };

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          exporter_info: Json;
          plan: WorkspacePlan;
          trial_ends_at: string | null;
          billing_customer_id: string | null;
        } & Timestamps &
          WithUpdated;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          exporter_info?: Json;
          plan?: WorkspacePlan;
          trial_ends_at?: string | null;
          billing_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspaces"]["Insert"]>;
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          name: string | null;
          role: MemberRole;
          status: MemberStatus;
        } & Timestamps &
          WithUpdated;
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          name?: string | null;
          role?: MemberRole;
          status?: MemberStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "members_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      buyers: {
        Row: {
          id: string;
          workspace_id: string;
          name_en: string;
          address_en: string | null;
          country: string | null;
          contact: Json;
          notify_party: Json;
          deleted_at: string | null;
        } & Timestamps &
          WithUpdated;
        Insert: {
          id?: string;
          workspace_id: string;
          name_en: string;
          address_en?: string | null;
          country?: string | null;
          contact?: Json;
          notify_party?: Json;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["buyers"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "buyers_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          workspace_id: string;
          name_en: string;
          hs_code: string | null;
          unit: string;
          unit_price_usd: number;
          net_weight: number | null;
          gross_weight: number | null;
          dimensions: string | null;
          origin_country: string | null;
          deleted_at: string | null;
        } & Timestamps &
          WithUpdated;
        Insert: {
          id?: string;
          workspace_id: string;
          name_en: string;
          hs_code?: string | null;
          unit?: string;
          unit_price_usd?: number;
          net_weight?: number | null;
          gross_weight?: number | null;
          dimensions?: string | null;
          origin_country?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      shipments: {
        Row: {
          id: string;
          workspace_id: string;
          buyer_id: string | null;
          ref_no: string;
          incoterms: string | null;
          currency: string;
          port_of_loading: string | null;
          port_of_discharge: string | null;
          etd: string | null;
          lc_no: string | null;
          status: ShipmentStatus;
          memo: string | null;
          payment_terms: string | null;
          eta: string | null;
          bl_no: string | null;
          deleted_at: string | null;
        } & Timestamps &
          WithUpdated;
        Insert: {
          id?: string;
          workspace_id: string;
          buyer_id?: string | null;
          ref_no: string;
          incoterms?: string | null;
          currency?: string;
          port_of_loading?: string | null;
          port_of_discharge?: string | null;
          etd?: string | null;
          lc_no?: string | null;
          status?: ShipmentStatus;
          memo?: string | null;
          payment_terms?: string | null;
          eta?: string | null;
          bl_no?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shipments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "shipments_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_buyer_id_fkey";
            columns: ["buyer_id"];
            referencedRelation: "buyers";
            referencedColumns: ["id"];
          },
        ];
      };
      shipment_items: {
        Row: {
          id: string;
          workspace_id: string;
          shipment_id: string;
          product_id: string | null;
          description_en: string;
          qty: number;
          unit: string;
          unit_price: number;
          amount: number;
          net_weight: number | null;
          gross_weight: number | null;
          ctns: number | null;
          cbm: number | null;
          hs_code: string | null;
        } & Timestamps &
          WithUpdated;
        Insert: {
          id?: string;
          workspace_id: string;
          shipment_id: string;
          product_id?: string | null;
          description_en: string;
          qty?: number;
          unit?: string;
          unit_price?: number;
          amount?: number;
          net_weight?: number | null;
          gross_weight?: number | null;
          ctns?: number | null;
          cbm?: number | null;
          hs_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shipment_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "shipment_items_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipment_items_shipment_id_fkey";
            columns: ["shipment_id"];
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipment_items_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      trade_documents: {
        Row: {
          id: string;
          workspace_id: string;
          shipment_id: string;
          doc_type: TradeDocType;
          doc_no: string | null;
          issued_on: string | null;
          file_path: string | null;
          data_snapshot: Json;
        } & Timestamps &
          WithUpdated;
        Insert: {
          id?: string;
          workspace_id: string;
          shipment_id: string;
          doc_type: TradeDocType;
          doc_no?: string | null;
          issued_on?: string | null;
          file_path?: string | null;
          data_snapshot?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trade_documents"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "trade_documents_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trade_documents_shipment_id_fkey";
            columns: ["shipment_id"];
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      validations: {
        Row: {
          id: string;
          workspace_id: string;
          shipment_id: string;
          run_at: string;
          result: Json;
          passed: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          workspace_id: string;
          shipment_id: string;
          run_at?: string;
          result?: Json;
          passed?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["validations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "validations_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "validations_shipment_id_fkey";
            columns: ["shipment_id"];
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          workspace_id: string;
          shipment_id: string;
          term: PaymentTerm;
          amount: number;
          due_on: string | null;
          paid_on: string | null;
          status: PaymentStatus;
        } & Timestamps &
          WithUpdated;
        Insert: {
          id?: string;
          workspace_id: string;
          shipment_id: string;
          term: PaymentTerm;
          amount?: number;
          due_on?: string | null;
          paid_on?: string | null;
          status?: PaymentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "payments_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_shipment_id_fkey";
            columns: ["shipment_id"];
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_usage: {
        Row: {
          id: string;
          workspace_id: string;
          month: string;
          input_tokens: number;
          output_tokens: number;
          doc_count: number;
          est_cost_krw: number;
        } & Timestamps &
          WithUpdated;
        Insert: {
          id?: string;
          workspace_id: string;
          month: string;
          input_tokens?: number;
          output_tokens?: number;
          doc_count?: number;
          est_cost_krw?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_usage"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "ai_usage_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          workspace_id: string;
          actor_member_id: string | null;
          action: string;
          target_table: string | null;
          target_id: string | null;
          meta: Json;
        } & Timestamps;
        Insert: {
          id?: string;
          workspace_id: string;
          actor_member_id?: string | null;
          action: string;
          target_table?: string | null;
          target_id?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_actor_member_id_fkey";
            columns: ["actor_member_id"];
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      billing_events: {
        Row: {
          id: string;
          workspace_id: string;
          type: string;
          raw: Json;
          event_id: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          workspace_id: string;
          type: string;
          raw?: Json;
          event_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["billing_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "billing_events_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          workspace_id: string;
          provider: string;
          plan: WorkspacePlan;
          status: string;
          billing_key: string | null;
          customer_key: string | null;
          card_brand: string | null;
          card_last4: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
        } & Timestamps &
          WithUpdated;
        Insert: {
          id?: string;
          workspace_id: string;
          provider?: string;
          plan?: WorkspacePlan;
          status?: string;
          billing_key?: string | null;
          customer_key?: string | null;
          card_brand?: string | null;
          card_last4?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_workspace_member: {
        Args: { wid: string };
        Returns: boolean;
      };
      is_workspace_owner: {
        Args: { wid: string };
        Returns: boolean;
      };
      bootstrap_workspace: {
        Args: { workspace_name: string; workspace_slug: string };
        Returns: string;
      };
      record_ai_usage: {
        Args: {
          p_input_tokens: number;
          p_output_tokens: number;
          p_doc_count: number;
          p_est_cost_krw: number;
        };
        Returns: number;
      };
      ai_extract_count_this_month: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: {
      member_role: MemberRole;
      member_status: MemberStatus;
      workspace_plan: WorkspacePlan;
      shipment_status: ShipmentStatus;
      trade_doc_type: TradeDocType;
      payment_term: PaymentTerm;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience row aliases.
type Tables = Database["public"]["Tables"];
export type Workspace = Tables["workspaces"]["Row"];
export type Member = Tables["members"]["Row"];
export type Buyer = Tables["buyers"]["Row"];
export type Product = Tables["products"]["Row"];
export type Shipment = Tables["shipments"]["Row"];
export type ShipmentItem = Tables["shipment_items"]["Row"];
export type TradeDocument = Tables["trade_documents"]["Row"];
export type Validation = Tables["validations"]["Row"];
export type Payment = Tables["payments"]["Row"];
export type AiUsage = Tables["ai_usage"]["Row"];
export type AuditLog = Tables["audit_logs"]["Row"];
export type BillingEvent = Tables["billing_events"]["Row"];
export type Subscription = Tables["subscriptions"]["Row"];
