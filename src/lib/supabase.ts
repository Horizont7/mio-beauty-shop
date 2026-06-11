import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL topilmadi");
}

if (!key) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY topilmadi");
}

export const supabase = createClient(url, key);
