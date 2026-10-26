import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  organization: string;
  is_admin: boolean;
  last_active: string;
  created_at: string;
  updated_at: string;
};

export type ToolUsage = {
  id: string;
  user_id: string;
  tool_name: string;
  accessed_at: string;
};
