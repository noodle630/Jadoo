import dotenv from "dotenv";
dotenv.config();
console.log("Loaded .env - URL:", process.env.SUPABASE_URL?.slice(0, 30));


import { createClient } from "@supabase/supabase-js";

// SAFEGUARD: fail early if not set
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabase;
