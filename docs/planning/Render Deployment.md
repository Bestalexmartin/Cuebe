# Cuebe Deployment Guide for Render.com

## Overview

This deployment uses three services on Render.com:
1. **Managed PostgreSQL Database** - cuebe-postgres
2. **Web Service (FastAPI Backend)** - cuebe-backend
3. **Static Site (React Frontend)** - cuebe-frontend

## Prerequisites

1. Create a [Render.com](https://render.com) account
2. Connect your GitHub repository to Render
3. Generate the Blok 017 auth secrets (`JWT_SECRET_KEY`, `TOTP_ENCRYPTION_KEY`)

## Deployment Steps

### 1. Push render.yaml to Repository

The `render.yaml` file is already configured. Push your changes to GitHub:

```bash
git add .
git commit -m "Add Render.com deployment configuration"
git push
```

### 2. Create Services on Render

1. Go to your Render Dashboard
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Select the repository and branch
5. Render will automatically detect the `render.yaml` file

### 3. Configure Environment Variables

After services are created, you'll need to manually set these environment variables in the Render dashboard:

#### Backend Service (cuebe-backend):
- `APP_ENV`: Set to `production`
- `JWT_SECRET_KEY`: Secret used to sign Blok 017 HS256 access/refresh JWTs
- `TOTP_ENCRYPTION_KEY`: Encryption key for stored MFA/TOTP secrets

#### Frontend Service (cuebe-frontend):
- `VITE_API_BASE_URL`: Backend service URL for API calls

### 4. Environment Variable Template

Populate each variable in the Render dashboard. Generate fresh secrets for this deployment. Use `.env.example` (or your local `.env`) as the reference; never commit real values.

```
APP_ENV=production
JWT_SECRET_KEY=<generate a strong random secret>
TOTP_ENCRYPTION_KEY=<generate a strong random key>
```

### 5. Verify Deployment

1. Wait for all services to deploy (this may take 10-15 minutes)
2. Check that the database is connected
3. Test the backend health endpoint: `https://cuebe-backend.onrender.com/api/health`
4. Test the frontend: `https://cuebe-frontend.onrender.com`

## Service URLs

After deployment, your services will be available at:

- **Frontend**: https://cuebe-frontend.onrender.com
- **Backend API**: https://cuebe-backend.onrender.com
- **Database**: Managed by Render (internal connection)

## Changes Made for Production

1. **Backend (`database.py`)**: Added support for `DATABASE_URL` environment variable
2. **Backend (`main.py`)**: Added configurable CORS origins via `ALLOWED_ORIGINS`
3. **Frontend (`vite.config.js`)**: Conditional proxy only in development mode
4. **Frontend (`config/api.ts`)**: New API configuration utility for production URLs
5. **Frontend (`utils/saveScript.ts`)**: Updated to use configurable API URLs

## Troubleshooting

### Backend Issues
- Check environment variables are set correctly
- Verify database connection in logs
- Ensure `JWT_SECRET_KEY` is set (auth tokens fail to verify without it)

### Frontend Issues
- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS configuration in backend
- Ensure auth cookies are accepted (check `COOKIE_DOMAIN` and CORS credentials)

### Database Issues
- Verify DATABASE_URL is automatically provided by Render
- Check database logs for connection issues

## Local Development

Local development continues to work as before using Docker Compose:

```bash
docker-compose up
```

The proxy configuration in `vite.config.js` only activates in development mode.
