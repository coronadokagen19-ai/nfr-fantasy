# NFR Fantasy

Current release-candidate deployment repository for the NFR Fantasy rodeo app.

The application source is stored as a base64-encoded release bundle so the Docker build can reconstruct the verified source package exactly. The Dockerfile installs dependencies, runs the NFR QA checks, builds the React frontend and Express API, and serves both from one Node process.

## Runtime requirements

Set these environment variables on the hosting platform:

- DATABASE_URL
- NODE_ENV=production
- PORT=8080
- CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- VITE_CLERK_PUBLISHABLE_KEY
- BASE_PATH=/
- APP_OWNER_USER_ID

Optional:
- APP_ORIGIN
- VITE_CLERK_PROXY_URL
- LOG_LEVEL
- SESSION_SECRET

Health check: /api/healthz
