import { env } from "@/src/lib/env";

export async function reverseGeocode(latitude: number, longitude: number) {
  if (!env.googleGeocodingApiKey) return undefined;
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${env.googleGeocodingApiKey}`);
  if (!response.ok) throw new Error(`Geocoding request failed (${response.status}).`);
  const result = (await response.json()) as { status: string; results?: { formatted_address?: string }[]; error_message?: string };
  if (result.status !== "OK") throw new Error(result.error_message || `Geocoding returned ${result.status}.`);
  return result.results?.[0]?.formatted_address;
}