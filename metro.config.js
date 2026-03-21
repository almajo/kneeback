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
// We use a custom transformer that converts .sql files into JS modules exporting
// the SQL as a string, preventing Babel from trying to parse SQL as JavaScript
// (backtick-quoted identifiers in drizzle SQL are invalid JS syntax).
config.resolver.sourceExts.push("sql");
config.transformer.babelTransformerPath = require.resolve(
  "./sql-metro-transformer"
);

module.exports = withNativeWind(config, { input: "./global.css" });
