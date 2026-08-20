import { createClient } from "@supabase/supabase-js";
const url =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://pipomzuumqggzxwgxeib.supabase.co";
const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpcG9tenV1bXFnZ3p4d2d4ZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMTIzMjgsImV4cCI6MjEwMjc4ODMyOH0.xnq4_6l_jWbv_MNYIPpebJAFj27yWzSV2nWA_wqOrMQ";
export const isSupabaseConfigured = Boolean(
  url && key && !url.includes("your-project"),
);
export const supabase = isSupabaseConfigured ? createClient(url, key) : null;
