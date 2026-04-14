# Delcode Backend

Express backend for authentication, OTP verification, role-based APIs, and Supabase data access.

## Run locally

1. Install dependencies:

   npm install

2. Copy environment file and fill values:

   cp .env.example .env

3. Start dev server:

   npm run dev

Backend default URL: `http://localhost:4000`

## Required environment variables

- `NODE_ENV`
- `PORT`
- `FRONTEND_URL`
- `FRONTEND_BASE_URL`
- `BACKEND_BASE_URL`
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

Optional:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ADMIN_ALERT_EMAIL`

## Deploy to Railway

1. Create a new Railway project.
2. Connect this backend repository.
3. Set root directory to `/` (if repo contains backend only) or `/backend` (if monorepo).
4. Add all required env vars from `.env.example`.
5. Railway will run `npm install` and `npm start`.
6. After deploy, verify health endpoint:

   `/api/health`

