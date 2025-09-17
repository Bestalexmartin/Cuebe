# Production Deployment Checklist

**Date:** September 2025
**Status:** Current
**Category:** Planning & Operations

## Overview

This comprehensive checklist ensures a smooth transition from development to production deployment on cloud platforms like Render.com. Each step includes rationale and common pitfalls to avoid the "feeling our way through the dark" experience for future deployments.

---

## Pre-Deployment Code Preparation

### ✅ **1. API Communication Standardization**
**Why Critical:** Production environments often use different domains/subdomains than development, breaking hardcoded API calls.

- [ ] **Centralize API URL construction**
  - Implement `getApiUrl()` function in config
  - Replace all hardcoded `/api/*` fetch calls with `getApiUrl('/api/*')`
  - Add `VITE_API_BASE_URL` environment variable support

- [ ] **Centralize WebSocket URL construction**
  - Implement `getWsUrl()` function for WebSocket connections
  - Replace manual WebSocket URL building with centralized config
  - Ensure proper `ws://` to `wss://` protocol handling

- [ ] **Verify all communication methods**
  - Search for `fetch(`, `new WebSocket(`, `axios(` patterns
  - Ensure no hardcoded domains or ports
  - Test both relative and absolute URL scenarios

**Common Pitfall:** Missing even one hardcoded API call causes production failures with "Unexpected end of JSON input" or connection errors.

### ✅ **2. Environment Variable Audit**
**Why Critical:** Production requires different configurations than development.

- [ ] **Frontend environment variables**
  - `VITE_API_BASE_URL` for production API domain
  - `VITE_CLERK_PUBLISHABLE_KEY` for production Clerk instance
  - Review all `import.meta.env.VITE_*` usage

- [ ] **Backend environment variables**
  - `DATABASE_URL` for production database connection
  - `CLERK_SECRET_KEY` for production Clerk authentication
  - `ALLOWED_ORIGINS` for CORS configuration
  - `APP_ENV=production` for environment detection

- [ ] **Security verification**
  - No development secrets in production
  - All sensitive data in environment variables, not code
  - No hardcoded localhost URLs or development tokens

### ✅ **3. CORS Configuration**
**Why Critical:** Production domains differ from localhost, requiring explicit CORS setup.

- [ ] **Backend CORS setup**
  - Configure `ALLOWED_ORIGINS` environment variable
  - Include all frontend domains: `https://yourdomain.com,https://www.yourdomain.com`
  - Support dynamic origin addition via environment variables

- [ ] **Test CORS scenarios**
  - Verify OPTIONS preflight requests work
  - Test with and without `www.` subdomain
  - Confirm WebSocket CORS if applicable

### ✅ **4. Code Quality & Build Verification**
**Why Critical:** Catch issues before they reach production.

- [ ] **TypeScript validation**
  - Run `npm run typecheck` and fix all errors
  - Ensure no `any` types in critical paths
  - Verify all imports resolve correctly

- [ ] **Linting & formatting**
  - Run `npm run lint` and fix all issues
  - Ensure consistent code style
  - Review and fix any security warnings

- [ ] **Production build test**
  - Run `npm run build` successfully
  - Test built application locally with `npm run preview`
  - Verify all routes and assets load correctly

---

## Render.com Platform Setup

### ✅ **5. Service Architecture Planning**
**Why Critical:** Proper service separation enables independent scaling and clearer domain routing.

- [ ] **Define service structure**
  - **Frontend service:** Static site for React app
  - **Backend service:** Web service for FastAPI
  - **Database:** PostgreSQL instance

- [ ] **Plan domain structure**
  - Primary: `yourdomain.com` (frontend)
  - API subdomain: `api.yourdomain.com` (backend)
  - Optional: `www.yourdomain.com` (frontend alias)

### ✅ **6. Database Service Creation**
**Why Critical:** Database must exist before backend service can connect.

- [ ] **Create PostgreSQL database**
  - Choose appropriate plan (free tier for testing)
  - Note the database URL format
  - Consider backup/restore policies

- [ ] **Database migration planning**
  - Ensure Alembic migrations are ready
  - Plan initial data seeding if needed
  - Test migration rollback procedures

### ✅ **7. Backend Service Configuration**
**Why Critical:** API service must be fully functional before frontend deployment.

- [ ] **Create web service on Render**
  - Connect to Git repository
  - Set build command: `pip install -r requirements.txt`
  - Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

- [ ] **Configure environment variables**
  ```
  DATABASE_URL=postgresql://[from database service]
  CLERK_SECRET_KEY=[production secret from Clerk]
  ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
  APP_ENV=production
  ```

- [ ] **Verify backend health**
  - Test API endpoints via Render URL
  - Confirm database connectivity
  - Validate authentication endpoints

### ✅ **8. Frontend Service Configuration**
**Why Critical:** Frontend deployment must be optimized for production and properly routed.

- [ ] **Create static site on Render**
  - Build command: `npm install && npm run build`
  - Publish directory: `dist`
  - Set Node.js version if needed

- [ ] **Configure environment variables**
  ```
  VITE_API_BASE_URL=https://api.yourdomain.com
  VITE_CLERK_PUBLISHABLE_KEY=[production key from Clerk]
  ```

- [ ] **Set up routing rules**
  - Create `_redirects` file for SPA routing
  - Configure `/*    /index.html   200` for React Router
  - Handle any API proxy rules if needed

