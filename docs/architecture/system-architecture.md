# System Architecture

## Overview

CallMaster is built on a containerized microservices architecture using Docker Compose, designed for scalability, maintainability, and deployment flexibility. This document covers the infrastructure layer that supports the application components.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React/Vite)  │◄──►│   (FastAPI)     │◄──►│  (PostgreSQL)   │
│   Port: 5173    │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Host File System                             │
│  ./frontend/ ◄─── Volume Mount ───► /app                       │
│  ./backend/  ◄─── Volume Mount ───► /app                       │
│  ./docs/     ◄─── Volume Mount ───► /docs                      │
└─────────────────────────────────────────────────────────────────┘
                                ▲
                                │
                    ┌─────────────────┐
                    │     Redis       │
                    │  (Rate Limiting)│
                    │ Optional Service│
                    └─────────────────┘
```

## Container Architecture

### 1. Frontend Service (`frontend`)
- **Base Image**: `node:20-alpine`
- **Port**: 5173 (mapped to host)
- **Volume Mount**: `./frontend:/app`
- **Purpose**: React development server with hot reload
- **Dependencies**: Backend service

**Key Features:**
- Live reload during development
- Vite-based build system
- Chakra UI component library
- TypeScript for type safety

### 2. Backend Service (`backend`)
- **Base Image**: `python:3.11`
- **Port**: 8000 (mapped to host)
- **Volume Mounts**: 
  - `./backend:/app` (application code)
  - `./docs:/docs` (documentation files)
- **Purpose**: FastAPI REST API server
- **Dependencies**: Database service (with health check)

**Key Features:**
- FastAPI with automatic OpenAPI documentation
- SQLAlchemy ORM with Alembic migrations
- Clerk authentication integration
- Rate limiting (when Redis available)
- Testing infrastructure

### 3. Database Service (`db`)
- **Base Image**: `postgres:15-alpine`
- **Port**: 5432 (mapped to host)
- **Volume**: `postgres_data:/var/lib/postgresql/data/`
- **Purpose**: Primary data storage
- **Health Check**: Built-in PostgreSQL health monitoring

**Key Features:**
- Persistent data storage
- ACID compliance
- Connection pooling
- Automated backups (when configured)

### 4. Redis Service (Optional)
- **Purpose**: Rate limiting and caching
- **Port**: 6379 (not exposed to host by default)
- **Integration**: Graceful degradation when unavailable
- **Dependencies**: None (standalone service)

**Key Features:**
- API rate limiting via slowapi
- Graceful fallback when Redis is unavailable
- Different rate limits for different endpoint types:
  - Webhooks: Conservative limits for external services
  - System tests: Higher limits for internal testing
  - General API: Balanced limits for user interactions

## File System Strategy

### Volume Mounting Philosophy
The architecture uses bind mounts for development and named volumes for data persistence:

1. **Development Bind Mounts**: Enable live code editing
   - `./frontend:/app` - React source code hot reload
   - `./backend:/app` - Python source code auto-restart
   - `./docs:/docs` - Documentation file serving

2. **Persistent Named Volumes**: Maintain data across container restarts
   - `postgres_data` - Database storage
   - Survives container recreation and updates

### Documentation Integration
The `/docs` mount enables the backend to serve markdown documentation:

```python
# Backend API endpoint
@app.get("/api/docs/{file_path:path}")
async def get_documentation(file_path: str):
    docs_dir = Path("/docs") if Path("/docs").exists() else Path(__file__).parent.parent / "docs"
    # Security checks and file serving...
```

This design allows:
- **Live documentation updates** without container rebuilds
- **Security boundaries** through path validation
- **Flexible deployment** (mount different docs in production)

## Environment Configuration

### Development Environment
```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    volumes:
      - ./backend:/app      # Live code editing
      - ./docs:/docs        # Documentation serving
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

### Environment Variables (`.env`)
```bash
# Database Configuration
POSTGRES_USER=callmaster_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=callmaster_db

# API Keys
CLERK_SECRET_KEY=your_clerk_secret
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_public_key

# Optional Services
REDIS_URL=redis://localhost:6379  # For rate limiting
```

## Testing Infrastructure

### Why These Dependencies?
The backend container includes specialized testing tools:

#### Core Testing Framework
```dockerfile
# Installed in backend container
RUN pip install pytest pytest-asyncio faker speedtest-cli
```

**pytest + pytest-asyncio**: 
- Unit and integration testing
- Async endpoint testing
- Database transaction testing

**faker**: 
- Generate realistic test data
- User profiles, addresses, phone numbers
- Consistent test scenarios

