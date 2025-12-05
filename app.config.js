export default ({ config }) => {
  return {
    ...config,
    name: "SolarTech",
    slug: "solartech",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.operationgbd.solartech",
    },
    
    android: {
      package: "com.operationgbd.solartech",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    
    web: {
      bundler: "metro",
    },
    
    plugins: [
      "expo-secure-store",
      "expo-mail-composer",
      "expo-web-browser",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow SolarTech to access your location."
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow SolarTech to access your camera."
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow SolarTech to access your photos."
        }
      ],
    ],
    
    extra: {
      ...config.extra,
      apiUrl: process.env.API_URL ?? 'https://gbd-solar-backend-production.up.railway.app/api',
      eas: {
        projectId: "61c8127e-0000-0000-0000-000000000000"
      }
    },
  };
};
