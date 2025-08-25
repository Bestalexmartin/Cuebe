# Testing Strategy

**Date:** January 2025  
**Status:** Current  
**Category:** Development Guide & Quality Assurance

Cuebe employs a comprehensive testing strategy designed to ensure reliability, performance, and user experience quality across all features. The testing approach combines automated testing, built-in testing tools, and manual testing workflows.

## Testing Philosophy

### Multi-Layer Testing Approach

- **Unit Tests**: Individual function and component validation
- **Integration Tests**: Feature interaction and API endpoint testing
- **System Tests**: End-to-end workflow validation
- **Performance Tests**: Load, response time, and resource usage testing
- **User Experience Tests**: Accessibility, usability, and interface testing

### Quality Gates

- **All tests must pass** before deployment
- **Code coverage** minimum 80% for critical paths
- **Performance benchmarks** must be met
- **Accessibility standards** WCAG AA compliance
- **Cross-browser compatibility** tested on major browsers

## Built-In Testing System

### 1. System Testing Dashboard

#### Comprehensive Testing Interface

Located at `/api/system-tests` (accessible without authentication)

**Six Testing Categories**:

1. **Environment Tests**: Configuration and setup validation
2. **Database Tests**: Connection, schema, and data integrity
3. **API Tests**: Endpoint functionality and response validation
4. **Authentication Tests**: Clerk integration and JWT validation
5. **Performance Tests**: Response times and load testing
6. **Network Tests**: Connectivity and external service testing

#### Testing Dashboard Features

```python
# Built-in testing framework
@app.get("/api/system-tests")
async def get_system_tests():
    return HTMLResponse(content="""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Cuebe System Tests</title>
        <style>/* Comprehensive test interface styles */</style>
    </head>
    <body>
        <!-- Complete testing dashboard -->
        <div class="test-categories">
            <div class="test-category" data-category="environment">
                <h3>Environment Tests</h3>
                <!-- Environment validation tests -->
            </div>
            <!-- Additional test categories -->
        </div>
    </body>
    </html>
    """)
```

### 2. Environment Testing

#### Configuration Validation

```python
def test_environment_variables():
    """Validate all required environment variables"""
    required_vars = [
        'DATABASE_URL',
        'CLERK_SECRET_KEY',
        'VITE_CLERK_PUBLISHABLE_KEY'
    ]

    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)

    return {
        'status': 'pass' if not missing_vars else 'fail',
        'missing_variables': missing_vars,
        'total_checked': len(required_vars)
    }
```

#### Docker Environment Testing

```python
def test_docker_environment():
    """Test Docker container environment"""
    tests = {
        'volume_mounts': check_volume_mounts(),
        'port_accessibility': check_port_access(),
        'container_health': check_container_health(),
        'network_connectivity': check_inter_container_communication()
    }

    return {
        'status': 'pass' if all(test['status'] == 'pass' for test in tests.values()) else 'fail',
        'details': tests
    }
```

### 3. Database Testing

#### Connection and Schema Validation

```python
async def test_database_connection():
    """Test database connectivity and basic operations"""
    try:
        # Test basic connection
        result = await database.execute("SELECT 1")

        # Test table existence
        tables = await get_table_list()
        required_tables = [
            'userTable', 'scriptsTable', 'scriptElementsTable',
            'script_shares', 'crewRelationshipsTable'
        ]

        missing_tables = [table for table in required_tables if table not in tables]

        return {
            'status': 'pass' if not missing_tables else 'fail',
            'connection': 'healthy',
            'missing_tables': missing_tables,
            'total_tables': len(tables)
        }
    except Exception as e:
        return {
            'status': 'fail',
            'error': str(e),
            'connection': 'failed'
        }
```

#### Data Integrity Testing

```python
async def test_data_integrity():
    """Test database constraints and relationships"""
    integrity_tests = {
        'foreign_key_constraints': await test_foreign_keys(),
        'unique_constraints': await test_unique_constraints(),
        'check_constraints': await test_check_constraints(),
        'relationship_integrity': await test_relationship_consistency()
    }

    return {
        'status': 'pass' if all(test['status'] == 'pass' for test in integrity_tests.values()) else 'fail',
        'details': integrity_tests
    }
```

## Automated Testing Framework

### 1. Backend Testing (pytest)

#### Test Structure

```
backend/tests/
├── conftest.py              # Test configuration and fixtures
├── test_api_critical.py     # Critical endpoint testing
├── test_models.py           # Database model testing
├── test_authentication.py   # Auth system testing
├── test_permissions.py      # Access control testing
└── test_edit_queue.py       # Edit queue system testing
```

#### Example Test Implementation

