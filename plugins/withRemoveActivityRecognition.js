const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Removes android.permission.ACTIVITY_RECOGNITION from the merged manifest.
 * expo-sensors injects this permission for its Pedometer module, but we only
 * use the Accelerometer — activity recognition is not needed.
 */
module.exports = function withRemoveActivityRecognition(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const permissions = manifest.manifest["uses-permission"] ?? [];

    manifest.manifest["uses-permission"] = permissions.filter(
      (p) =>
        p.$?.["android:name"] !== "android.permission.ACTIVITY_RECOGNITION"
    );

    return mod;
  });
};
