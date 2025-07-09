import { createClient } from '@supabase/supabase-js';
// Use process.env for compatibility in Node.js and Vite builds
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseAnonKey); 