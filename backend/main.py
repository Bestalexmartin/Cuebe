# backend/main.py

import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.responses import HTMLResponse

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
from routers import users, crews, venues, departments, shows, webhooks, development, system_tests, script_elements
from routers.auth import get_current_user
import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# APP INITIALIZATION
# =============================================================================

app = FastAPI(
    title="CallMaster API",
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
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)  # type: ignore[arg-type]
    logger.info("Rate limiting enabled")
else:
    logger.warning("Rate limiting disabled - slowapi package not available")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# INCLUDE ROUTERS
# =============================================================================

# Include all routers
app.include_router(webhooks.router)     # Webhook endpoints at /api/webhooks/*
app.include_router(development.router)  # Development endpoints at /api/dev/*, /api/health
app.include_router(users.router)        # User management at /api/users/*
app.include_router(crews.router)        # Crew management at /api/me/crews, /api/crew/*
app.include_router(venues.router)       # Venue management at /api/me/venues, /api/venues/*
app.include_router(departments.router)  # Department management at /api/me/departments, /api/departments/*
app.include_router(shows.router)        # Show and script management at /api/shows/*, /api/scripts/*
app.include_router(script_elements.router)  # Script elements CRUD at /api/scripts/*/elements, /api/elements/*
app.include_router(system_tests.router) # System testing endpoints at /api/system-tests/*

# =============================================================================
# CLEAN LIGHT MODE DOCUMENTATION ENDPOINTS  
# =============================================================================

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
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
                url: '{app.openapi_url}',
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
        <redoc spec-url='{app.openapi_url}' hide-download-button></redoc>
        <script src="https://cdn.jsdelivr.net/npm/redoc@2.1.2/bundles/redoc.standalone.js"></script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

# =============================================================================
# DOCUMENTATION ENDPOINTS
# =============================================================================

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

logger.info("CallMaster API initialized with organized routers and light mode documentation")

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