# Mobile Interface Design

**Date:** January 2025  
**Status:** Current  
**Category:** User Interface & Mobile Experience

Cuebe's mobile interface provides a touch-first experience optimized for theater professionals who need script access during rehearsals and performances. The design prioritizes readability, quick navigation, and one-handed operation.

## Design Philosophy

### Mobile-First Principles
- **Touch-Optimized**: 44px minimum touch targets for reliable interaction
- **One-Handed Operation**: Critical functions accessible with thumb navigation
- **Performance-Focused**: Minimal data usage and fast loading times
- **Context-Aware**: Different interfaces for different theater spaces and lighting

### Responsive Breakpoints
```typescript
const breakpoints = {
    mobile: '0px - 767px',     // Phone devices
    tablet: '768px - 1023px',  // Tablet devices  
    desktop: '1024px+'         // Desktop and laptop screens
};
```

## Mobile Component Architecture

### 1. MobileScriptDrawer

#### Primary Mobile Script Interface
Located in `frontend/src/features/script/components/MobileScriptDrawer.tsx`

**Key Features**:
- **Drawer-Based Navigation**: Slide-up drawer for script element access
- **Gesture Support**: Swipe gestures for navigation and actions
- **Large Touch Targets**: 48px minimum for reliable touch interaction
- **Dark Mode Optimization**: High contrast for low-light theater environments

#### Component Structure
```typescript
interface MobileScriptDrawerProps {
    elements: ScriptElement[];
    activeElement?: ScriptElement;
    onElementSelect: (element: ScriptElement) => void;
    isOpen: boolean;
    onClose: () => void;
}

const MobileScriptDrawer: React.FC<MobileScriptDrawerProps> = ({
    elements,
    activeElement,
    onElementSelect,
    isOpen,
    onClose
}) => {
    // Touch-optimized implementation
};
```

#### Visual Design
- **Full-Screen Overlay**: Maximizes content visibility
- **Quick Access Header**: Time, element count, current position
- **Scrollable Element List**: Optimized for thumb scrolling
- **Action Buttons**: Large, clearly labeled action buttons

### 2. Responsive Component Pattern

#### Adaptive Rendering Strategy
```typescript
// Hook for screen size detection
const useScreenSize = () => {
    const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
    
    useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            if (width < 768) setScreenSize('mobile');
            else if (width < 1024) setScreenSize('tablet');
            else setScreenSize('desktop');
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);
    
    return screenSize;
};

// Component adaptation pattern
const ScriptInterface: React.FC = () => {
    const screenSize = useScreenSize();
    
    if (screenSize === 'mobile') {
        return <MobileScriptView />;
    }
    
    return <DesktopScriptView />;
};
```

### 3. Touch Interaction Patterns

#### Gesture Implementation
```typescript
// Touch gesture handling
const useTouchGestures = (onSwipeUp: () => void, onSwipeDown: () => void) => {
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    
    const handleTouchStart = (e: TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientY);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientY);
    };
    
    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        
        const distance = touchStart - touchEnd;
        const threshold = 50; // Minimum swipe distance
        
        if (distance > threshold) {
            onSwipeUp();
        } else if (distance < -threshold) {
            onSwipeDown();
        }
    };
    
    return { handleTouchStart, handleTouchMove, handleTouchEnd };
};
```

## Mobile User Experience Flow

### 1. Script Access Workflow

#### Mobile Script Navigation
```
Open App → Show List → Script Selection → Mobile Drawer Interface
    ↓
Element List → Touch Element → Full Details → Quick Actions
    ↓
Swipe Navigation → Next/Previous → Mark Complete → Return to List
```

#### Touch Target Sizing
- **Primary Actions**: 48px minimum (iOS/Android standard)
- **Secondary Actions**: 44px minimum
- **Text Links**: 44px minimum touch area
- **List Items**: 56px minimum height for script elements

### 2. One-Handed Operation Design

#### Thumb-Friendly Layout
```
┌─────────────────────────┐
│     Status Bar          │ ← Device status
├─────────────────────────┤
│   Script Header         │ ← Context info
├─────────────────────────┤
│                         │
│    Content Area         │ ← Main interaction
│                         │ ← Scrollable content
│                         │
├─────────────────────────┤
│   Primary Actions       │ ← Thumb reach zone
└─────────────────────────┘
```

#### Thumb Reach Zones
- **Easy Reach**: Bottom 1/3 of screen - primary actions
- **Comfortable Reach**: Middle 1/3 - secondary content
- **Difficult Reach**: Top 1/3 - informational content only

