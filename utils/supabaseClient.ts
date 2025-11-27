import { createClient } from '@supabase/supabase-js';

// Use import.meta.env for Vite compatibility
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://ejovnhzzchqpikgktbat.supabase.co';
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.warn('Supabase key not configured, analytics will default to local storage.');
}

// Export null if no key is present so consumers can check for existence
export const supabase = supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;