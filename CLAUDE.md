# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cuebe is a comprehensive theater production management system built with:

- **Frontend**: React 19.1.0 + TypeScript + Chakra UI + Vite
- **Backend**: Python FastAPI + SQLAlchemy + PostgreSQL 
- **Authentication**: Clerk
- **Deployment**: Docker containers

## Development Commands

### Backend (Python FastAPI)
```bash
# Development server
cd backend && ./start-server.sh
# Or via npm: npm run dev

# Testing
cd backend && ./run-tests.sh
# With options: ./run-tests.sh --watch
# Coverage: ./run-tests.sh --cov=. --cov-report=html

# Database migrations (create only, ask user to run)
cd backend && alembic revision --autogenerate -m "description"

# Virtual environment setup
cd backend && source venv/bin/activate && pip install -r requirements.txt
```

### Frontend (React + Vite)
```bash
# Development server
cd frontend && npm run dev

# Build
cd frontend && npm run build

# Lint
cd frontend && npm run lint

# Preview production build
cd frontend && npm run preview
```

### Docker Operations
```bash
# Full stack
docker-compose up -d

# Individual services
docker-compose restart backend
docker-compose restart frontend
docker-compose restart

# View logs
docker logs cuebe-backend
docker logs cuebe-frontend
```

## Architecture Overview

### Directory Structure
- `/frontend/src/pages/` - Main page components
- `/frontend/src/components/` - Reusable UI components  
- `/frontend/src/features/` - Domain-specific code (script, shows, venues, etc.)
- `/backend/routers/` - FastAPI route handlers
- `/backend/schemas/` - Pydantic schemas (domain-organized)
- `/backend/models.py` - SQLAlchemy database models
- `/docs/` - Auto-discovered markdown documentation

### Key Architectural Patterns
- **BaseCard/BaseModal composition** - extend through props, not inheritance
- **Edit Queue System** - non-destructive editing with undo/redo functionality  
- **6-Mode Script Management** - info, view, edit, play, share, history modes
- **Component memoization** - BaseCard, BaseModal, ViewMode, EditMode use React.memo
- **Schema organization** - domain-specific modules in `/backend/schemas/`

### Domain Models
- **Users** - Authentication via Clerk, preferences stored in database
- **Shows** - Productions with dates, venues, crews
- **Scripts** - Show scripts with timed elements and sharing capabilities
- **ScriptElements** - Individual cues, notes, actions within scripts
- **Venues** - Performance locations
- **Departments** - Technical departments (lighting, sound, etc.)
- **Crews** - Personnel assignments to shows

## Code Standards

### Database & Backend
- **Database fields**: Always use `snake_case` throughout system
- **ENUMs**: Always UPPERCASE (e.g., `UserRole.ADMIN`)
- **Don't run migrations** - create Alembic files and ask user to run
- **Schema organization**: Break large files into domain modules (~300-400 lines max)
- **API Response Consistency**: NEVER manually construct JSON in endpoints. Always use Pydantic schemas with SQLAlchemy models for consistent serialization. If an endpoint returns similar data to an existing endpoint, use the same schema or extend it - never create manual dictionaries with `.isoformat()` calls.

### Frontend & React
- **Naming**: Database identifiers stay `snake_case`, frontend-only vars can be `camelCase`
- **Performance**: Use React.memo with custom comparison for complex components
- **Memoization**: Use useMemo/useCallback in custom hooks for stable references
- **UI Standards**: Orange borders for hover (`orange.400`), blue for active (`blue.400`)
- **Icons**: All new icons declared via `AppIcon.tsx`
- **useEffect**: Do not use useEffect unless it's absolutely necessary and you've confirmed it with me first

### General Practices - BE LAZY!

**ALWAYS follow this hierarchy when implementing features:**

1. **"Does this exact thing already work somewhere?"** → Copy it exactly
2. **"Does something similar work?"** → Extend/modify the working pattern  
3. **"Nothing like this exists?"** → Only THEN create something new

**Before writing ANY new code, ask:**
- Have we solved this problem already?
- How do similar features work in this codebase?
- Can I copy an existing working pattern?

**Implementation Rules:**
- **Edit existing files** over creating new ones
- **Copy working patterns exactly** - don't reinvent wheels
- **Check imports and surrounding context** to understand existing approaches
- **No comments** unless explicitly requested
- **No documentation files** unless explicitly requested
- **Security**: Never expose secrets, follow Clerk auth patterns

**Communication:**
- Do not tell me I'm right, just tell me your analysis and we'll decide who is right at the end

## Testing

### Backend Testing
- Uses pytest with async support
- Test files: `test_*.py` in `/backend/tests/`
- Built-in testing tools available at `/api/system-tests`
- 6 comprehensive testing categories: Environment, API, Auth, Performance, Database, Network

### Frontend Testing  
- Built-in testing tools page available in app
- Use existing testing infrastructure over external frameworks

## Debugging Guidelines

- **Add comprehensive debug logging** when diagnosing issues
- **Keep debug statements during testing** - don't remove until user confirms fix works
- **Monitor render counts** - investigate if >10 renders per user action
- **Use browser DevTools Profiler** for performance analysis

## Documentation System

- Files in `/docs/` auto-discovered by category based on directory structure
- Categories: Planning, Quick Start, Tutorial, User Interface, Component Architecture, Data Management, System Architecture, Testing, Archive
- Restart backend after changing category mappings
- Access via app: Options menu → Documentation