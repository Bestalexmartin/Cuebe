# Mobile Script Management

## Overview

CallMaster provides comprehensive mobile support for script management through responsive design patterns, touch-optimized interactions, and mobile-specific components. The mobile experience maintains full functionality while adapting to smaller screens and touch interfaces.

## Architecture

### Responsive Design Strategy

CallMaster uses Chakra UI's responsive breakpoint system with a mobile-first approach:

```typescript
// Primary breakpoint for mobile/desktop distinction
const isMobile = useBreakpointValue({ base: true, lg: false });

// Responsive layout switching
{!isMobile && (
    <DesktopToolbar />
)}

<MobileScriptDrawer 
    isOpen={isMenuOpen}
    onClose={onMenuClose}
    // ... mobile-specific props
/>
```

### Mobile-Specific Components

#### MobileScriptDrawer
**Location**: `frontend/src/features/script/components/MobileScriptDrawer.tsx`

**Purpose**: Provides full toolbar functionality in a drawer interface optimized for mobile devices.

```typescript
interface MobileScriptDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    activeMode: ScriptMode;
    toolButtons: ToolButton[];
    onModeChange: (modeId: string) => void;
}
```

**Features**:
- **Slide-out drawer**: Accessible from menu button
- **Full toolbar functionality**: All desktop toolbar features available
- **Touch-optimized buttons**: Larger touch targets for mobile interaction
- **Gesture support**: Swipe to close, tap outside to dismiss

## Layout Adaptations

### ManageScriptPage Mobile Layout

#### Desktop Layout Structure
```
Header [Script Title] [Action Buttons positioned right]
├── Left: Script Content (flexible width)
└── Right: Fixed Toolbar (165px width)
```

#### Mobile Layout Structure
```
Header [Script Title] [Action Buttons centered]
└── Full Width: Script Content
└── Floating: Mobile Drawer (when opened)
```

### Responsive Header

```typescript
// Header button positioning adapts to screen size
<Box
    position="absolute"
    right={isMobile ? "16px" : "197px"}  // Centered on mobile, aligned with toolbar on desktop
    top="50%"
    transform="translateY(-50%)"
    zIndex={100}
>
    <HStack spacing={2}>
        <ActionsMenu actions={actions} />
        <Divider orientation="vertical" height="20px" />
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleShowSaveConfirmation}>Save Changes</Button>
    </HStack>
</Box>
```

### Content Area Adaptation

```typescript
// Script content area responds to available space
<Box
    flex={1}
    bg="window.background"
    borderRadius="md"
    mr={isMobile ? "0" : "8"}          // No margin on mobile
    width={isMobile ? "100%" : "calc(100% - 106px)"}  // Full width on mobile
    // ... other responsive properties
>
    {/* Script mode content */}
</Box>
```

## Mobile Interaction Patterns

### Touch-Optimized Element Selection

In Edit mode, script elements are optimized for touch interaction:

```typescript
// Enhanced touch targets for mobile
<CueElement
    element={element}
    isDragEnabled={true}
    isSelected={selectedElementId === element.elementID}
    onSelect={() => {
        const newId = selectedElementId === element.elementID ? null : element.elementID;
        setSelectedElementId(newId);
        onSelectionChange?.(newId);
    }}
    // Touch-friendly selection handling
/>
```

**Touch Enhancements**:
- **Larger tap targets**: Minimum 44px touch targets
- **Visual feedback**: Clear selection states
- **Gesture recognition**: Distinguishes between tap and drag
- **Haptic feedback**: Native device feedback where supported

### Drag-and-Drop Mobile Support

Mobile drag-and-drop uses `@dnd-kit/core` with touch sensor optimization:

```typescript
// Mobile-optimized drag sensors
const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5  // Minimum movement to start drag
        }
    }),
    useSensor(TouchSensor, {
        activationConstraint: {
            delay: 150,      // Prevents accidental drags
            tolerance: 5     // Movement tolerance during delay
        }
    }),
    useSensor(KeyboardSensor)  // Accessibility support
);
```

**Mobile Drag Features**:
- **Touch delay**: 150ms delay prevents accidental activation
- **Movement threshold**: 5px minimum movement to start drag
- **Visual feedback**: Clear drag preview and drop zones
- **Auto-scroll**: Automatic scrolling during drag operations

### Mobile Modal System

Modals adapt to mobile viewports with responsive sizing and positioning:

```typescript
// Mobile-responsive modal sizing
<Modal 
    isOpen={isOpen} 
    onClose={onClose} 
    size={isMobile ? "full" : "md"}  // Full screen on mobile
    scrollBehavior={isMobile ? "inside" : "outside"}
>
    <ModalOverlay />
    <ModalContent
        maxHeight={isMobile ? "100vh" : "80vh"}
        margin={isMobile ? 0 : "auto"}
    >
        {/* Modal content adapts to mobile */}
    </ModalContent>
</Modal>
```

