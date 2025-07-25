# Performance Optimizations

This document outlines the performance optimizations implemented in the codebase.

## React.memo Optimizations

### Base Components

#### BaseCard
- **Location**: `src/components/base/BaseCard.tsx`
- **Optimization**: Custom `arePropsEqual` comparison function
- **Benefits**: Prevents re-renders when props haven't meaningfully changed
- **Key comparisons**:
  - Primitive props (title, isSelected, isHovered, etc.)
  - React nodes (headerBadges, quickInfo, expandedContent)
  - headerActions array with deep comparison of action properties
  - Common BoxProps (className, style)

#### BaseModal
- **Location**: `src/components/base/BaseModal.tsx`
- **Optimization**: Custom `areModalPropsEqual` comparison function
- **Benefits**: Prevents modal re-renders during form interactions
- **Key comparisons**:
  - Modal state (title, isOpen, showValidationErrors)
  - Validation errors array with deep comparison
  - Action objects (primary, secondary, custom) with property-level comparison

### Card Components

All card components now use `React.memo` for basic prop comparison:
- **ShowCard**: `src/components/cards/ShowCard.tsx`
- **VenueCard**: `src/components/cards/VenueCard.tsx`
- **CrewCard**: `src/components/cards/CrewCard.tsx`
- **DepartmentCard**: `src/components/cards/DepartmentCard.tsx`

## Performance Benefits

1. **Reduced Re-renders**: Components only re-render when their props actually change
2. **Better UX**: Smoother interactions, especially with large lists of cards
3. **Memory Efficiency**: Less virtual DOM reconciliation work
4. **Battery Life**: Reduced CPU usage on mobile devices

## Loading State Optimizations

### Skeleton Loading
- **BaseCard**: Intelligent skeleton variants for different card types
- **Variants**: `default`, `show`, `venue`, `crew`, `department`
- **Benefits**: Immediate visual feedback without layout shifts

## Best Practices for Developers

### When using card components:
```tsx
// ✅ Good: Use useCallback for event handlers
const handleShowClick = useCallback((showId: string) => {
  // handler logic
}, [dependency]);

// ✅ Good: Memoize complex derived data
const sortedShows = useMemo(() => {
  return shows.sort(/* sorting logic */);
}, [shows, sortCriteria]);

// ❌ Avoid: Inline functions (causes unnecessary re-renders)
<ShowCard onShowClick={(id) => handleClick(id)} />

// ✅ Better: Use stable function references
<ShowCard onShowClick={handleShowClick} />
```

### When creating new components:
1. Consider React.memo for components that receive complex props
2. Use custom comparison functions for components with frequently changing function props
3. Implement loading states for better perceived performance

## Monitoring Performance

To monitor the effectiveness of these optimizations:

1. **React DevTools Profiler**: Use to identify unnecessary re-renders
2. **Browser Performance Tab**: Monitor frame rates during interactions
3. **Bundle Analysis**: Check for code splitting opportunities

## Future Optimizations

Potential areas for further improvement:
1. **Code Splitting**: Split large components into separate chunks
2. **Virtual Scrolling**: For very large lists of cards
3. **Service Worker**: Cache static assets and API responses
4. **Intersection Observer**: Lazy load off-screen content