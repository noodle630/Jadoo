import * as dotenv from "dotenv";
import { createClient } from '@supabase/supabase-js';
dotenv.config();
// Supabase credentials are loaded from .env or .env.production
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) {
    throw new Error('supabaseUrl is required. Set SUPABASE_URL in your .env');
}
if (!supabaseKey) {
    throw new Error('supabaseKey is required. Set SUPABASE_SERVICE_ROLE_KEY in your .env');
}
const REMOVED_SECRET= createClient(supabaseUrl, supabaseKey);
export default supabase;
