import { createClient } from '@supabase/supabase-js';

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ejovnhzzchqpikgktbat.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.warn('Supabase key not configured, analytics will default to local storage.');
}

// Export null if no key is present so consumers can check for existence
export const supabase = supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;