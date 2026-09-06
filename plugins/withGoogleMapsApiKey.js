const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withGoogleMapsApiKey(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    const apiKey = modConfig.android?.config?.googleMaps?.apiKey || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!application || !apiKey) return modConfig;

    application["meta-data"] = application["meta-data"] || [];
    const placesApiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    const entry = application["meta-data"].find((item) => item.$?.["android:name"] === "com.google.android.geo.API_KEY");
    if (entry) {
      entry.$["android:value"] = apiKey;
    } else {
      application["meta-data"].push({
        $: {
          "android:name": "com.google.android.geo.API_KEY",
          "android:value": apiKey,
        },
      });
    }
    if (placesApiKey) {
      const placesEntry = application["meta-data"].find((item) => item.$?.["android:name"] === "com.google.android.libraries.places.API_KEY");
      if (placesEntry) {
        placesEntry.$["android:value"] = placesApiKey;
      } else {
        application["meta-data"].push({
          $: {
            "android:name": "com.google.android.libraries.places.API_KEY",
            "android:value": placesApiKey,
          },
        });
      }
    }
    return modConfig;
  });
};
