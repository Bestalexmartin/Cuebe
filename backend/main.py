# backend/main.py

import logging
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# Optional slowapi import for rate limiting
try:
    from slowapi.errors import RateLimitExceeded
    from utils.rate_limiter import limiter, rate_limit_exceeded_handler
    RATE_LIMITING_ENABLED = True
except ImportError:
    RateLimitExceeded = None
    limiter = None
    rate_limit_exceeded_handler = None
    RATE_LIMITING_ENABLED = False

# Import routers
from routers import users, crews, venues, departments, shows, webhooks, development, system_tests, script_elements, show_sharing, script_import, docs_search, script_sync
from routers.auth import get_current_user
import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# APP INITIALIZATION
# =============================================================================

app = FastAPI(
    title="Cuebe API",
    description="Theater production management system",
    version="1.0.0",
    docs_url=None,  # Disable default docs
    redoc_url=None  # Disable default redoc
)

# Add rate limiting if available
if RATE_LIMITING_ENABLED and RateLimitExceeded is not None and rate_limit_exceeded_handler is not None:
    # Add rate limiter to app state
    app.state.limiter = limiter
    
    # Add rate limit exception handler
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    logger.info("Rate limiting enabled")
else:
    logger.warning("Rate limiting disabled - slowapi package not available")

# CORS configuration - support both local development and production
allowed_origins = ["http://localhost:5173"]

# Add production origin if specified
production_origin = os.getenv("ALLOWED_ORIGINS")
if production_origin:
    allowed_origins.extend([origin.strip() for origin in production_origin.split(",")])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# ERROR HANDLERS - Ensure all errors return JSON, not HTML
