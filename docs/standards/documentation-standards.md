# Documentation Standards

## File Naming Convention

### Standard: kebab-case
All documentation files should use `kebab-case` naming (lowercase words separated by hyphens).

**✅ Correct:**
- `development-guide.md`
- `component-architecture.md`
- `performance-optimizations.md`
- `error-handling.md`
- `testing-tools-guide.md`
- `codebase-improvements-archive.md`

**❌ Avoid:**
- `SCREAMING_SNAKE_CASE.md`
- `camelCase.md`
- `PascalCase.md`
- `snake_case.md`

### Rationale
1. **Web Standards**: Consistent with modern web and URL conventions
2. **Readability**: Easier to read and understand at a glance
3. **Git Friendly**: Avoids case-sensitivity issues across different filesystems
4. **Accessibility**: No special characters requiring shift key
5. **Tooling Compatibility**: Works well with static site generators and documentation tools

## Directory Structure

```
docs/
├── README.md                           # Main index
├── development-guide.md                # Quick start guide
├── documentation-standards.md          # This file
├── architecture/
│   ├── component-architecture.md       # Component patterns
│   ├── performance-optimizations.md    # Performance guidelines
│   └── error-handling.md              # Error management
├── testing/
│   └── testing-tools-guide.md         # Testing documentation
└── archive/
    └── codebase-improvements-archive.md # Historical records
```

## Content Guidelines

### File Headers
Each documentation file should start with a clear H1 heading:
```markdown
# File Title

Brief description of what this document covers.
```

### Internal Links
Use relative paths for internal documentation links:
```markdown
- See [Component Architecture](./architecture/component-architecture.md)
- Reference [Testing Guide](./testing/testing-tools-guide.md)
```

### External Links
Always use descriptive link text:
```markdown
// ✅ Good
For more information, see the [React documentation](https://react.dev/)

// ❌ Avoid
For more information, [click here](https://react.dev/)
```

### Code Examples
Use language-specific syntax highlighting:
```markdown
```typescript
interface ComponentProps {
  name: string;
  isActive: boolean;
}
```

### Table of Contents
For longer documents (>3 sections), include a table of contents:
```markdown
## Table of Contents
- [Overview](#overview)
- [Implementation](#implementation)
- [Examples](#examples)
```

## Maintenance

### When Adding New Documents
1. Use kebab-case naming convention
2. Place in appropriate directory (`architecture/`, `testing/`, `archive/`)
3. Update main `README.md` with link and description
4. Update relevant cross-references in other documents
5. Add entry to `DocumentationPage.tsx` if it should appear in the app

### When Renaming Files
1. Update the file name to kebab-case
2. Update all internal references in other documentation files
3. Update `DocumentationPage.tsx` file paths
4. Test that all links work correctly

### Regular Review
- Review documentation quarterly for accuracy
- Update outdated information
- Consolidate duplicate information
- Archive obsolete documents

## Tools and Integration

### In-App Documentation Browser
The documentation is integrated into the CallMaster application at `/docs` route:
- Files are organized by category (Quick Start, Architecture, Testing, Archive)
- Color-coded for easy navigation
- Mobile-responsive design
- Protected behind authentication

### Version Control
- All documentation is version controlled with the codebase
- Changes are tracked through Git history
- Use meaningful commit messages for documentation changes

### Future Enhancements
- Markdown rendering with syntax highlighting
- Full-text search capability
- Document versioning and history
- Automated link checking

---

*Last Updated: July 2025*