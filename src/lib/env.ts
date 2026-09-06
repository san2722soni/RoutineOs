export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  youtubeApiKey: process.env.EXPO_PUBLIC_YOUTUBE_API_KEY,
  googleGeocodingApiKey: process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_API_KEY,
};

export function missingSupabaseEnv() {
  return [!env.supabaseUrl && "EXPO_PUBLIC_SUPABASE_URL", !env.supabasePublishableKey && "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].filter(Boolean);
}