# =============================================================================

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Convert all HTTP exceptions to JSON responses"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code},
        headers=exc.headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Convert validation errors to JSON responses"""
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Convert any unhandled exceptions to JSON responses"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )

# =============================================================================
# INCLUDE ROUTERS
# =============================================================================

# Determine environment flags for gating dev/test routes
ENABLE_DEV_ROUTES = (
    os.getenv("ENABLE_DEV_ROUTES") in {"1", "true", "True"}
    or os.getenv("APP_ENV", "development").lower() in {"dev", "development", "local"}
)

# Include all routers
app.include_router(webhooks.router)     # Webhook endpoints at /api/webhooks/*
app.include_router(users.router)        # User management at /api/users/*
app.include_router(crews.router)        # Crew management at /api/me/crews, /api/crew/*
app.include_router(venues.router)       # Venue management at /api/me/venues, /api/venues/*
app.include_router(departments.router)  # Department management at /api/me/departments, /api/departments/*
# Important: register import routes BEFORE dynamic /scripts/{script_id} to avoid path capture of 'import'
app.include_router(script_import.router) # Script import endpoints at /api/scripts/import/*
app.include_router(shows.router)        # Show and script management at /api/shows/*, /api/scripts/*
app.include_router(script_elements.router)  # Script elements CRUD at /api/scripts/*/elements, /api/elements/*
app.include_router(show_sharing.router) # Show-level sharing at /api/shows/*/crew/*/share, /shared/*
app.include_router(docs_search.router)  # Documentation search at /api/docs/search
app.include_router(script_sync.router)  # WebSocket script synchronization at /ws/script/*
if ENABLE_DEV_ROUTES:
    app.include_router(development.router)  # Development endpoints at /api/dev/*, /api/health
    app.include_router(system_tests.router) # System testing endpoints at /api/system-tests/*
    logger.info("Development and system test routes ENABLED")
else:
    logger.info("Development and system test routes DISABLED")

# =============================================================================
# CLEAN LIGHT MODE DOCUMENTATION ENDPOINTS  
# =============================================================================

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    # Determine the correct OpenAPI URL - use absolute URL for production
    openapi_url = app.openapi_url
    if not openapi_url.startswith('http'):
        # If relative URL, make it absolute using the current request context
        # In production this should be https://api.cuebe.app/openapi.json
        base_url = os.getenv("API_BASE_URL", "")
        if base_url:
            openapi_url = f"{base_url}{openapi_url}"
        else:
            # Fallback - assume same domain
            openapi_url = f"https://api.cuebe.app{openapi_url}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{app.title} - API Explorer</title>
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
        <style>
            html, body {{
                margin: 0;
                padding: 0;
                height: 100%;
                overflow: hidden;
            }}
            #swagger-ui {{
                height: 100vh;
                overflow-y: auto;
            }}
            .swagger-ui .topbar {{ display: none; }}
        </style>
    </head>
    <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
        <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
        <script>
        window.onload = function() {{
            const ui = SwaggerUIBundle({{
                url: '{openapi_url}',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
            }});
        }};
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@app.get("/redoc", include_in_schema=False)
async def custom_redoc_html():
    # Determine the correct OpenAPI URL - use absolute URL for production
    openapi_url = app.openapi_url
    if not openapi_url.startswith('http'):
        # If relative URL, make it absolute using the current request context
        # In production this should be https://api.cuebe.app/openapi.json
        base_url = os.getenv("API_BASE_URL", "")
        if base_url:
            openapi_url = f"{base_url}{openapi_url}"
        else:
            # Fallback - assume same domain
            openapi_url = f"https://api.cuebe.app{openapi_url}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{app.title} - ReDoc</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            html, body {{
                margin: 0;
                padding: 0;
                height: 100%;
                overflow: auto;
            }}
            redoc {{
                height: 100%;
                overflow-y: auto;
                display: block;
            }}
        </style>
    </head>
    <body>
        <redoc spec-url='{openapi_url}' hide-download-button></redoc>
        <script src="https://cdn.jsdelivr.net/npm/redoc@2.1.2/bundles/redoc.standalone.js"></script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

# =============================================================================
# DOCUMENTATION ENDPOINTS
# =============================================================================

@app.get("/api/docs/index")
async def get_documentation_index(
    current_user: models.User = Depends(get_current_user)
):
    """Discover and return metadata for all documentation files in the docs directory."""
    import re
    
    try:
        # Path resolution for Docker vs local development
        docs_dir = Path("/docs") if Path("/docs").exists() else Path(__file__).parent.parent / "docs"
        
        if not docs_dir.exists():
            raise HTTPException(status_code=404, detail="Documentation directory not found")
        
        documents = []
        
        # Walk through all .md files in the docs directory
        for md_file in docs_dir.rglob("*.md"):
            try:
                # Skip README.md as it's now just a regular document
                if md_file.name.lower() == "readme.md":
                    continue
                    
                # Skip detailed-records subdirectory files from main documentation view
                if "detailed-records" in str(md_file):
                    continue
                    
                # Get relative path from docs directory
                relative_path = md_file.relative_to(docs_dir)
                
                # Read file content to extract metadata
                content = md_file.read_text(encoding="utf-8")
                
                # Extract title from first # heading or use filename
                title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
                title = title_match.group(1).strip() if title_match else md_file.stem.replace('-', ' ').title()
                
                # Extract description from first paragraph after title
                # Look for content between title and next heading or first substantial paragraph
                desc_pattern = r'^#\s+.+?\n\n(?:## Overview\n\n)?(.+?)(?:\n\n|\n##|\Z)'
                desc_match = re.search(desc_pattern, content, re.MULTILINE | re.DOTALL)
                description = desc_match.group(1).strip()[:200] + "..." if desc_match and len(desc_match.group(1).strip()) > 200 else (desc_match.group(1).strip() if desc_match else "No description available")
                
                # Determine category based on directory structure
                parts = relative_path.parts
                if len(parts) > 1:
                    category_map = {
                        'planning': 'Planning',
                        'development': 'Quick Start',
                        'architecture': 'System Architecture',
                        'components': 'Component Architecture',
                        'data': 'Data Management',
                        'features': 'User Interface',
                        'user-guides': 'Tutorial',
                        'testing': 'Testing',
                        'standards': 'Planning',
                        'archive': 'Archive',
                        'tutorial': 'Tutorial'
                    }
                    category = category_map.get(parts[0], 'Quick Start')
                else:
                    category = 'Quick Start'
                
                # Determine icon based on category and filename
                if 'test' in md_file.name.lower():
                    icon = 'test'
                elif 'performance' in md_file.name.lower():
                    icon = 'performance'
                elif 'roadmap' in md_file.name.lower():
                    icon = 'roadmap'
                elif 'archive' in md_file.name.lower() or parts[0] == 'archive':
                    icon = 'archive'
                elif 'guide' in md_file.name.lower() or 'tutorial' in md_file.name.lower():
                    icon = 'compass'
                elif 'warning' in md_file.name.lower() or 'error' in md_file.name.lower():
                    icon = 'warning'
                elif parts[0] == 'planning':
                    icon = 'planning'
                else:
                    icon = 'component'
                
                documents.append({
                    'name': title,
                    'path': str(relative_path),
                    'description': description,
                    'category': category,
                    'icon': icon
                })
                
            except Exception as e:
                logger.warning(f"Error processing documentation file {md_file}: {str(e)}")
                continue
        
        # Sort documents by category (in frontend order) then by name
        category_order = [
            'Planning',
            'Quick Start',
            'Tutorial',
            'User Interface',
            'Component Architecture',
            'Data Management',
            'System Architecture',
            'Testing',
            'Archive'
        ]
        
        def get_category_sort_key(doc):
            try:
                return (category_order.index(doc['category']), doc['name'])
            except ValueError:
                # If category not in list, put it at the end
                return (len(category_order), doc['name'])
        
        documents.sort(key=get_category_sort_key)
        
        logger.info(f"Discovered {len(documents)} documentation files")
        return {"documents": documents}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error discovering documentation files: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/docs/{file_path:path}")
async def get_documentation(
    file_path: str,
    current_user: models.User = Depends(get_current_user)
):
    """Serve markdown documentation files from the docs directory."""
    try:
        # Path resolution for Docker vs local development
        docs_dir = Path("/docs") if Path("/docs").exists() else Path(__file__).parent.parent / "docs"
        requested_file = docs_dir / file_path
        
        # Security check: ensure the file is within the docs directory
        if not str(requested_file.resolve()).startswith(str(docs_dir.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if file exists and is a markdown file
        if not requested_file.exists():
            raise HTTPException(status_code=404, detail="Documentation file not found")
        
        if requested_file.suffix.lower() not in ['.md', '.txt', '.mc']:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        # Read and return the file content
        content = requested_file.read_text(encoding="utf-8")
        return {"content": content, "file_path": file_path}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving documentation file {file_path}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/tutorials/{file_path:path}")
async def get_tutorial(
    file_path: str,
    current_user: models.User = Depends(get_current_user)
):
    """Serve markdown tutorial files from the tutorials directory."""
    try:
        # Path resolution for Docker vs local development
        tutorials_dir = Path("/tutorials") if Path("/tutorials").exists() else Path(__file__).parent.parent / "tutorials"
        requested_file = tutorials_dir / file_path
        
        # Security check: ensure the file is within the tutorials directory
        if not str(requested_file.resolve()).startswith(str(tutorials_dir.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if file exists and is a markdown file
        if not requested_file.exists():
            raise HTTPException(status_code=404, detail="Tutorial file not found")
        
        if requested_file.suffix.lower() not in ['.md', '.txt', '.mc']:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        # Read and return the file content
        content = requested_file.read_text(encoding="utf-8")
        return {"content": content, "file_path": file_path}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving tutorial file {file_path}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

logger.info("Cuebe API initialized with organized routers and light mode documentation")

# =============================================================================
# SERVER STARTUP
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
