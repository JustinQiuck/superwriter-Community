export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type ConsistencyFindingRow = {
  id: string;
  story_id: string;
  chapter_id: string | null;
  source_type: string;
  source_id: string | null;
  source_route_key: string | null;
  source_ref: string | null;
  type: "contradiction" | "missing_detail" | "timeline_conflict" | "tone_drift" | "promise_unresolved";
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  evidence: Json;
  suggestion: string | null;
  memory_key: string | null;
  memory_value: string | null;
  status: "open" | "accepted" | "dismissed" | "resolved";
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type ConsistencyFindingInsert = {
  id?: string;
  story_id: string;
  chapter_id?: string | null;
  source_type: string;
  source_id?: string | null;
  source_route_key?: string | null;
  source_ref?: string | null;
  type: "contradiction" | "missing_detail" | "timeline_conflict" | "tone_drift" | "promise_unresolved";
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  evidence?: Json;
  suggestion?: string | null;
  memory_key?: string | null;
  memory_value?: string | null;
  status?: "open" | "accepted" | "dismissed" | "resolved";
  resolved_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Database = {
  public: {
    Tables: {
      consistency_findings: {
        Row: ConsistencyFindingRow;
        Insert: ConsistencyFindingInsert;
        Update: Partial<ConsistencyFindingInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
