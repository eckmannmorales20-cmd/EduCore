import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && supabaseUrl.startsWith('http');

// Provide a dummy client if not configured to prevent crashes, 
// though actual calls will still fail and should be guarded by isSupabaseConfigured
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder');

console.log(import.meta.env.VITE_SUPABASE_URL);