**Mobile Modal Features**:
- **Full-screen modals**: Maximum available space usage
- **Touch-friendly controls**: Large buttons and inputs
- **Swipe gestures**: Swipe to dismiss where appropriate
- **Keyboard handling**: Virtual keyboard space management

## Mode-Specific Mobile Optimizations

### Info Mode Mobile

Form inputs are optimized for mobile keyboards and input methods:

```typescript
// Mobile-optimized form layout
<VStack spacing={4} align="stretch" width="100%">
    <FormControl>
        <FormLabel>Script Name</FormLabel>
        <Input
            value={form.formData.scriptName}
            onChange={(e) => form.updateField('scriptName', e.target.value)}
            // Mobile keyboard optimizations
            autoComplete="off"
            autoCapitalize="words"
            autoCorrect="off"
        />
    </FormControl>
    
    {/* Responsive time field layout */}
    <Stack 
        direction={isMobile ? "column" : "row"} 
        spacing={isMobile ? 2 : 4}
    >
        <FormControl>
            <FormLabel>Start Time</FormLabel>
            <Input type="datetime-local" />
        </FormControl>
        <FormControl>
            <FormLabel>End Time</FormLabel>
            <Input type="datetime-local" />
        </FormControl>
    </Stack>
</VStack>
```

**Mobile Form Features**:
- **Stacked layout**: Vertical arrangement on mobile
- **Large inputs**: Comfortable touch targets
- **Keyboard optimization**: Appropriate input types and attributes
- **Auto-focus management**: Smooth focus transitions

### View Mode Mobile

View mode provides optimized scrolling and navigation for mobile:

```typescript
// Mobile-optimized scroll container
<Box 
    ref={scrollContainerRef}
    flex={1} 
    overflowY="auto"
    className="hide-scrollbar"
    // Mobile scroll optimizations
    style={{
        WebkitOverflowScrolling: 'touch',  // iOS momentum scrolling
        touchAction: 'pan-y'               // Vertical scrolling only
    }}
>
    {/* Script elements */}
</Box>
```

**Mobile View Features**:
- **Momentum scrolling**: Native iOS/Android scroll behavior
- **Touch actions**: Optimized touch event handling
- **Gesture conflicts**: Prevents unintended interactions
- **Performance**: Efficient rendering for mobile devices

### Edit Mode Mobile

Edit mode provides full editing capabilities with mobile-optimized interactions:

```typescript
// Mobile drag-and-drop context
<DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragEnd={handleDragEnd}
    // Mobile-specific configurations
    autoScroll={{
        enabled: true,
        threshold: { x: 0, y: 50 },  // Mobile scroll threshold
        acceleration: 10              // Faster mobile scrolling
    }}
>
    <SortableContext
        items={localElements.map(el => el.elementID)}
        strategy={verticalListSortingStrategy}
    >
        {/* Sortable elements */}
    </SortableContext>
</DndContext>
```

**Mobile Edit Features**:
- **Auto-scroll**: Automatic scrolling during drag operations
- **Touch feedback**: Visual feedback during interactions
- **Gesture detection**: Distinguishes between selection and drag
- **Context menus**: Long-press for additional options

## Navigation and Toolbar

### Mobile Drawer Implementation

The MobileScriptDrawer provides access to all toolbar functionality:

```typescript
export const MobileScriptDrawer: React.FC<MobileScriptDrawerProps> = ({
    isOpen,
    onClose,
    activeMode,
    toolButtons,
    onModeChange
}) => {
    return (
        <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="sm">
            <DrawerOverlay />
            <DrawerContent>
                <DrawerHeader>
                    <HStack justify="space-between">
                        <Text>Script Tools</Text>
                        <IconButton
                            aria-label="Close drawer"
                            icon={<CloseIcon />}
                            onClick={onClose}
                            size="sm"
                        />
                    </HStack>
                </DrawerHeader>
                
                <DrawerBody>
                    <ScriptToolbar
                        toolButtons={toolButtons}
                        onModeChange={onModeChange}
                        activeMode={activeMode}
                        isMobile={true}  // Mobile-specific styling
                    />
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    );
};
```

**Drawer Features**:
- **Slide animation**: Smooth slide-in from right
- **Full functionality**: All desktop toolbar features
- **Touch-optimized**: Large buttons and spacing
- **Backdrop dismiss**: Tap outside to close

### Mobile Toolbar Styling

```typescript
// Mobile-specific toolbar styles
<VStack 
    spacing={isMobile ? 3 : 2}  // Increased spacing on mobile
    align="stretch"
    width="100%"
>
    {toolButtons.map((button, index) => (
        <Button
            key={button.id}
            onClick={() => onModeChange(button.id)}
            variant={button.isActive ? "solid" : "outline"}
            size={isMobile ? "md" : "sm"}     // Larger buttons on mobile
            minHeight={isMobile ? "48px" : "32px"}  // Touch-friendly height
            width="100%"
            justifyContent="flex-start"
            leftIcon={button.icon}
        >
            {button.label}
        </Button>
    ))}
</VStack>
```

