import { supabase } from "@/src/lib/supabase";

const AVATAR_BUCKET = "avatars";

export async function uploadProfileAvatar(uri: string, contentType = "image/jpeg") {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sign in before uploading an avatar.");

  const response = await fetch(uri);
  const file = await response.arrayBuffer();
  const path = `${data.user.id}/avatar.jpg`;

  const upload = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    contentType,
    upsert: true,
  });
  if (upload.error) throw upload.error;

  const publicUrl = `${supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  const profile = await supabase.from("profiles").upsert({
    id: data.user.id,
    avatar_url: publicUrl,
    updated_at: new Date().toISOString(),
  });
  if (profile.error) throw profile.error;

  return publicUrl;
}
