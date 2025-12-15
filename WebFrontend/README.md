# CloudUnify Pro - WebFrontend

React 18 + TypeScript + Vite frontend for CloudUnify Pro. Provides dashboards, resource inventory, cost analytics, recommendations, automation, and real-time activity streams.

## Quickstart

1) Install:
   npm install

2) Configure env:
   cp .env.example .env
   # Edit VITE_API_BASE (and optionally VITE_WS_URL)
   # Example dev:
   #   VITE_API_BASE=http://localhost:8000
   #   VITE_WS_URL=ws://localhost:8000

3) Run dev server:
   npm run dev
   # Opens on http://localhost:5173

4) Build:
   npm run build

5) Tests:
   npm test

## Environment

- VITE_API_BASE — Required. Backend base URL including scheme (and base path if applicable).
  - Examples: http://localhost:8000, https://api.cloudunify.pro/api/v1
- VITE_WS_URL — Optional. WebSocket base. If not set, derived from VITE_API_BASE by switching the protocol to ws(s) and preserving the base path.

Remove any legacy REACT_APP_* variables. They are not used in Vite and may cause confusion.

## Bulk Upload (Resources & Costs)

- Use the Resources/Costs pages to upload `.csv` or `.xlsx` files.
- Frontend performs client-side parsing/validation and POSTs to:
  - POST /resources/bulk
  - POST /costs/bulk
- Server returns inserted/updated counts plus per-row errors when applicable.

Sample CSVs are provided in the backend repo under:
- BackendAPI/samples/resources.csv
- BackendAPI/samples/costs.csv

## WebSocket Activity

- The Activity page connects to the backend WebSocket activity stream.
- URL is built as `${VITE_WS_URL || derivedFrom(VITE_API_BASE)}/ws/activity-stream/{organization_id}`
- Auth uses the current access token via query string.

## Notes

- Ensure the backend CORS_ORIGINS includes http://localhost:5173 during development.
- Always configure HTTPS and secure cookies/local storage practices for production.
