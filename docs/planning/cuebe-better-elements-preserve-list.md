# Cuebe-Better Elements: Preserve List for Blok Alignment

**Date:** June 2026
**Status:** Reference (guard rail for the BLOK alignment milestone)
**Category:** System Architecture

During the move to the Blok model, several Cuebe patterns are richer than the Blok baseline. This catalog exists so alignment refactors **preserve** them rather than overwrite them with thinner Blok equivalents, and so we flag the ones worth **upstreaming** back into Blok.

Rule of thumb for the alignment work: take Blok's auth core (Blok 017) and infrastructure conventions, but do **not** replace the items below with Blok 001/002 defaults.

## UI primitives (preserve; upstream candidates)

| Element | What it is | Why it beats the Blok baseline | Action |
| --- | --- | --- | --- |
| `BaseModal` (`components/base/BaseModal.tsx`) | One modal with two variant axes: state variant (`default`/`warning`/`danger`/`processing`) and action-button variant (`primary`/`secondary`/`danger`/`outline`); built-in validation-error display, loading states, header icons; `React.memo` with custom comparison | Blok ships generic modal primitives in `ui/`; Cuebe's encodes the warning/danger/processing flows and validation display that Blok leaves to each caller | Preserve + upstream candidate |
| `BaseCard` (`components/base/BaseCard.tsx`) | Selection/hover states, expandable content, and typed skeleton loaders (`default`/`show`/`venue`/`crew`/`department`); memoized | Domain-aware skeletons and selection model are absent from Blok's baseline card | Preserve + upstream candidate |
| `AppIcon` (`components/AppIcon.tsx`) | Central icon registry with a typed `IconName` union (~90 named icons across Chakra/react-icons/fa6) | Single typed source for icons vs. ad hoc imports; matches the spirit of Blok 001 but is more complete | Preserve + upstream candidate |
| `useEnhancedToast` (`utils/toastUtils.ts`) | Wrapper over Chakra `useToast` with `showSuccess`/`showError`/`showWarning`/`showInfo`, severity-based duration, themed tokens | Equivalent surface to Blok 002 helpers but already wired to Cuebe's theme | Preserve (Blok 002 not needed) |

## Frontend architecture (preserve)

| Element | What it is | Why preserve | Action |
| --- | --- | --- | --- |
| `useStableAuth` (`hooks/useStableAuth.ts`) | Wraps the auth hook with `useRef`/`useCallback` to expose a stable `getToken()` whose identity does not change across renders | Prevents re-render cascades in data hooks. NOTE: its internals call Clerk today; during AUTH the internals swap to Blok, but keep the stable-reference pattern | Preserve the pattern (re-point internals) |
| `features/` structure | Domain-scoped modules (`shows`, `crew`, `venues`, `departments`, `script`) each with `components/`, `hooks/`, `pages/`, `types/` | Already aligns with feature-based organization; do not flatten into Blok's `components/blok-XXX` numbering | Preserve |
| `contexts/` layer | `PreferencesContext`, `ScriptSyncContext`, `ScriptDataContext`, `DashboardContext`, `ModalContext`, `ShowTimeEngine*` | Established context layer; Blok 017's `AuthContext`/`AuthModalContext` are additive, not replacements | Preserve (add, do not replace) |

## Domain systems (preserve; Cuebe-specific, not for upstream)

These are theater-domain systems with no Blok equivalent. They must survive alignment untouched. Each already has an architecture doc.

| System | Reference doc |
| --- | --- |
| Edit Queue (non-destructive editing, undo/redo) | `architecture/edit-queue-and-sync-architecture.md` |
| 6-Mode Script Management (info, view, edit, play, share, history) | `components/manage-script-page.md`, `architecture/component-architecture.md` |
| ShowTimeEngine (runtime step-through, cue timing) | `architecture/show-time-engine-specification.md` |
| Real-time script sync (WebSocket) | `architecture/async-sync-architecture.md` |
| Grouping model + drag-and-drop | `architecture/grouping-model-design.md`, `architecture/drag-and-drop-system.md` |
| Performance/memoization patterns | `architecture/performance-optimizations.md` |

## Guidance for specific alignment cards

- **Blok 001 / 002 reconciliation card:** keep Cuebe's `BaseModal`, `BaseCard`, `AppIcon`, and `useEnhancedToast`. The only frontend Blok pieces to bring in are the Blok 017 auth UI components (under `components/blok-017/`) and the `apiFetch` layer. Do not adopt Blok 001 `PageLayout`/`TopBar`/`SidebarNav` over Cuebe's existing `layout/` unless a concrete gap appears.
- **Frontend apiFetch card:** the new central `apiFetch` should preserve the `useStableAuth` stable-`getToken` behavior so the existing data hooks keep their referential stability.
- **AUTH frontend card:** auth contexts are additive; do not disturb the existing `contexts/` providers.

## Upstream candidates (back into Blok)

If we want to give back: `BaseModal`'s state+action variant system, `BaseCard`'s typed skeletons, the `AppIcon` typed registry, and the `useStableAuth` stable-token pattern are all generic enough to improve Blok 001/002. Tracked here as candidates only; no action required for the Cuebe migration.