### 3. Performance Optimization

#### Mobile-Specific Performance
```typescript
// Lazy loading for mobile
const MobileScriptElement = React.lazy(() => 
    import('./MobileScriptElement').then(module => ({
        default: module.MobileScriptElement
    }))
);

// Virtualization for large lists
const VirtualizedElementList: React.FC = ({ elements }) => {
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
    
    // Only render visible elements plus buffer
    const visibleElements = elements.slice(
        visibleRange.start, 
        visibleRange.end
    );
    
    return (
        <VirtualizedList
            items={visibleElements}
            renderItem={({ item }) => <MobileScriptElement element={item} />}
            onScroll={handleScroll}
        />
    );
};
```

## Mobile-Specific Components

### 1. MobileElementCard

#### Design Specifications
```typescript
interface MobileElementCardProps {
    element: ScriptElement;
    isActive: boolean;
    onTap: () => void;
    onLongPress: () => void;
}

const MobileElementCard: React.FC<MobileElementCardProps> = ({
    element,
    isActive,
    onTap,
    onLongPress
}) => {
    return (
        <Box
            minHeight="56px"
            padding="12px 16px"
            backgroundColor={isActive ? 'blue.500' : 'white'}
            borderBottom="1px solid"
            borderColor="gray.200"
            cursor="pointer"
            _active={{ backgroundColor: 'blue.600' }}
            onClick={onTap}
            onTouchStart={handleLongPressStart}
            onTouchEnd={handleLongPressEnd}
        >
            <VStack align="start" spacing={1}>
                <HStack justify="space-between" width="100%">
                    <Text 
                        fontSize="16px" 
                        fontWeight="semibold"
                        color={isActive ? 'white' : 'black'}
                        noOfLines={1}
                    >
                        {element.element_name}
                    </Text>
                    <Text 
                        fontSize="14px" 
                        color={isActive ? 'blue.100' : 'gray.600'}
                    >
                        {formatTime(element.offset_ms)}
                    </Text>
                </HStack>
                
                {element.cue_notes && (
                    <Text 
                        fontSize="14px" 
                        color={isActive ? 'blue.100' : 'gray.700'}
                        noOfLines={2}
                    >
                        {element.cue_notes}
                    </Text>
                )}
            </VStack>
        </Box>
    );
};
```

### 2. MobileActionBar

#### Quick Action Interface
```typescript
const MobileActionBar: React.FC = () => {
    return (
        <Box
            position="fixed"
            bottom="0"
            left="0"
            right="0"
            height="80px"
            backgroundColor="white"
            borderTop="1px solid"
            borderColor="gray.200"
            paddingX="16px"
            paddingY="12px"
            zIndex={1000}
        >
            <HStack spacing={4} justify="space-around">
                <IconButton
                    aria-label="Previous element"
                    icon={<ChevronLeftIcon />}
                    size="lg"
                    variant="ghost"
                    onClick={handlePrevious}
                />
                
                <Button
                    size="lg"
                    colorScheme="blue"
                    flex={1}
                    onClick={handleMarkComplete}
                >
                    Mark Complete
                </Button>
                
                <IconButton
                    aria-label="Next element"
                    icon={<ChevronRightIcon />}
                    size="lg"
                    variant="ghost"
                    onClick={handleNext}
                />
            </HStack>
        </Box>
    );
};
```

## Accessibility and Theater Environment

### 1. High Contrast Mode

#### Low-Light Theater Environments
```typescript
const useTheaterMode = () => {
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    
    const theaterTheme = {
        colors: {
            background: '#000000',
            text: '#FFFFFF',
            accent: '#FF6B35',
            muted: '#666666'
        },
        brightness: {
            screen: 0.3, // Reduce screen brightness
            content: 1.2  // Increase content contrast
        }
    };
    
    return { isTheaterMode, setIsTheaterMode, theaterTheme };
};
```

#### Accessibility Features
- **Large Text Option**: 18px minimum font size
- **High Contrast**: WCAG AA compliance for low-light environments
- **Voice-Over Support**: Screen reader optimization
- **Haptic Feedback**: Touch feedback for critical actions

### 2. Offline Capability