---

## Custom Domain Configuration

### ✅ **9. Domain & DNS Setup**
**Why Critical:** Professional appearance and proper SSL certificate handling.

- [ ] **Purchase and configure domain**
  - Point main domain to frontend service
  - Create CNAME for `api.yourdomain.com` → backend service
  - Optional: CNAME for `www.yourdomain.com` → frontend service

- [ ] **SSL certificate verification**
  - Render automatically provides Let's Encrypt certificates
  - Verify HTTPS works for all domains
  - Test certificate auto-renewal

- [ ] **DNS propagation testing**
  - Use tools like `dig` or online DNS checkers
  - Verify all domains resolve correctly
  - Test from multiple geographic locations

### ✅ **10. Subdomain Strategy**
**Why Critical:** Clean separation between frontend and API improves caching and scaling.

- [ ] **API subdomain benefits**
  - Separate caching policies for API vs static content
  - Independent scaling of frontend/backend
  - Clearer CORS configuration
  - Professional API endpoint structure

- [ ] **Update application configuration**
  - Set `VITE_API_BASE_URL=https://api.yourdomain.com`
  - Update CORS to include main domain
  - Test all API calls work with subdomain

---

## Authentication Service Setup

### ✅ **11. Clerk Production Instance**
**Why Critical:** Development and production must have separate authentication systems.

- [ ] **Create production Clerk application**
  - Separate from development instance
  - Configure production domains in Clerk dashboard
  - Set up production webhook endpoints

- [ ] **Configure domain settings**
  - Add `yourdomain.com` to allowed domains
  - Configure redirect URLs for production
  - Set up proper frontend/backend integration

- [ ] **Update webhook endpoints**
  - Point webhooks to `https://api.yourdomain.com/api/webhooks/clerk`
  - Verify webhook signatures work in production
  - Test user creation/update flows

- [ ] **Key management**
  - Use production `CLERK_PUBLISHABLE_KEY` in frontend
  - Use production `CLERK_SECRET_KEY` in backend
  - Secure storage of all keys in environment variables

---

## Testing & Validation

### ✅ **12. Comprehensive Production Testing**
**Why Critical:** Catch issues before users do.

- [ ] **Core functionality testing**
  - User registration and login flows
  - All major feature workflows
  - API endpoint functionality
  - WebSocket connections (if applicable)

- [ ] **Cross-browser testing**
  - Test on Chrome, Firefox, Safari
  - Verify mobile responsiveness
  - Check for console errors

- [ ] **Performance verification**
  - Lighthouse audit scores
  - API response times
  - Database query performance
  - Bundle size optimization

### ✅ **13. Monitoring & Logging Setup**
**Why Critical:** Visibility into production issues.

- [ ] **Application monitoring**
  - Review Render service logs
  - Set up error tracking if needed
  - Monitor database performance
  - Track API endpoint usage

- [ ] **Health check endpoints**
  - Implement `/health` endpoint in backend
  - Monitor service uptime
  - Set up alerting for downtime

---

## Launch Preparation

### ✅ **14. Launch Sequence**
**Why Critical:** Proper order prevents cascading failures.

1. **Database service** (if new)
2. **Backend service** with environment variables
3. **Frontend service** with production config
4. **DNS propagation** (can take up to 48 hours)
5. **SSL certificate generation** (automatic)
6. **End-to-end testing**

### ✅ **15. Post-Launch Monitoring**
**Why Critical:** Immediate issue detection and resolution.

- [ ] **24-hour monitoring window**
  - Watch error rates and logs
  - Monitor performance metrics
  - Check user feedback channels

- [ ] **Rollback preparation**
  - Know how to revert each service
  - Have previous working build available
  - Document emergency procedures

---

## Common Gotchas & Solutions

### **API Communication Issues**
- **Problem:** "Unexpected end of JSON input" errors
- **Cause:** Hardcoded API URLs not using `getApiUrl()`
- **Solution:** Centralize all API calls through configuration functions

### **CORS Failures**
- **Problem:** API calls blocked by browser
- **Cause:** Missing production domain in `ALLOWED_ORIGINS`
- **Solution:** Include all frontend domains in CORS configuration

### **Authentication Loops**
- **Problem:** Infinite redirect or login failures
- **Cause:** Clerk development keys used in production
- **Solution:** Use production Clerk instance with correct domain settings

### **Build Failures**
- **Problem:** Production build fails on Render
- **Cause:** Development dependencies missing or environment differences
- **Solution:** Test production builds locally, verify `package.json` scripts

### **WebSocket Connection Issues**
- **Problem:** Real-time features don't work in production
- **Cause:** Hardcoded WebSocket URLs or wrong protocol (ws vs wss)
- **Solution:** Use `getWsUrl()` with proper HTTPS/WSS protocol detection

---

## Emergency Procedures

### **Quick Rollback**
1. Revert Git to last known working commit
2. Trigger Render redeploy from Render dashboard
3. Monitor logs for successful deployment
4. Verify core functionality restored

### **Domain Issues**
1. Check DNS propagation status
2. Verify Render domain configuration
3. Test with direct Render URLs as fallback
4. Contact domain provider if needed

### **Database Emergency**
1. Check database connection limits
2. Review recent migrations for issues
3. Use Render database backups if available
4. Scale database resources if needed

---

**Remember:** This checklist is a living document. Update it with lessons learned from each deployment to continually improve the process.