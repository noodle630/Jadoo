import dotenv from "dotenv";
dotenv.config();
console.log("Loaded .env - URL:", process.env.SUPABASE_URL?.slice(0, 30));


import { createClient } from "@supabase/supabase-js";

// SAFEGUARD: fail early if not set
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Supabase client may not work correctly.");
}

const REMOVED_SECRET= createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabase;
