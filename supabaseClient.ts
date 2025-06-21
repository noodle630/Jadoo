import { createClient } from "@supabase/supabase-js";

// SAFEGUARD: fail early if not set
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env vars");
}

// Only ever use service role on server, never expose on frontend
const REMOVED_SECRET= createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabase;
