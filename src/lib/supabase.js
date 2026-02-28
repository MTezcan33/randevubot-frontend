import { createClient } from '@supabase/supabase-js';

// Supabase bağlantı bilgileri .env dosyasından okunuyor
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
