# Production Deployment to Render.com

**Date:** September 2025
**Status:** Current Practice
**Category:** Infrastructure & Deployment

## Overview

This document outlines the complete process for deploying Cuebe to Render.com as a production-ready theater management system. The deployment uses a three-service architecture: managed PostgreSQL database, FastAPI backend web service, and React frontend static site.

## Architecture Overview

### Service Structure

Cuebe's production deployment consists of three interconnected services:

1. **Database Service** (`cuebe-postgres`)
   - Managed PostgreSQL instance
   - Automatic backups and scaling
   - Internal connection string provided via `DATABASE_URL`

2. **Backend Web Service** (`cuebe-backend`)
   - FastAPI Python application
   - Handles API requests, authentication, and business logic
   - WebSocket support for real-time script synchronization
   - Health check endpoint at `/api/health`

3. **Frontend Static Site** (`cuebe-frontend`)
   - React 19.1.0 single-page application
   - Built with Vite and served as static files
   - CDN distribution for global performance

### Communication Flow

```
User Browser → Frontend Static Site → Backend Web Service → PostgreSQL Database
              ↑                     ↑
              CDN                   Load Balancer
```

## Configuration Files

### render.yaml Blueprint

The `render.yaml` file serves as the infrastructure-as-code definition for all services:

```yaml
databases:
  - name: cuebe-postgres
    databaseName: cuebe_db
    user: cuebe_user

services:
  - type: web
    name: cuebe-backend
    runtime: python
    buildCommand: cd backend && pip install -r requirements.txt
    startCommand: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /api/health

  - type: static
    name: cuebe-frontend
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: ./frontend/dist
```

**Key Design Decisions:**

- **Monorepo Structure**: Both frontend and backend are built from the same repository using `cd` commands
- **Health Checks**: Backend includes automatic health monitoring
- **Build Optimization**: Frontend build filters ensure only relevant changes trigger rebuilds
- **Environment Isolation**: All sensitive values marked as `sync: false` for manual configuration

## Code Modifications for Production

### Backend Changes

#### Database Connection Strategy

**File**: `backend/database.py`

The database connection logic was modified to support both local development and production environments:

```python
# Check if DATABASE_URL is provided (for production/Render.com)
DATABASE_URL = os.getenv("DATABASE_URL")

# If no DATABASE_URL, construct it from individual components (for local development)
if not DATABASE_URL:
    DATABASE_URL = "postgresql://{user}:{password}@{host}:{port}/{db}".format(
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        host="db",
        port="5432",
        db=os.getenv("POSTGRES_DB"),
    )
```

**Rationale**: Render.com provides a complete connection string via `DATABASE_URL`, while local Docker development uses individual environment variables. This approach maintains backward compatibility while supporting cloud deployment.

#### CORS Configuration

**File**: `backend/main.py`

The CORS middleware was enhanced to support production origins:

```python
# CORS configuration - support both local development and production
allowed_origins = ["http://localhost:5173"]

# Add production origin if specified
production_origin = os.getenv("ALLOWED_ORIGINS")
if production_origin:
    allowed_origins.extend([origin.strip() for origin in production_origin.split(",")])
```

**Rationale**: Security best practice requires explicit origin allowlisting. The configuration supports multiple origins via comma-separated values while maintaining localhost access for development.

### Frontend Changes

#### Build Configuration

**File**: `frontend/vite.config.js`

The Vite configuration was modified to conditionally apply development-only features:

```javascript
export default defineConfig(({ mode }) => {
  const config = {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
  };

  // Only add proxy for development mode
  if (mode === 'development') {
    config.server.proxy = {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      },
      // ... additional proxy rules
    };
  }

  return config;
});
```

**Rationale**: The proxy configuration is only needed for local development where the frontend and backend run on different ports. In production, the frontend makes direct API calls to the backend service URL.

#### API Configuration

**File**: `frontend/src/config/api.ts`

