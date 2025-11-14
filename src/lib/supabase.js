import { createClient } from '@supabase/supabase-js';
    
    const supabaseUrl = "https://vthlxjxdiajxdhotifyn.supabase.co";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0aGx4anhkaWFqeGRob3RpZnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MzQ3MDUsImV4cCI6MjA3NjAxMDcwNX0.LxP1MUpgc6G2sSEr2M4l6l_yFPwhx3zTyIrYaSFboqI";
    
    export const supabase = createClient(supabaseUrl, supabaseAnonKey);