# Cuebe Documentation

**Date:** August 2025  
**Status:** Current  
**Category:** Documentation Index & Navigation

Welcome to the Cuebe documentation! This comprehensive guide covers all aspects of the theater management application, from setup to advanced features.

## 🚀 Quick Start

**New to Cuebe?** Start here for fastest setup:

1. **[Development Guide](./development/development-guide.md)** - Complete project setup
2. **[Database Seed Data](./data/database-seed-data-system.md)** - Get realistic sample data
3. **[Testing Tools](./testing/testing-tools-guide.md)** - Validate your installation

## 📚 Documentation Structure

### Essential Setup & Development

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[Development Guide](./development/development-guide.md)** | Project setup, workflow, daily development | First setup, onboarding |
| **[Database Seed Data](./data/database-seed-data-system.md)** | Database backup/restore, sample data | New environment setup |
| **[Testing Tools Guide](./testing/testing-tools-guide.md)** | Built-in validation suite | Installation verification |

### Core Architecture

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[System Architecture](./architecture/system-architecture.md)** | Overall system design, Docker setup | Understanding infrastructure |
| **[Component Architecture](./architecture/component-architecture.md)** | BaseCard/BaseModal patterns | Building new components |
| **[Performance Optimizations](./architecture/performance-optimizations.md)** | React optimization strategies | Performance issues |

### Data & Database

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[Script Elements Data Model](./data/script-elements-data-model.md)** | Core data structures | Understanding script data |
| **[Database Schema](./data/script-elements-database-schema.md)** | Database tables, relationships | Database changes |
| **[User Preferences System](./data/user-preferences-bitmap-system.md)** | Preference storage | User settings features |

### Feature Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[Script Mode System](./features/script-mode-system.md)** | 6 script management modes | Script interface work |
| **[Script Element Grouping](./features/script-element-grouping.md)** | Grouping and organization | Group feature work |
| **[Mobile Support](./features/mobile-script-management.md)** | Mobile-responsive design | Mobile development |

### Development Best Practices

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[Code Quality Guide](./development/code-quality-guide.md)** | DRY principles, patterns | Daily development |
| **[UI Interaction Guide](./development/ui-interaction-guide.md)** | User interaction patterns | UI development |
| **[Architectural Principles](./standards/architectural-principles.md)** | Design principles | Architecture decisions |

## 🎯 Use Case Quick Links

### **👨‍💻 New Developer Setup**
1. [Development Guide](./development/development-guide.md) → [Database Seed Data](./data/database-seed-data-system.md) → [Testing Tools](./testing/testing-tools-guide.md)

### **🏗️ Understanding the Architecture**
1. [System Architecture](./architecture/system-architecture.md) → [Component Architecture](./architecture/component-architecture.md) → [Script Elements Data Model](./data/script-elements-data-model.md)

### **🎭 Working with Script Features**
1. [Script Mode System](./features/script-mode-system.md) → [Script Element Grouping](./features/script-element-grouping.md) → [Script Management Workflows](./user-guides/script-management-workflows.md)

### **⚡ Performance & Optimization**
1. [Performance Optimizations](./architecture/performance-optimizations.md) → [Code Quality Guide](./development/code-quality-guide.md) → [UI Interaction Guide](./development/ui-interaction-guide.md)

### **🔧 Advanced Topics**
1. [Error Handling](./architecture/error-handling.md) → [Security Decisions](./architecture/security-decisions.md) → [Async/Sync Architecture](./architecture/async-sync-architecture.md)

## 🏢 Architecture Overview

Cuebe is built with modern technologies focused on performance, maintainability, and developer experience:

- **Frontend**: React 19.1.0 + TypeScript + Chakra UI + QR Code Generation
- **Backend**: Python FastAPI + SQLAlchemy + PostgreSQL  
- **Authentication**: Clerk
- **Infrastructure**: Docker Compose + containerized services
- **Testing**: Comprehensive built-in testing suite

### Key Features
- **6 Script Management Modes**: View, Edit, Info, Play, Share, and Crew modes
- **Real-time Collaboration**: Multi-user script editing and sharing
- **Mobile-First Design**: Responsive interface for all device sizes
- **Professional Theater Tools**: Cue management, department organization, timing controls
- **Advanced Grouping**: Hierarchical script organization with visual management
- **Performance Optimized**: React.memo, memoization, and render loop optimization