#### Progressive Web App Features
```typescript
// Service worker for offline script access
const useOfflineScripts = () => {
    const [offlineScripts, setOfflineScripts] = useState<Script[]>([]);
    
    const downloadForOffline = async (script: Script) => {
        try {
            // Cache script data for offline access
            await cacheScriptData(script);
            setOfflineScripts(prev => [...prev, script]);
        } catch (error) {
            console.error('Failed to cache script:', error);
        }
    };
    
    const isAvailableOffline = (scriptId: string) => {
        return offlineScripts.some(script => script.script_id === scriptId);
    };
    
    return { downloadForOffline, isAvailableOffline, offlineScripts };
};
```

## Mobile Navigation Patterns

### 1. Bottom Navigation

#### Primary Navigation Structure
```typescript
const MobileBottomNav: React.FC = () => {
    const { pathname } = useLocation();
    
    const navItems = [
        { path: '/shows', icon: CalendarIcon, label: 'Shows' },
        { path: '/scripts', icon: DocumentIcon, label: 'Scripts' },
        { path: '/crews', icon: UsersIcon, label: 'Crew' },
        { path: '/profile', icon: UserIcon, label: 'Profile' }
    ];
    
    return (
        <Box
            position="fixed"
            bottom="0"
            left="0"
            right="0"
            height="60px"
            backgroundColor="white"
            borderTop="1px solid"
            borderColor="gray.200"
            zIndex={1000}
        >
            <HStack spacing={0} height="100%">
                {navItems.map(item => (
                    <VStack
                        key={item.path}
                        flex={1}
                        spacing={1}
                        padding={2}
                        color={pathname === item.path ? 'blue.500' : 'gray.600'}
                        cursor="pointer"
                        onClick={() => navigate(item.path)}
                    >
                        <Icon as={item.icon} boxSize="20px" />
                        <Text fontSize="12px">{item.label}</Text>
                    </VStack>
                ))}
            </HStack>
        </Box>
    );
};
```

### 2. Drawer Navigation

#### Slide-Out Menu System
```typescript
const MobileDrawerMenu: React.FC = () => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    
    return (
        <>
            <IconButton
                aria-label="Open menu"
                icon={<HamburgerIcon />}
                onClick={onOpen}
                variant="ghost"
            />
            
            <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
                <DrawerOverlay />
                <DrawerContent>
                    <DrawerCloseButton />
                    <DrawerHeader>Menu</DrawerHeader>
                    
                    <DrawerBody>
                        <VStack spacing={4} align="start">
                            <Button variant="ghost" leftIcon={<SettingsIcon />}>
                                Settings
                            </Button>
                            <Button variant="ghost" leftIcon={<QuestionIcon />}>
                                Help
                            </Button>
                            <Button variant="ghost" leftIcon={<InfoIcon />}>
                                About
                            </Button>
                        </VStack>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </>
    );
};
```

## Testing Mobile Interface

### 1. Touch Event Testing

#### Gesture Testing Framework
```typescript
// Testing touch interactions
describe('Mobile Script Interface', () => {
    test('should handle swipe gestures', () => {
        const { getByTestId } = render(<MobileScriptDrawer />);
        const drawer = getByTestId('script-drawer');
        
        // Simulate swipe up gesture
        fireEvent.touchStart(drawer, {
            touches: [{ clientY: 500 }]
        });
        
        fireEvent.touchMove(drawer, {
            touches: [{ clientY: 300 }]
        });
        
        fireEvent.touchEnd(drawer);
        
        expect(mockOnSwipeUp).toHaveBeenCalled();
    });
});
```

### 2. Performance Testing

#### Mobile Performance Metrics
- **First Contentful Paint**: < 1.5s on 3G
- **Time to Interactive**: < 3s on 3G
- **Touch Response**: < 100ms touch-to-visual feedback
- **Scroll Performance**: 60fps on mid-range devices

## Future Mobile Enhancements

### 1. Native App Features

#### Planned Native Capabilities
- **Push Notifications**: Script updates and show reminders
- **Offline Sync**: Complete offline script access
- **Device Integration**: Camera for QR code scanning
- **Haptic Feedback**: Enhanced touch feedback

### 2. Advanced Mobile Features

#### Theater-Specific Enhancements
- **Voice Commands**: Hands-free operation during performance
- **Apple Watch Integration**: Quick cue access on wrist
- **Split Screen**: Multiple script views for complex shows
- **Wireless Display**: AirPlay/Chromecast support for large screens

This mobile interface design ensures theater professionals have reliable, touch-optimized access to scripts and show information in any environment, from bright rehearsal rooms to dark performance spaces.