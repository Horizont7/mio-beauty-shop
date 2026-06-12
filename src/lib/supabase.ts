import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is not configured. Set this environment variable in Vercel."
  );
}

if (!key) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured. Set this environment variable in Vercel."
  );
}

export const supabase = createClient(url, key);
