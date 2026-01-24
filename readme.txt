# readme.txt

Note: This repository is shared as a reference for approach and structure, not as a
production-ready framework and is released under the MIT license (see bottom of page).

Born of an unexpected "adventure" as show caller for "The Universe is Absurd" featuring
William Shatner and Neil deGrasse Tyson (McCaw Hall, Seattle WA, June 18 2025),
Cuebe represents my first return to software development since 2006 and is an exploration
of how to design complex, real-time operational software with clarity and restraint.
It focuses on explicit data models, predictable behavior, and user interfaces that make
sequencing, timing, and responsibility visible rather than implicit.

It's amazing how much things have changed since the LAMP stack days coding in textedit and
pushing via SFTP. Credit to ChatGPT, Codex and Claude Code for making this work possible
and letting me focus on the architecture rather than the spelling and punctuation.

- alex

---

Cuebe is a theater production management application designed around a modern
container‑based architecture. The project uses React 19 with TypeScript and Chakra UI
on the frontend, while the backend is powered by FastAPI and SQLAlchemy with PostgreSQL
storage. Authentication is handled through Clerk, and the environment supports a full
suite of tests covering API endpoints, database integrity, authentication, and
performance. The system architecture documentation explains how the frontend, backend,
and database services communicate via Docker Compose, with optional Redis integration
for rate limiting and caching.


Architecture Diagram

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
│  ./frontend/ ◄─── Volume Mount ───► /app                        │
│  ./backend/  ◄─── Volume Mount ───► /app                        │
│  ./docs/     ◄─── Volume Mount ───► /docs                       │
└─────────────────────────────────────────────────────────────────┘

Cuebe is built with:

**Frontend**: React 19.1.0 + TypeScript + Chakra UI + QR Code Generation
**Backend**: Python FastAPI + SQLAlchemy + PostgreSQL
**Authentication**: Clerk
**Testing**: Comprehensive test suites for all application layers

Core functionality centers on comprehensive script management. The script elements
data model defines cues, notes, and groupings with precise sequencing, timing, and
department assignments.

Script Elements Data Model

Overview

The script elements data model defines the structure for all script content in
Cuebe. This includes cues, notes, and organizational groups that make up a theater
production script.

Core Element Types

Base Element Structure

Users can edit scripts through an intuitive drag‑and‑drop interface that resolves
conflicts when moving elements, and the application exposes a complete CRUD API for
script elements.

Drag-and-Drop Script Element Reordering System

Overview

The Cuebe application features a comprehensive drag-and-drop system for
reordering script elements (cues, notes, groups) in edit mode. This system provides
intelligent conflict resolution when time offsets don't match the new element
positioning.

Architecture

Core Components

1. EditMode Component
(`/frontend/src/pages/script/components/modes/EditMode.tsx`)

Purpose: Container for drag-and-drop functionality in script editing
Key Features:

• Local state management for visual updates without server refresh
• Integration with @dnd-kit library for drag operations
• Modal-based conflict resolution for time offset mismatches
• Server synchronization for persistent changes

2. DraggableCueElement Component
(`/frontend/src/pages/script/components/DraggableCueElement.tsx`)

Purpose: Wrapper component that makes script elements draggable
Key Features: 
• Full-row dragging (entire element is draggable)
• Visual feedback during drag operations with color blending
• Z-index management for proper layering during drag
• Maintains opacity and visual consistency

3. DragReorderModal Component
(`/frontend/src/pages/script/components/modals/DragReorderModal.tsx`)

Purpose: User choice modal for handling time offset conflicts
Key Features:
• Mobile toolbar-style buttons with orange hover and blue active states
• Three conflict resolution options: disable auto-sort, match above, match below
• Clear visual feedback for user decisions

Major Achievements

Script Elements API: Complete CRUD operations for theater script management

rag-and-Drop System: Intuitive script element reordering with intelligent conflict
resolution

Note Color Customization: Visual organization system with smart text
contrast and preset colors

• Enterprise-Grade Testing Suite: 6 comprehensive testing tools
• Performance Optimized: React.memo implementation across all components
• DRY Architecture: Base component system eliminates code duplication
• Comprehensive Documentation: Full technical documentation and guides

Additional modules cover shows, venues, crew, and departments, all secured by
authentication and enriched with performance optimizations and extensive documentation.

---

Copyright 2026 by Alex Martin

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the “Software”), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
OR OTHER DEALINGS IN THE SOFTWARE.
