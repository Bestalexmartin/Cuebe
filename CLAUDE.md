# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Project Overview

Cuebe is a theater production management system.

**Stack:**
- Frontend: React 19.1.0 + TypeScript + Chakra UI + Vite
- Backend: Python FastAPI + SQLAlchemy + PostgreSQL
- Auth: Clerk
- Deployment: Docker containers

## Development Commands

### Backend (Python FastAPI)
```bash
cd backend && ./start-server.sh          # Dev server
cd backend && ./run-tests.sh             # Tests (--watch, --cov=. --cov-report=html)
cd backend && alembic revision --autogenerate -m "description"  # Migration (don't run, ask user)
cd backend && source venv/bin/activate && pip install -r requirements.txt  # Setup
```

### Frontend (React + Vite)
```bash
cd frontend && npm run dev      # Dev server
cd frontend && npm run build    # Build
cd frontend && npm run lint     # Lint
```

### Docker
```bash
docker-compose up -d                    # Full stack
docker-compose restart backend          # Restart service
docker logs cuebe-backend               # View logs
```

## Architecture

### Directory Structure
- `/frontend/src/pages/` - Page components
- `/frontend/src/components/` - Reusable UI components
- `/frontend/src/features/` - Domain-specific code
- `/backend/routers/` - FastAPI route handlers
- `/backend/schemas/` - Pydantic schemas (domain-organized)
- `/backend/models.py` - SQLAlchemy models
- `/docs/` - Auto-discovered markdown documentation

### Key Patterns
- **BaseCard/BaseModal** - Extend through props, not inheritance
- **Edit Queue System** - Non-destructive editing with undo/redo
- **6-Mode Script Management** - info, view, edit, play, share, history
- **Component memoization** - React.memo on BaseCard, BaseModal, ViewMode, EditMode

### Domain Models
Users, Shows, Scripts, ScriptElements, Venues, Departments, Crews

## Code Standards

### Backend
- Database fields: `snake_case`
- **ENUMs: `SCREAMING_SNAKE_CASE`** — Python members use uppercase names (e.g., `SUPER_ADMIN = "super_admin"`), inherit from `(str, Enum)`, always use native PostgreSQL ENUM via `SQLEnum(EnumClass)` — never `String` columns or `native_enum=False`. Database stores uppercase names (default SQLAlchemy behavior) — do not use `values_callable`
- Create migrations, don't run them - ask user
- Schema files: ~300-400 lines max, split by domain
- API responses: Always use Pydantic schemas, never manual JSON construction

### Frontend
- Database identifiers: `snake_case`; frontend-only vars: `camelCase`
- Complex components: React.memo with custom comparison
- Hooks: useMemo/useCallback for stable references
- UI: Orange borders for hover (`orange.400`), blue for active (`blue.400`)
- Icons: Declare via `AppIcon.tsx`
- useEffect: Avoid unless confirmed necessary

## Working Principles

### Implementation Hierarchy
1. **Exact match exists?** → Copy it exactly
2. **Similar pattern exists?** → Extend/modify it
3. **Nothing exists?** → Only then create new

### Before Writing Code
- Has this been solved already?
- How do similar features work here?
- Can I copy an existing pattern?

### Rules
- Edit existing files over creating new ones
- Copy working patterns exactly
- No comments unless requested
- No documentation files unless requested
- Follow Clerk auth patterns, never expose secrets
- Never git push/pull without explicit user permission

## Communication

### Forbidden
- Declaring something "works" before user tests it
- Saying "fixed", "working", "perfect" about untested changes
- Celebratory language about code changes
- Assuming success from logs or code analysis

### Required
- Wait for user confirmation before claiming success
- Present findings objectively: "The logs show X, please test to confirm"
- Acknowledge uncertainty: "This should address the issue, needs testing"
- State analysis without validating user's beliefs - let results determine who's right

## Code Editing Safety

### Forbidden
- `sed` for code changes
- Automated find-and-replace
- Batch text manipulation
- Any "time-saving" automated cleanup

### Required
- Manual line-by-line editing only
- Individual Edit tool calls per change
- Review surrounding context
- Preserve working logic above all else

When removing debug logging: one statement at a time, verify surrounding code intact.

## Testing

### Backend
- pytest with async support
- Tests in `/backend/tests/`
- Built-in tools at `/api/system-tests`

### Frontend
- Built-in testing tools in app
- Use existing infrastructure over external frameworks

## Debugging
- Add comprehensive debug logging when diagnosing
- Keep debug statements until user confirms fix
- Investigate if >10 renders per user action
- Use browser DevTools Profiler

## Session Management

### Token Budget
- Notify user when requests may approach token limits
- Warn before complex operations that could be interrupted
- Suggest checkpointing on long tasks

### Questions
- Ask rather than assume, even for reasonable assumptions
- User wants visibility into decision points
- Clarify when multiple valid approaches exist

### Parallel Execution & Subagents
- Notify user when these would be more efficient
- User decides whether to use them case-by-case
- Available: Explore (codebase discovery), Plan (architecture)

## Documentation System
- Files in `/docs/` auto-discovered by category
- Categories: Planning, Quick Start, Tutorial, User Interface, Component Architecture, Data Management, System Architecture, Testing, Archive
- Restart backend after changing category mappings
- Access: Options menu → Documentation
