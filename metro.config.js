const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// expo-sqlite uses a WebAssembly file for its web implementation.
// Metro doesn't support .wasm module imports by default, so we treat them
// as static assets (which returns a URL at runtime that wa-sqlite can fetch).
config.resolver.assetExts.push("wasm");
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (ext) => ext !== "wasm"
);

module.exports = withNativeWind(config, { input: "./global.css" });
