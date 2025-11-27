import { createClient } from '@supabase/supabase-js';

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// Access environment variables safely to prevent crash if import.meta.env is undefined.
// We use optional chaining so that if 'env' is missing, these become undefined instead of throwing.
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase configuration missing (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY). Analytics will default to local storage.');
}

// Export null if configuration is incomplete so consumers can handle the offline state gracefully
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;