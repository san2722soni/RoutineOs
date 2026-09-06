import { missingSupabaseEnv } from "@/src/lib/env";
import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
export async function userId() {
  if (!isSupabaseConfigured) throw new Error(`Missing ${missingSupabaseEnv().join(", ")} in .env.`);

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sign in before syncing.");
  return data.user.id;
}
