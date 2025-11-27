import { createClient } from '@supabase/supabase-js';

// Safe access to environment variables
const getEnv = () => {
  try {
    // Check if import.meta.env exists
    if (import.meta && (import.meta as any).env) {
        return (import.meta as any).env;
    }
  } catch (e) {
    // Ignore errors
  }
  return {};
};

const env = getEnv();

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://ejovnhzzchqpikgktbat.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.warn('Supabase key not configured, analytics will default to local storage.');
}

// Export null if no key is present so consumers can check for existence
export const supabase = supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;