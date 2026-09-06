import * as Location from "expo-location";

// The native geocoder provides a label only. Reminder delivery uses saved coordinates.
export async function reverseGeocode(latitude: number, longitude: number) {
  const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
  if (!result) return undefined;
  return [...new Set([result.name, result.street, result.district, result.city, result.region, result.postalCode].filter(Boolean))].join(", ") || undefined;
}
