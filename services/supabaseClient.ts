import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase URL and Anon Key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key missing. Auth and DB features may not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
