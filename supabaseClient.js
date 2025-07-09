import * as dotenv from "dotenv";
import { createClient } from '@supabase/supabase-js';
dotenv.config();
console.log("Loaded .env - URL:", process.env.SUPABASE_URL?.slice(0, 30));
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log("Using Supabase key:", supabaseKey?.slice(0, 8));
if (!supabaseUrl) {
    throw new Error('supabaseUrl is required.');
}
if (!supabaseKey) {
    throw new Error('supabaseKey is required.');
}
const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
