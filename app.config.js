const staticConfig = require("./app.json").expo;

module.exports = ({ config }) => ({
  ...staticConfig,
  ...config,
  android: {
    ...staticConfig.android,
    ...config.android,
    config: {
      ...staticConfig.android?.config,
      ...config.android?.config,
      googleMaps: {
        ...staticConfig.android?.config?.googleMaps,
        ...config.android?.config?.googleMaps,
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      },
    },
  },
});
