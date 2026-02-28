import { createClient } from '@supabase/supabase-js';

// Supabase bağlantı bilgileri .env dosyasından okunuyor
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// https:// eksikse otomatik ekle
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = 'https://' + supabaseUrl;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