## Performance Optimizations

### Mobile-Specific Performance

Mobile devices require additional performance considerations:

```typescript
// Mobile-optimized render patterns
const MobileOptimizedComponent = React.memo(({ ...props }) => {
    // Reduced re-renders for mobile
    return <ComponentContent {...props} />;
}, (prevProps, nextProps) => {
    // Mobile-specific comparison logic
    return shallowEqual(prevProps, nextProps);
});

// Viewport-aware optimizations
const handleScroll = useCallback(
    throttle((event) => {
        // Throttled scroll handling for mobile
        updateScrollState(event);
    }, isMobile ? 16 : 8),  // Lower frequency on mobile
    [isMobile]
);
```

**Mobile Performance Features**:
- **Throttled events**: Reduced event frequency on mobile
- **Memory management**: Efficient memory usage for mobile devices
- **Battery optimization**: Reduced CPU usage patterns
- **Network awareness**: Optimized for mobile network conditions

### Touch Event Optimization

```typescript
// Optimized touch event handling
const handleTouchStart = useCallback((event: TouchEvent) => {
    // Prevent default only when necessary
    if (isDragging) {
        event.preventDefault();
    }
}, [isDragging]);

const handleTouchMove = useCallback((event: TouchEvent) => {
    // Minimal processing during touch move
    const touch = event.touches[0];
    updateTouchPosition(touch.clientX, touch.clientY);
}, []);
```

## Accessibility on Mobile

### Touch Accessibility

Mobile accessibility includes enhanced touch target sizes and gesture alternatives:

```typescript
// Accessible touch targets
<Button
    minWidth="44px"      // WCAG minimum touch target
    minHeight="44px"
    // Screen reader support
    aria-label={button.ariaLabel}
    aria-pressed={button.isActive}
    // Touch feedback
    _active={{ 
        bg: 'blue.500',
        transform: 'scale(0.95)'  // Visual feedback
    }}
>
    {button.label}
</Button>
```

### Voice and Keyboard Support

```typescript
// Alternative input methods
<Box
    // Voice navigation support
    role="application"
    aria-label="Script management interface"
    // Keyboard navigation
    onKeyDown={handleKeyDown}
    tabIndex={0}
>
    {/* Content with keyboard navigation */}
</Box>
```

## Testing Mobile Functionality

### Mobile Testing Strategies

1. **Device Testing**: Test on actual mobile devices
2. **Responsive Testing**: Use browser dev tools for screen sizes
3. **Touch Simulation**: Test touch interactions with dev tools
4. **Performance Testing**: Monitor mobile performance metrics
5. **Network Testing**: Test with mobile network conditions

### Common Mobile Issues

#### Touch Event Conflicts
```typescript
// Prevent touch conflicts
<Box
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
    style={{
        touchAction: 'pan-y',  // Allow vertical scrolling only
        userSelect: 'none'     // Prevent text selection during drag
    }}
>
    {/* Interactive content */}
</Box>
```

#### Viewport Management
```typescript
// Viewport meta tag handling
<meta 
    name="viewport" 
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" 
/>
```

## Future Mobile Enhancements

### Planned Features

1. **Progressive Web App (PWA)**: Offline functionality and app-like experience
2. **Gesture Shortcuts**: Custom gestures for common actions
3. **Voice Commands**: Voice-activated script navigation and editing
4. **Haptic Feedback**: Enhanced tactile feedback for interactions
5. **Mobile-Specific Modes**: Optimized mobile-only interface modes

### Advanced Mobile Features

1. **Background Sync**: Sync changes when device comes online
2. **Push Notifications**: Updates and reminders
3. **Device Integration**: Camera for QR codes, GPS for location-based features
4. **Offline Mode**: Full functionality without network connection

## Integration Points

### Mobile-Desktop Synchronization

Mobile changes sync seamlessly with desktop through the edit queue system:

```typescript
// Cross-platform state synchronization
const syncState = useMemo(() => ({
    pendingOperations,
    hasUnsavedChanges,
    currentScript
}), [pendingOperations, hasUnsavedChanges, currentScript]);

// State persists across mobile/desktop switches
useEffect(() => {
    localStorage.setItem('scriptState', JSON.stringify(syncState));
}, [syncState]);
```

### Mobile Analytics

Track mobile-specific usage patterns:

```typescript
// Mobile usage analytics
const trackMobileInteraction = useCallback((action: string, details: any) => {
    if (isMobile) {
        analytics.track('mobile_script_interaction', {
            action,
            details,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            userAgent: navigator.userAgent
        });
    }
}, [isMobile]);
```

## Related Documentation

- [ManageScriptPage Component Guide](../components/manage-script-page.md)
- [Script Mode System](./script-mode-system.md)
- [Component Architecture](../architecture/component-architecture.md)
- [Performance Optimizations](../architecture/performance-optimizations.md)