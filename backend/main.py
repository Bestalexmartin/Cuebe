# backend/main.py

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.responses import HTMLResponse

# Import routers
from routers import users, crews, venues, departments, shows, webhooks

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

# =============================================================================
# CUSTOM DOCUMENTATION ENDPOINTS WITH DARK MODE
# =============================================================================

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{app.title} - Swagger UI</title>
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
        <style>
            html {{ box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }}
            *, *:before, *:after {{ box-sizing: inherit; }}
            body {{ margin:0; background: #1a202c; }}
            .swagger-ui .topbar {{ display: none; }}
            .swagger-ui {{ 
                background: #1a202c !important; 
                color: #ffffff !important;
                font-family: sans-serif;
            }}
            .swagger-ui .info {{ color: #ffffff !important; }}
            .swagger-ui .info .title {{ color: #ffffff !important; }}
            .swagger-ui .info .description {{ color: #ffffff !important; }}
            .swagger-ui .scheme-container {{ 
                background: #2d3748 !important; 
                border: 1px solid #4a5568 !important;
                color: #ffffff !important;
            }}
            .swagger-ui .opblock {{ 
                background: #2d3748 !important; 
                border: 1px solid #4a5568 !important; 
                color: #ffffff !important;
            }}
            .swagger-ui .opblock-summary {{ 
                border-color: #4a5568 !important; 
                color: #ffffff !important;
            }}
            .swagger-ui .opblock-summary-description {{ color: #ffffff !important; }}
            .swagger-ui .opblock-summary-operation-id {{ color: #ffffff !important; }}
            .swagger-ui .opblock-summary-path {{ color: #ffffff !important; }}
            .swagger-ui .opblock-summary-method {{ color: #ffffff !important; }}
            .swagger-ui .opblock-tag {{ color: #ffffff !important; }}
            .swagger-ui .opblock-tag-section h3 {{ color: #ffffff !important; }}
            .swagger-ui .opblock-tag-section h4 {{ color: #ffffff !important; }}
            .swagger-ui .opblock-body {{ 
                background: #1a202c !important; 
                color: #ffffff !important;
            }}
            .swagger-ui .parameters-container {{ 
                background: #171923 !important; 
                color: #ffffff !important;
            }}
            .swagger-ui .opblock-section-header {{ 
                background: #171923 !important; 
                color: #ffffff !important;
            }}
            .swagger-ui .responses-wrapper {{ 
                background: #171923 !important; 
                color: #ffffff !important;
            }}
            .swagger-ui .responses-inner {{ 
                background: #171923 !important; 
                color: #ffffff !important;
            }}
            .swagger-ui .response-col_status {{ 
                background: #171923 !important; 
                color: #ffffff !important;
            }}
            .swagger-ui .curl-command {{ 
                background: #000000 !important; 
                color: #ffffff !important;
            }}
            .swagger-ui .highlight-code {{ 
                background: #000000 !important; 
                color: #ffffff !important;
            }}
            .swagger-ui .microlight {{ 
                background: #000000 !important; 
                color: #e2e8f0 !important; 
            }}
            .swagger-ui pre {{ 
                background: #000000 !important; 
                color: #e2e8f0 !important; 
            }}
            .swagger-ui .response .response-content pre {{ 
                background: #000000 !important; 
                color: #e2e8f0 !important; 
            }}
            .swagger-ui .parameter__name {{ color: #ffffff !important; }}
            .swagger-ui .parameter__type {{ color: #90cdf4 !important; }}
            .swagger-ui .parameter__deprecated {{ color: #fc8181 !important; }}
            .swagger-ui .parameter__in {{ color: #9ae6b4 !important; }}
            .swagger-ui .btn {{ background: #3182ce !important; color: white !important; }}
            .swagger-ui .model {{ 
                background: #2d3748 !important; 
                color: #ffffff !important;
            }}
            .swagger-ui .model-box {{ 
                background: #1a202c !important; 
                color: #ffffff !important;
            }}
            .swagger-ui .prop-type {{ color: #90cdf4 !important; }}
            .swagger-ui .prop-format {{ color: #9ae6b4 !important; }}
            .swagger-ui textarea {{ 
                background: #2d3748 !important; 
                color: #ffffff !important; 
                border: 1px solid #4a5568 !important; 
            }}
            .swagger-ui input[type=text], .swagger-ui input[type=password], .swagger-ui input[type=search], .swagger-ui input[type=email] {{ 
                background: #2d3748 !important; 
                color: #ffffff !important; 
                border: 1px solid #4a5568 !important; 
            }}
            .swagger-ui select {{ 
                background: #2d3748 !important; 
                color: #ffffff !important; 
                border: 1px solid #4a5568 !important; 
            }}
            .swagger-ui .response-col_description {{ color: #ffffff !important; }}
            .swagger-ui .response-col_status {{ color: #ffffff !important; }}
            .swagger-ui .response-col_links {{ color: #ffffff !important; }}
            .swagger-ui .tab li {{ color: #ffffff !important; }}
            .swagger-ui .tab li.active {{ color: #3182ce !important; }}
            .swagger-ui .markdown p, .swagger-ui .markdown li, .swagger-ui .markdown h1, .swagger-ui .markdown h2, .swagger-ui .markdown h3, .swagger-ui .markdown h4, .swagger-ui .markdown h5 {{ color: #ffffff !important; }}
            .swagger-ui .markdown code {{ 
                background: #4a5568 !important; 
                color: #e2e8f0 !important; 
                padding: 2px 4px !important; 
                border-radius: 3px !important; 
            }}
            .swagger-ui .highlighting {{ background: #2d3748 !important; }}
            .swagger-ui .microlight {{ color: #e2e8f0 !important; }}
            .swagger-ui table {{ color: #ffffff !important; }}
            .swagger-ui table th {{ color: #ffffff !important; background: #2d3748 !important; }}
            .swagger-ui table td {{ color: #ffffff !important; }}
            /* Force white text on all potentially gray elements */
            .swagger-ui .opblock-tag-section h3, .swagger-ui .opblock-tag {{ color: #ffffff !important; }}
            .swagger-ui .opblock-summary .opblock-summary-path {{ color: #ffffff !important; }}
            .swagger-ui .opblock-summary .opblock-summary-path__deprecated {{ color: #fc8181 !important; }}
            .swagger-ui h4, .swagger-ui h5, .swagger-ui h6 {{ color: #ffffff !important; }}
            .swagger-ui .renderedMarkdown p {{ color: #ffffff !important; }}
            .swagger-ui .parameter__name.required {{ color: #ffffff !important; }}
            .swagger-ui .parameter__name.required:after {{ color: #fc8181 !important; }}
            .swagger-ui .opblock-section-header h4 {{ color: #ffffff !important; }}
            .swagger-ui .opblock-section-header label {{ color: #ffffff !important; }}
            .swagger-ui .execute-wrapper {{ color: #ffffff !important; }}
            .swagger-ui .btn.execute {{ background: #3182ce !important; color: #ffffff !important; }}
            .swagger-ui .response-control-media-type__title {{ color: #ffffff !important; }}
            .swagger-ui .response-control-media-type--accept-controller select {{ color: #ffffff !important; }}
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
                layout: "StandaloneLayout",
                syntaxHighlight: {{
                    activate: true,
                    theme: "monokai"
                }}
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
            body {{ 
                margin: 0; 
                padding: 0; 
                background: #1a202c !important;
                color: #ffffff !important;
            }}
            .redoc-wrap {{ background: #1a202c !important; }}
            .menu-content {{ background: #2d3748 !important; }}
            .menu-content h1, .menu-content h2, .menu-content h3, .menu-content h4, .menu-content h5 {{ color: #ffffff !important; }}
            .menu-content p, .menu-content li, .menu-content span {{ color: #ffffff !important; }}
            .api-content {{ background: #1a202c !important; color: #ffffff !important; }}
            .api-content h1, .api-content h2, .api-content h3, .api-content h4, .api-content h5 {{ color: #ffffff !important; }}
            .api-content p, .api-content li, .api-content span, .api-content td {{ color: #ffffff !important; }}
            .api-content table th {{ color: #ffffff !important; background: #2d3748 !important; }}
            .api-content code {{ background: #4a5568 !important; color: #e2e8f0 !important; }}
            .api-content pre {{ background: #2d3748 !important; color: #e2e8f0 !important; }}
        </style>
    </head>
    <body>
        <redoc spec-url='{app.openapi_url}' 
               theme='{{"colors": {{"primary": {{"main": "#3182ce"}}, "text": {{"primary": "#ffffff", "secondary": "#e2e8f0"}}, "background": {{"primary": "#1a202c", "secondary": "#2d3748"}}}}, "typography": {{"fontSize": "14px", "fontFamily": "sans-serif", "headings": {{"color": "#ffffff"}}}}, "sidebar": {{"backgroundColor": "#2d3748", "textColor": "#ffffff", "activeTextColor": "#3182ce"}}, "rightPanel": {{"backgroundColor": "#1a202c", "textColor": "#ffffff"}}, "schema": {{"nestedBackground": "#2d3748", "typeNameColor": "#90cdf4", "typeTitleColor": "#ffffff"}}}}'
               hide-download-button></redoc>
        <script src="https://cdn.jsdelivr.net/npm/redoc@2.1.2/bundles/redoc.standalone.js"></script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

logger.info("CallMaster API initialized with organized routers and dark mode documentation")