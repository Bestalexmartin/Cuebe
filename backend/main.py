# backend/main.py

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.responses import HTMLResponse

# Import routers
from routers import users, crews, venues, departments, shows, webhooks, system_tests

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
app.include_router(webhooks.router)  # Includes health check at /api/health
app.include_router(users.router)     # User management at /api/users/*
app.include_router(crews.router)     # Crew management at /api/me/crews, /api/crew/*
app.include_router(venues.router)    # Venue management at /api/me/venues, /api/venues/*
app.include_router(departments.router)  # Department management at /api/me/departments, /api/departments/*
app.include_router(shows.router)     # Show and script management at /api/shows/*, /api/scripts/*
app.include_router(system_tests.router)  # System testing endpoints at /api/system-tests/*

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
    </head>
    <body>
        <redoc spec-url='{app.openapi_url}' hide-download-button></redoc>
        <script src="https://cdn.jsdelivr.net/npm/redoc@2.1.2/bundles/redoc.standalone.js"></script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

logger.info("CallMaster API initialized with organized routers and light mode documentation")