## 📁 Complete File Index

### `/development` - Developer Resources
- **[Development Guide](./development/development-guide.md)** - Setup, workflow, environment
- **[Code Quality Guide](./development/code-quality-guide.md)** - DRY principles, performance patterns
- **[UI Interaction Guide](./development/ui-interaction-guide.md)** - Gesture recognition, accessibility

### `/architecture` - System Design
- **[System Architecture](./architecture/system-architecture.md)** - Infrastructure and technology stack
- **[Component Architecture](./architecture/component-architecture.md)** - BaseCard/BaseModal composition patterns
- **[Performance Optimizations](./architecture/performance-optimizations.md)** - React optimization strategies
- **[Application Lifecycle](./architecture/application-lifecycle.md)** - Startup, data loading, workflows
- **[Async/Sync Architecture](./architecture/async-sync-architecture.md)** - Backend architecture decisions
- **[Error Handling](./architecture/error-handling.md)** - Error boundaries and recovery
- **[Security Decisions](./architecture/security-decisions.md)** - Security architecture choices
- **[Drag-and-Drop System](./architecture/drag-and-drop-system.md)** - Element reordering system
- **[Script Element Interaction](./architecture/script-element-interaction-system.md)** - Click-to-select patterns
- **[Note Color Customization](./architecture/note-color-customization.md)** - Color picker system
- **[Documentation Integration](./architecture/documentation-integration.md)** - Docs system integration

### `/data` - Database & Data Management
- **[Database Seed Data System](./data/database-seed-data-system.md)** - Backup, restore, seed data
- **[Script Elements Data Model](./data/script-elements-data-model.md)** - Core data structures  
- **[Database Schema](./data/script-elements-database-schema.md)** - Tables, relationships, constraints
- **[Edit Queue System](./data/edit-queue-system.md)** - Undo/redo data handling
- **[User Preferences System](./data/user-preferences-bitmap-system.md)** - Preference storage

### `/features` - User-Facing Features
- **[Script Mode System](./features/script-mode-system.md)** - 6 specialized script management modes
- **[Script Element Grouping](./features/script-element-grouping.md)** - Hierarchical organization system
- **[Mobile Script Management](./features/mobile-script-management.md)** - Mobile-responsive design
- **[User Preferences Integration](./features/user-preferences-integration.md)** - Settings and customization

### `/standards` - Guidelines & Best Practices
- **[Architectural Principles](./standards/architectural-principles.md)** - Design principles and guidelines
- **[Documentation Standards](./standards/documentation-standards.md)** - Content and maintenance guidelines
- **[State Management Principles](./standards/state-management-principles.md)** - React state patterns

### `/testing` - Quality Assurance
- **[Testing Tools Guide](./testing/testing-tools-guide.md)** - Comprehensive testing suite

### `/user-guides` - User Documentation
- **[Script Management Workflows](./user-guides/script-management-workflows.md)** - Step-by-step guides

### `/tutorial` - Learning Resources
- **[Feature Tutorial](./tutorial/feature-tutorial.md)** - Comprehensive feature walkthrough

### `/components` - Component Documentation
- **[ManageScriptPage](./components/manage-script-page.md)** - Main script management component

### `/planning` - Project Vision
- **[Development Roadmap](./planning/roadmap.md)** - Future features and technical roadmap

### `/archive` - Historical Records
- **[Codebase Improvements Archive](./archive/codebase-improvements-archive.md)** - Major refactoring records
- **[Design Insights Archive](./archive/design-insights-archive.md)** - Historical design decisions
- **[Optimization Summary](./archive/optimization-summary.md)** - Performance improvement history

---

**Getting Started?** → [Development Guide](./development/development-guide.md)  
**Need Help?** → [Testing Tools Guide](./testing/testing-tools-guide.md)  
**Understanding Architecture?** → [System Architecture](./architecture/system-architecture.md)

*Last Updated: August 2025 | Documentation maintained by the Cuebe development team*