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

// drizzle-orm/expo-sqlite migrations.js imports .sql files directly.
// babel-plugin-inline-import (babel.config.js) inlines SQL as string literals so
// Metro never tries to parse raw SQL as JavaScript (backtick identifiers = invalid JS).
config.resolver.sourceExts.push("sql");

module.exports = withNativeWind(config, { input: "./global.css" });
