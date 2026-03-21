# Known Issues

## Web Platform: SQLite Not Supported

### Issue
The web version (`expo start --web`) cannot load due to SQLite initialization failure.

### Root Cause
- `expo-sqlite` on web requires **SharedArrayBuffer** to run synchronous SQLite operations
- SharedArrayBuffer requires specific HTTP headers (`COOP`/`COEP`) to be enabled on the server
- The default Expo dev server doesn't send these headers

### Error Message
```
ReferenceError: SharedArrayBuffer is not defined
  at invokeWorkerSync (expo-sqlite worker)
```

### Workarounds Investigated

#### Option 1: sql.js Fallback (Not Viable)
- `sql.js` is a pure JavaScript port of SQLite
- Requires WebAssembly files served with correct MIME type (`application/wasm`)
- Expo dev server doesn't support this by default
- Would need custom server configuration

#### Option 2: Custom Dev Server (Possible)
- Could add server that sends `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` headers
- Would enable SharedArrayBuffer on the dev server
- Requires ejecting from Expo or custom server setup

#### Option 3: Async SQLite Operations (Best Long-term)
- Refactor all `execSync`, `runSync`, `getFirstSync`, `getAllSync` to async equivalents
- Would be a large refactor (affects all ~10 repository files)
- Not a priority for a mobile-first app

### Current Solution
**Test on native platforms only:**
- ✅ Android: `expo start --android` or Expo Go app
- ✅ iOS: `expo start --ios`
- ❌ Web: Not supported (for development)

### Production Deploy
The app is built and deployed as a mobile app (iOS/Android). Web support is not a current requirement.

### Future Fix
If web support becomes a priority:
1. Move to Vercel or another platform with proper WASM headers configured
2. Implement async SQLite throughout the codebase
3. Or: Create a custom Expo dev server configuration