```python
# test_script_management.py
import pytest
from uuid import uuid4
from models import User, Script, ScriptElement

class TestScriptManagement:
    """Test script creation, editing, and management workflows"""

    @pytest.mark.asyncio
    async def test_create_script(self, test_user: User, test_show):
        """Test script creation with valid data"""
        script_data = {
            "script_name": "Test Script",
            "show_id": test_show.show_id,
            "script_status": "DRAFT"
        }

        response = await client.post(
            "/api/scripts/",
            json=script_data,
            headers={"Authorization": f"Bearer {test_user.token}"}
        )

        assert response.status_code == 201
        script = response.json()
        assert script["script_name"] == "Test Script"
        assert script["owner_id"] == str(test_user.user_id)

    @pytest.mark.asyncio
    async def test_edit_queue_operations(self, test_script):
        """Test edit queue functionality"""
        # Test adding operations to queue
        operations = [
            {
                "type": "UPDATE_FIELD",
                "element_id": "test-element",
                "field": "element_name",
                "old_value": "Old Name",
                "new_value": "New Name"
            }
        ]

        response = await client.put(
            f"/api/scripts/{test_script.script_id}/elements/batch-update",
            json={"operations": operations}
        )

        assert response.status_code == 200
```

### 2. Frontend Testing (React Testing Library)

#### Component Testing Strategy

```typescript
// ScriptElementCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ScriptElementCard } from '../ScriptElementCard';

describe('ScriptElementCard', () => {
    const mockElement = {
        element_id: 'test-id',
        element_name: 'Test Element',
        element_type: 'CUE',
        offset_ms: 30000,
        cue_notes: 'Test notes'
    };

    test('renders element information correctly', () => {
        render(
            <ScriptElementCard
                element={mockElement}
                isSelected={false}
                onSelect={jest.fn()}
            />
        );

        expect(screen.getByText('Test Element')).toBeInTheDocument();
        expect(screen.getByText('0:30')).toBeInTheDocument();
        expect(screen.getByText('Test notes')).toBeInTheDocument();
    });

    test('handles selection correctly', () => {
        const onSelect = jest.fn();
        render(
            <ScriptElementCard
                element={mockElement}
                isSelected={false}
                onSelect={onSelect}
            />
        );

        fireEvent.click(screen.getByRole('button'));
        expect(onSelect).toHaveBeenCalledWith(mockElement);
    });
});
```

#### Hook Testing

```typescript
// useEditQueue.test.tsx
import { renderHook, act } from "@testing-library/react";
import { useEditQueue } from "../useEditQueue";

describe("useEditQueue", () => {
  test("adds operations to queue", () => {
    const { result } = renderHook(() => useEditQueue());

    act(() => {
      result.current.addOperation({
        type: "UPDATE_FIELD",
        elementId: "test-id",
        field: "name",
        oldValue: "old",
        newValue: "new",
      });
    });

    expect(result.current.operations).toHaveLength(1);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  test("handles undo/redo correctly", () => {
    const { result } = renderHook(() => useEditQueue());

    // Add operation
    act(() => {
      result.current.addOperation({
        type: "UPDATE_FIELD",
        elementId: "test-id",
        field: "name",
        oldValue: "old",
        newValue: "new",
      });
    });

    // Undo operation
    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    // Redo operation
    act(() => {
      result.current.redo();
    });

    expect(result.current.operations).toHaveLength(1);
  });
});
```

## Performance Testing

### 1. Backend Performance

#### Response Time Testing

```python
async def test_api_response_times():
    """Test API endpoint response times"""
    endpoints = [
        ('/api/scripts/', 'GET'),
        ('/api/scripts/test-id/elements', 'GET'),
        ('/api/shows/', 'GET'),
        ('/api/crews/', 'GET')
    ]

    results = {}
    for endpoint, method in endpoints:
        start_time = time.time()
        response = await client.request(method, endpoint)
        end_time = time.time()

        response_time = (end_time - start_time) * 1000  # Convert to ms
        results[f"{method} {endpoint}"] = {
            'response_time_ms': response_time,
            'status': 'pass' if response_time < 500 else 'fail',  # 500ms threshold
            'status_code': response.status_code
        }

    return results
```

#### Database Query Performance

```python
async def test_database_query_performance():
    """Test database query performance with realistic data volumes"""
    # Test with 1000 script elements
    script_id = await create_test_script_with_elements(1000)

    start_time = time.time()
    elements = await get_script_elements(script_id)
    query_time = (time.time() - start_time) * 1000

    return {
        'query_time_ms': query_time,
        'element_count': len(elements),
        'status': 'pass' if query_time < 100 else 'fail'  # 100ms for 1000 elements
    }
```

### 2. Frontend Performance

#### Render Performance Testing

