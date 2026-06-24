/**
 * Database types.
 *
 * Hand-authored to mirror `supabase/migrations`. Once the Supabase CLI is
 * running locally you can regenerate this file with `pnpm db:types`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MemberRole = "owner" | "staff";

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: MemberRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: MemberRole;
          created_at?: string;
        };
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
          name: string;
          country: string | null;
          contact_email: string | null;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          country?: string | null;
          contact_email?: string | null;
          address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          country?: string | null;
          contact_email?: string | null;
          address?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyers_workspace_id_fkey";
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
          reference: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          buyer_id?: string | null;
          reference: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          buyer_id?: string | null;
          reference?: string;
          status?: string;
          created_at?: string;
        };
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
    };
    Views: Record<string, never>;
    Functions: {
      bootstrap_workspace: {
        Args: { workspace_name: string; workspace_slug: string };
        Returns: string;
      };
    };
    Enums: {
      member_role: MemberRole;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience row aliases.
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type Member = Database["public"]["Tables"]["members"]["Row"];
export type Buyer = Database["public"]["Tables"]["buyers"]["Row"];
export type Shipment = Database["public"]["Tables"]["shipments"]["Row"];