A new API configuration utility was created to handle environment-specific URLs:

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // In development, use relative paths (proxy handles routing)
  // In production, use the full API base URL
  return API_BASE_URL ? `${API_BASE_URL}/${cleanPath}` : `/${cleanPath}`;
};
```

**Rationale**: This utility centralizes URL construction logic and automatically switches between relative paths (development) and absolute URLs (production) based on environment variables.

## Environment Variables

### Security Model

All sensitive configuration values are marked with `sync: false` in the render.yaml, requiring manual configuration through the Render.com dashboard. This prevents accidental exposure of secrets in version control.

### Required Variables

#### Backend Service
- `DATABASE_URL`: Automatically provided by Render's managed PostgreSQL
- `ALLOWED_ORIGINS`: Frontend URL for CORS policy
- `CLERK_PUBLISHABLE_KEY`: Clerk authentication public key
- `CLERK_SECRET_KEY`: Clerk authentication private key
- `CLERK_PEM_PUBLIC_KEY`: JWT verification public key (multi-line)
- `CLERK_WEBHOOK_SECRET`: Webhook signature verification

#### Frontend Service
- `VITE_API_BASE_URL`: Backend service URL for API calls
- `VITE_CLERK_PUBLISHABLE_KEY`: Clerk authentication public key

### Environment Separation

The configuration maintains clear separation between development and production:

- **Development**: Uses Docker Compose with `.env` file
- **Production**: Uses Render.com environment variables
- **Testing**: Can use either approach depending on test environment

## Authentication Integration

### Clerk Configuration

Cuebe uses Clerk for authentication with specific requirements for production deployment:

1. **JWT Verification**: The backend validates JWTs using the PEM public key
2. **Webhook Security**: Webhooks are verified using the webhook secret
3. **Client Integration**: The frontend uses the publishable key for Clerk SDK

### Security Considerations

- All Clerk keys are environment-specific (test keys for development, production keys for production)
- JWT tokens are verified server-side before processing requests
- Webhook endpoints include signature verification to prevent forgery
- CORS policies are strictly enforced to prevent unauthorized cross-origin requests

## Build Process

### Backend Build
1. Install Python dependencies from `requirements.txt`
2. Start Uvicorn ASGI server with FastAPI application
3. Health checks verify service availability
4. Database migrations run automatically on startup

### Frontend Build
1. Install Node.js dependencies via npm
2. Run Vite build process with production optimizations
3. Generate static assets in `dist/` directory
4. Deploy static files to Render's CDN

### Optimization Features
- **Tree Shaking**: Unused JavaScript code is eliminated
- **Asset Optimization**: Images and CSS are minified and compressed
- **Code Splitting**: JavaScript bundles are split for optimal loading
- **Static Generation**: All routes are pre-built for fastest delivery

## Deployment Workflow

### Initial Setup
1. Push repository with `render.yaml` to GitHub
2. Create Blueprint on Render.com connected to repository
3. Configure environment variables in Render dashboard
4. Deploy all services simultaneously

### Continuous Deployment
- **Automatic Deployments**: Triggered by pushes to main branch
- **Build Filters**: Only relevant changes trigger service rebuilds
- **Zero Downtime**: Rolling deployments with health checks
- **Rollback Support**: Previous versions remain available

### Monitoring and Health Checks
- **Backend Health**: `/api/health` endpoint monitors service status
- **Database Health**: Connection pool monitoring and query performance
- **Frontend Health**: Static asset availability and CDN performance

## Troubleshooting Guide

### Common Issues

#### Database Connection Errors
- **Symptom**: Backend fails to start with database connection errors
- **Solution**: Verify `DATABASE_URL` is automatically set by Render
- **Debug**: Check service logs for specific connection error messages

#### CORS Errors
- **Symptom**: Frontend API calls fail with CORS policy errors
- **Solution**: Ensure `ALLOWED_ORIGINS` includes the frontend URL
- **Debug**: Check browser network tab for specific CORS error details

#### Build Failures
- **Symptom**: Service fails to build or deploy
- **Solution**: Verify all dependencies are correctly specified
- **Debug**: Review build logs for specific error messages

#### Authentication Issues
- **Symptom**: Users cannot log in or JWT validation fails
- **Solution**: Verify all Clerk environment variables are correctly set
- **Debug**: Check authentication service logs and JWT token format

### Performance Optimization

#### Backend Performance
- **Database Queries**: Use SQLAlchemy query optimization and indexing
- **Connection Pooling**: Configured for optimal database connection management
- **Caching**: Implement Redis caching for frequently accessed data
- **Rate Limiting**: API rate limiting to prevent abuse

#### Frontend Performance
- **Bundle Size**: Monitor and optimize JavaScript bundle sizes
- **Asset Loading**: Use lazy loading for non-critical resources
- **CDN Utilization**: Leverage Render's CDN for global asset delivery
- **Service Workers**: Implement for offline functionality and caching

## Maintenance and Updates

### Regular Maintenance Tasks
- **Dependency Updates**: Regular security updates for Python and Node.js packages
- **Database Maintenance**: Regular vacuum and analyze operations
- **Log Monitoring**: Review application logs for errors and performance issues
- **Security Audits**: Regular review of authentication and authorization logic

### Scaling Considerations
- **Vertical Scaling**: Increase service resource allocation as needed
- **Horizontal Scaling**: Add multiple backend service instances for high load
- **Database Scaling**: Upgrade to higher-performance database tiers
- **CDN Optimization**: Implement additional caching strategies

## Conclusion

The Render.com deployment architecture provides a robust, scalable foundation for Cuebe's production environment. The configuration balances simplicity with production requirements, maintaining development workflow compatibility while enabling cloud-native deployment patterns.

The infrastructure-as-code approach via `render.yaml` ensures reproducible deployments, while the environment variable strategy maintains security best practices. The separation of concerns between database, backend, and frontend services enables independent scaling and maintenance.

This deployment strategy supports Cuebe's mission as a comprehensive theater production management system by providing reliable, performant infrastructure that can scale with growing user demands while maintaining the real-time collaboration features essential for live theater production.