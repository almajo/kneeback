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

// drizzle-orm/expo-sqlite uses synchronous SQLite operations (prepareSync, runSync, etc.)
// which require SharedArrayBuffer on web. SharedArrayBuffer requires COOP/COEP headers.
// These headers are set on the Vercel deployment via vercel.json; here we add them
// to the Metro dev server so local development also works without errors.
// Note: config is set on the result of withNativeWind to ensure it is not overwritten.
const finalConfig = withNativeWind(config, { input: "./global.css" });
finalConfig.server = {
  ...finalConfig.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    return middleware(req, res, next);
  },
};

module.exports = finalConfig;
