import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase environment variables are missing. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_KEY are set in your .env file.');
}

// Only create the client if we have valid configuration to prevent crashes
export const supabase = (supabaseUrl && supabaseKey) 
    ? createClient(supabaseUrl, supabaseKey) 
    : null