**speedtest-cli**: 
- Network performance testing
- API response time validation
- Infrastructure health monitoring

### Testing Architecture
```
┌─────────────────┐
│   Test Suite    │
├─────────────────┤
│ • Environment   │ ─► Validate configuration
│ • Database      │ ─► Test connections/queries  
│ • API Endpoints │ ─► Validate all routes
│ • Authentication│ ─► Clerk integration tests
│ • Performance   │ ─► Network/response testing
│ • Network       │ ─► Connectivity validation
└─────────────────┘
```

## Security Architecture

### Container Isolation
- **Network Segmentation**: Services communicate through Docker networks
- **File System Boundaries**: Containers can only access mounted volumes
- **Process Isolation**: Each service runs in isolated environment

### API Security
```python
# Rate limiting (when Redis available)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://localhost:6379"
)
```

### Path Security
Documentation serving includes security validation:
```python
# Prevent directory traversal attacks
if not str(requested_file.resolve()).startswith(str(docs_dir.resolve())):
    raise HTTPException(status_code=403, detail="Access denied")
```

## Database Architecture

### Connection Strategy
```python
# SQLAlchemy connection with environment-based configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://user:password@localhost:5432/callmaster"
)
```

### Migration Management
```bash
# Alembic migrations in container
alembic upgrade head    # Apply latest migrations
alembic revision --autogenerate -m "description"  # Create new migration
```

### Data Persistence
- **Named Volumes**: `postgres_data` survives container recreation
- **Backup Strategy**: Can mount backup directory for automated dumps
- **Development Data**: Isolated from production through environment variables

## Development vs Production

### Development Features
- **Live Reload**: Code changes trigger automatic restarts
- **Debug Mode**: Detailed error messages and logging
- **Volume Mounts**: Direct file system access
- **Development Ports**: Services exposed on localhost

### Production Adaptations
```yaml
# Production docker-compose.override.yml
services:
  frontend:
    build:
      target: production    # Multi-stage build
    volumes: []             # Remove development mounts
  
  backend:
    environment:
      - DEBUG=false
      - LOG_LEVEL=WARNING
    volumes:
      - ./docs:/docs        # Keep documentation mount
```

## Monitoring and Health Checks

### Database Health Check
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
  interval: 5s
  timeout: 5s
  retries: 5
```

### Service Dependencies
```yaml
backend:
  depends_on:
    db:
      condition: service_healthy  # Wait for database
```

### Application Health Endpoints
```python
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "database": "connected",
        "version": "1.0.0"
    }
```

## Scaling Considerations

### Horizontal Scaling
```yaml
# Multiple backend instances
backend:
  deploy:
    replicas: 3
  environment:
    - REDIS_URL=redis://redis:6379  # Shared session storage
```

### Load Balancing
```yaml
# Nginx reverse proxy
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
  depends_on:
    - backend
```

### Database Scaling
- **Read Replicas**: Separate read/write database instances
- **Connection Pooling**: PgBouncer for connection management
- **Caching**: Redis for session and application caching

## Deployment Strategies

### Development Deployment
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Run migrations
docker-compose exec backend alembic upgrade head
```

### Production Deployment
```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Deploy with production overrides  
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Health check
curl http://localhost/api/health
```

## Troubleshooting

### Common Issues

**Container Won't Start**
```bash
# Check container logs
docker-compose logs backend

# Verify environment variables
docker-compose config
```

**Database Connection Issues**
```bash
# Test connection
docker-compose exec backend python -c "from database import engine; print(engine.execute('SELECT 1'))"

# Check database logs
docker-compose logs db
```

**Volume Mount Issues**
```bash
# Verify mounts
docker-compose exec backend ls -la /docs
docker-compose exec backend ls -la /app
```

**Port Conflicts**
```bash
# Check port usage
lsof -i :8000
lsof -i :5173
lsof -i :5432
```

## Future Architecture Enhancements

### Planned Improvements
1. **Redis Integration**: Session storage and caching
2. **Nginx Reverse Proxy**: Load balancing and SSL termination
3. **Monitoring Stack**: Prometheus + Grafana
4. **Log Aggregation**: ELK stack or similar
5. **CI/CD Pipeline**: Automated testing and deployment

### Security Enhancements
1. **SSL/TLS**: HTTPS everywhere
2. **Container Scanning**: Vulnerability assessments
3. **Secret Management**: Vault or similar
4. **Network Policies**: Restrict inter-service communication

---

*This architecture provides a solid foundation for development and production deployment while maintaining flexibility for future enhancements.*