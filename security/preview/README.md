# Local application preview

This launcher uses actual application routers with dummy SQLite data and local provider fixtures. It disables dotenv, clears inherited credentials and blocks external connections. It does not replace production integration tests.

## Start backend

Use a Python environment with backend dependencies installed:

```sh
PYTHON_DOTENV_DISABLED=1 python -I security/preview/start_backend.py
```

Backend: http://127.0.0.1:8765. Runtime data is written to the operating system temporary directory under agritwin-security-preview.

## Start frontend

From agritwin-app, with the project's supported Node runtime:

```sh
EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_API_URL=http://127.0.0.1:8765 npm run web -- --host localhost --port 8081
```

Open http://localhost:8081. Demo username: demo-local. Demo password: Demo-local-2026! (a local fixture, never a real credential). demo-new uses the same dummy password and starts without a garden.

Login, profile, fields, field crops and dashboard use the real routers/ORM with dummy data. Weather, geocoding and tasks are local fixtures. The browser loads normal OpenStreetMap tiles. For an entirely offline grid instead of a geographic basemap, explicitly set EXPO_PUBLIC_MAP_TILE_URL to http://127.0.0.1:8765/preview/tiles/{z}/{x}/{y}.png. The market catalogue uses local read-only fixtures for navigation checks; checkout/payment endpoints remain absent. An optional --login-delay-ms argument simulates login latency for loading-screen inspection (default: no delay). Payments, social OAuth, AI and live-device integrations are not exercised. No authenticated production backend service is contacted; public map tiles are requested by the browser.