```typescript
// Performance monitoring hook
const useRenderCount = (componentName: string) => {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    if (process.env.NODE_ENV === "development") {
      if (renderCount.current > 10) {
        console.warn(`${componentName} may be re-rendering too frequently`);
      }
    }
  });

  return renderCount.current;
};

// Usage in components
const ScriptElementCard: React.FC<Props> = (props) => {
  const renderCount = useRenderCount("ScriptElementCard");

  // Component implementation
};
```

#### Bundle Size Monitoring

```typescript
// webpack-bundle-analyzer integration
const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: "static",
      reportFilename: "bundle-report.html",
      openAnalyzer: false,
    }),
  ],
};
```

## User Experience Testing

### 1. Accessibility Testing

#### WCAG Compliance Testing

```typescript
// Accessibility testing with jest-axe
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
    test('ScriptManagement page should not have accessibility violations', async () => {
        const { container } = render(<ScriptManagementPage />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });
});
```

#### Keyboard Navigation Testing

```typescript
describe('Keyboard Navigation', () => {
    test('should navigate through script elements with arrow keys', () => {
        render(<ScriptElementsList />);

        const firstElement = screen.getByTestId('element-0');
        firstElement.focus();

        fireEvent.keyDown(firstElement, { key: 'ArrowDown' });

        const secondElement = screen.getByTestId('element-1');
        expect(secondElement).toHaveFocus();
    });
});
```

### 2. Mobile Testing

#### Touch Interaction Testing

```typescript
describe('Mobile Touch Interactions', () => {
    test('should handle swipe gestures on mobile drawer', () => {
        const { getByTestId } = render(<MobileScriptDrawer />);
        const drawer = getByTestId('script-drawer');

        // Simulate touch events
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

## Continuous Integration Testing

### 1. GitHub Actions Integration

#### Automated Test Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run tests
        run: |
          cd backend
          pytest --cov=. --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run tests
        run: |
          cd frontend
          npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### 2. Pre-commit Hooks

#### Code Quality Gates

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: bash -c 'cd backend && pytest'
        language: system
        pass_filenames: false
        always_run: true

      - id: eslint
        name: eslint
        entry: bash -c 'cd frontend && npm run lint'
        language: system
        pass_filenames: false
        always_run: true

      - id: typescript-check
        name: typescript-check
        entry: bash -c 'cd frontend && npm run type-check'
        language: system
        pass_filenames: false
        always_run: true
```

## Testing Commands and Scripts

### Backend Testing

```bash
# Full test suite
cd backend && ./run-tests.sh

# With coverage
cd backend && ./run-tests.sh --cov=. --cov-report=html

# Watch mode for development
cd backend && ./run-tests.sh --watch

# Specific test categories
cd backend && pytest tests/test_api_critical.py -v
```

### Frontend Testing

```bash
# Run all tests
cd frontend && npm test

# Coverage report
cd frontend && npm run test:coverage

# Watch mode
cd frontend && npm run test:watch

# E2E tests (if implemented)
cd frontend && npm run test:e2e
```

### Built-in System Tests

```bash
# Access testing dashboard
open http://localhost:8000/api/system-tests

# Run specific test categories via API
curl http://localhost:8000/api/system-tests/environment
curl http://localhost:8000/api/system-tests/database
curl http://localhost:8000/api/system-tests/performance
```

## Testing Best Practices

### 1. Test Organization

#### Naming Conventions

- Test files: `test_*.py` (backend), `*.test.tsx` (frontend)
- Test functions: `test_should_do_something_when_condition`
- Test classes: `TestFeatureName`

#### Test Structure

```python
# AAA Pattern: Arrange, Act, Assert
def test_create_script_element():
    # Arrange
    user = create_test_user()
    script = create_test_script(user)
    element_data = {"name": "Test Element", "type": "CUE"}

    # Act
    response = client.post(f"/api/scripts/{script.id}/elements", json=element_data)

    # Assert
    assert response.status_code == 201
    assert response.json()["name"] == "Test Element"
```

### 2. Test Data Management

#### Fixtures and Factories

```python
# conftest.py
@pytest.fixture
async def test_user():
    """Create a test user with proper authentication"""
    user = User(
        email_address="test@example.com",
        fullname_first="Test",
        fullname_last="User",
        user_status=UserStatus.VERIFIED
    )
    db.add(user)
    await db.commit()
    return user

@pytest.fixture
async def test_script_with_elements(test_user):
    """Create a script with sample elements for testing"""
    script = create_test_script(test_user)
    elements = create_test_elements(script, count=10)
    return script, elements
```

This comprehensive testing strategy ensures Cuebe maintains high quality, performance, and reliability across all features and user interactions.
