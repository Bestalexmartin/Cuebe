# API Reference

**Date:** January 2025  
**Status:** Current  
**Category:** Data Management & API Design

Comprehensive reference for all Cuebe API endpoints, organized by feature area. All endpoints require JWT authentication unless otherwise specified.

## Authentication

### Base URL
- **Development**: `http://localhost:8000`
- **Production**: `https://your-domain.com`

### Authorization Header
```http
Authorization: Bearer {jwt_token}
```

### Authentication Endpoints

#### Health Check (Public)
```http
GET /api/health
```
**Description**: Service health status  
**Authentication**: None required  
**Response**: Service status and version info

#### System Tests (Public)
```http
GET /api/system-tests
```
**Description**: Built-in testing interface  
**Authentication**: None required  
**Response**: HTML testing dashboard

## User Management

### Get Current User
```http
GET /api/users/me
```
**Description**: Get current authenticated user details  
**Response**: User object with preferences and profile data

### Update User Profile
```http
PUT /api/users/me
```
**Description**: Update current user's profile information  
**Body**: User profile fields (name, phone, preferences, etc.)

### Create Guest User
```http
POST /api/guest-users/
```
**Description**: Create a guest user account with crew relationship  
**Body**: 
```json
{
    "email_address": "crew@example.com",
    "fullname_first": "John",
    "fullname_last": "Doe", 
    "user_role": "crew",
    "phone_number": "555-0123",
    "notes": "Lighting team member"
}
```

## Crew Management

### List Crew Members
```http
GET /api/crews/
```
**Description**: List all crew members you manage plus yourself  
**Response**: Array of crew members with relationship data

### Get Crew Member
```http
GET /api/crews/{crew_id}
```
**Description**: Get specific crew member details  
**Security**: Self-access or manager relationship required

### Update Crew Member
```http
PUT /api/crews/{crew_id}
```
**Description**: Update crew member profile and relationship notes  
**Body**: User data and relationship_notes

### Create Crew Relationship
```http
POST /api/crew-relationships/
```
**Description**: Add existing user to your crew  
**Body**:
```json
{
    "crew_user_id": "uuid",
    "notes": "Department assignment notes"
}
```

### Remove Crew Relationship
```http
DELETE /api/crew-relationships/{crew_user_id}
```
**Description**: Remove crew member from your management

## Show Management

### List Shows
```http
GET /api/shows/
```
**Description**: List all shows you own or are crew member for  
**Query Parameters**:
- `skip` (int): Pagination offset
- `limit` (int): Results per page (max 100)

### Get Show
```http
GET /api/shows/{show_id}
```
**Description**: Get specific show details with full relationships

### Create Show
```http
POST /api/shows/
```
**Description**: Create new show  
**Body**: Show data (name, dates, venue_id, etc.)

### Update Show
```http
PUT /api/shows/{show_id}
```
**Description**: Update show details  
**Security**: Owner only

### Delete Show
```http
DELETE /api/shows/{show_id}
```
**Description**: Delete show and all associated data  
**Security**: Owner only

## Script Management

### List Scripts
```http
GET /api/scripts/
```
**Description**: List scripts you own or have access to  
**Query Parameters**:
- `show_id` (UUID): Filter by show
- `status` (string): Filter by script status

### Get Script
```http
GET /api/scripts/{script_id}
```
**Description**: Get script details  
**Security**: Owner or crew relationship required

### Create Script
```http
POST /api/scripts/
```
**Description**: Create new script  
**Body**: Script data with show_id

### Update Script
```http
PUT /api/scripts/{script_id}
PATCH /api/scripts/{script_id}
```
**Description**: Update script metadata  
**Security**: Owner only

### Delete Script
```http
DELETE /api/scripts/{script_id}
```
**Description**: Delete script and all elements  
**Security**: Owner only

### Duplicate Script
```http
POST /api/scripts/{script_id}/duplicate
```
**Description**: Create copy of script with new name  
**Body**: `{"new_name": "Script Copy"}`

## Script Elements

### List Script Elements
```http
GET /api/scripts/{script_id}/elements
```
**Description**: Get all elements for a script  
**Query Parameters**:
- `element_type` (string): Filter by CUE, NOTE, GROUP
- `department_id` (UUID): Filter by department
- `active_only` (boolean): Only active elements (default: true)
- `skip` (int): Pagination offset
- `limit` (int): Results per page (max 1000)

### Get Script Element
```http
GET /api/elements/{element_id}
```
**Description**: Get single element details

### Create Script Element
```http
POST /api/scripts/{script_id}/elements
```
**Description**: Add new element to script  
**Body**: Element data (name, type, department_id, etc.)

### Update Script Element
```http
PUT /api/elements/{element_id}
PATCH /api/elements/{element_id}
```
**Description**: Update element fields

### Delete Script Element
```http
DELETE /api/elements/{element_id}
```
**Description**: Remove element from script

### Batch Update Elements
```http
PUT /api/scripts/{script_id}/elements/batch-update
```
**Description**: Apply multiple edit queue operations  
**Body**: Array of edit operations for batch processing

### Reorder Elements
```http
PUT /api/scripts/{script_id}/elements/reorder
```
**Description**: Update element sequence positions  
**Body**: Array of element_id and new_sequence pairs

## Script Sharing (Planned - Backend Ready)

### Create Script Share
```http
POST /api/scripts/{script_id}/shares
```
**Description**: Create secure share token for script access  
**Body**:
```json
{
    "shared_with_user_id": "uuid",
    "permissions": {"view": true, "download": false},
    "expires_at": "2025-12-31T23:59:59Z",
    "share_name": "Lighting Team Access"
}
```

### List Script Shares
```http
GET /api/scripts/{script_id}/shares
```
**Description**: List all shares for a script  
**Security**: Script owner only

### Update Script Share
```http
PATCH /api/scripts/{script_id}/shares/{share_id}
```
**Description**: Modify share permissions or expiration

### Delete Script Share
```http
DELETE /api/scripts/{script_id}/shares/{share_id}
```
**Description**: Revoke script share access

### Access Shared Script (Public)
```http
GET /api/public/shared-scripts/{share_token}
```
**Description**: Access script via share token  
**Authentication**: None required (token-based)  
**Response**: Filtered script content based on permissions

### Validate Share Token (Public)
```http
GET /api/public/shared-scripts/{share_token}/validate
```
**Description**: Check if share token is valid  
**Authentication**: None required

## Venue Management

### List Venues
```http
GET /api/venues/
```
**Description**: List venues you own or have access to

### Get Venue
```http
GET /api/venues/{venue_id}
```
**Description**: Get venue details

### Create Venue
```http
POST /api/venues/
```
**Description**: Create new venue  
**Body**: Venue data (name, address, capacity, etc.)

### Update Venue
```http
PUT /api/venues/{venue_id}
```
**Description**: Update venue details  
**Security**: Owner only

### Delete Venue
```http
DELETE /api/venues/{venue_id}
```
**Description**: Delete venue  
**Security**: Owner only

## Department Management

### List Departments
```http
GET /api/departments/
```
**Description**: List departments you own or have access to

### Get Department
```http
GET /api/departments/{department_id}
```
**Description**: Get department details

### Create Department
```http
POST /api/departments/
```
**Description**: Create new department  
**Body**: Department data (name, color, description, etc.)

### Update Department
```http
PUT /api/departments/{department_id}
```
**Description**: Update department details  
**Security**: Owner only

### Delete Department
```http
DELETE /api/departments/{department_id}
```
**Description**: Delete department  
**Security**: Owner only

## Documentation System

### List Documentation
```http
GET /api/docs/index
```
**Description**: Get organized documentation file listing  
**Response**: Categorized documentation structure

### Get Documentation File
```http
GET /api/docs/{file_path}
```
**Description**: Retrieve specific documentation content  
**Response**: Raw markdown content

## Error Responses

### Standard Error Format
```json
{
    "detail": "Error description",
    "error_code": "SPECIFIC_ERROR_CODE",
    "field_errors": {
        "field_name": ["Validation error message"]
    }
}
```

### HTTP Status Codes

#### Success Codes
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **204 No Content**: Successful deletion

#### Client Error Codes
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Valid auth but insufficient permissions
- **404 Not Found**: Resource doesn't exist or no access
- **422 Unprocessable Entity**: Validation errors

#### Server Error Codes
- **500 Internal Server Error**: Unexpected server error
- **503 Service Unavailable**: Service temporarily unavailable

### Common Error Scenarios

#### Authentication Errors
```json
{
    "detail": "Could not validate credentials",
    "error_code": "INVALID_TOKEN"
}
```

#### Permission Errors
```json
{
    "detail": "Access denied",
    "error_code": "INSUFFICIENT_PERMISSIONS",
    "required_permission": "owner_access"
}
```

#### Validation Errors
```json
{
    "detail": "Validation failed",
    "error_code": "VALIDATION_ERROR",
    "field_errors": {
        "email_address": ["Invalid email format"],
        "fullname_first": ["Required field missing"]
    }
}
```

#### Resource Not Found
```json
{
    "detail": "Script not found",
    "error_code": "RESOURCE_NOT_FOUND"
}
```

## Rate Limiting

### Current Implementation
- **Basic Rate Limiting**: Enabled when Redis is available
- **Default Limits**: 100 requests per minute per IP
- **Override Behavior**: Graceful degradation when Redis unavailable

### Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Data Models

### Common Response Fields
All major entities include:
- `{entity}_id`: UUID primary key
- `owner_id`: UUID of creating user
- `date_created`: ISO datetime
- `date_updated`: ISO datetime

### Pagination Response
```json
{
    "items": [...],
    "total_count": 150,
    "skip": 0,
    "limit": 50,
    "has_more": true
}
```

### Relationship Response Pattern
```json
{
    "user_data": {...},
    "relationship_notes": "Department assignment info",
    "relationship_active": true
}
```

## Development and Testing

### API Testing Endpoints
```http
GET /api/system-tests
```
**Description**: Built-in API testing interface  
**Features**:
- Environment validation
- Database connectivity tests
- Authentication testing
- Performance benchmarks
- Network connectivity tests

### Development Utilities
```http
GET /api/health
```
**Response**:
```json
{
    "status": "healthy",
    "timestamp": "2025-01-13T10:30:00Z",
    "database": "connected",
    "version": "1.0.0",
    "environment": "development"
}
```

## Migration and Versioning

### API Versioning
- **Current Version**: v1 (implied in all endpoints)
- **Version Strategy**: URL path versioning for future versions
- **Backward Compatibility**: Maintained within major versions

### Database Migrations
- **Migration Tool**: Alembic
- **Auto-generated**: Schema changes create migrations automatically
- **Version Control**: All migrations tracked in Git

## API Response Consistency

### Architecture Pattern and Best Practices

**Date Added:** January 2025  
**Issue Resolved:** Invalid Date serialization caused by inconsistent API response patterns

#### The Problem

During development, we discovered a critical architectural inconsistency where two endpoints returning similar data used different serialization approaches:

- **Working Endpoint** (`/api/me/shows`): Used SQLAlchemy models → Pydantic schemas ✅
- **Broken Endpoint** (`/api/shared/{token}`): Used manual JSON dictionary construction ❌

This inconsistency led to JavaScript receiving different date formats:
- **Pydantic serialization**: `start_time: null` → `new Date(null)` = valid date
- **Manual serialization**: `start_time: ""` → `new Date("")` = "Invalid Date"

#### The Solution

**Established Rule**: ALL API endpoints MUST use Pydantic schemas with SQLAlchemy models for consistent serialization.

#### Implementation Pattern

**❌ WRONG - Manual JSON Construction:**
```python
# Bad: Manual dictionary construction
return {
    "show_id": str(show.show_id),
    "show_name": show.show_name,
    "start_time": show.start_time.isoformat() if show.start_time else "",  # ❌ Empty string
    "scripts": [{
        "script_id": str(s.script_id),
        "date_created": s.date_created.isoformat(),  # ❌ Manual .isoformat()
        # ... more manual construction
    } for s in scripts]
}
```

**✅ CORRECT - Pydantic Schema Approach:**
```python
# Good: Consistent Pydantic serialization
@router.get("/endpoint", response_model=schemas.ShowResponse)
def get_data(db: Session = Depends(get_db)):
    show = db.query(models.Show).options(
        joinedload(models.Show.scripts),
        joinedload(models.Show.venue)
    ).first()
    
    return show  # Let Pydantic handle serialization automatically
```

#### Core Principles

1. **Single Source of Truth**: One serialization method across entire API
2. **Automatic Handling**: Let Pydantic handle date/UUID/None serialization
3. **Schema Declaration**: Always use `response_model` in endpoint decorators
4. **Model Loading**: Use SQLAlchemy `joinedload()` for relationships
5. **Consistent Types**: Same data structures produce identical JSON output

#### Fixed Endpoints

During the audit (January 2025), we corrected these violations:

1. **`/api/shows/{show_id}/crew/{user_id}/share`**
   - **Before**: Manual `{"assignment_id": ..., "share_token": ...}` dict
   - **After**: `ShareTokenResponse` schema with proper typing

2. **`/api/crew-relationships/`**
   - **Before**: Manual `{"message": "User added to your crew"}` dict
   - **After**: `MessageResponse` schema with consistent structure

3. **`/api/webhooks/clerk`**
   - **Before**: Manual `{"status": "ok"}` dict
   - **After**: `StatusResponse` schema with proper validation

#### Schema Examples

**Generic Response Schemas:**
```python
class MessageResponse(BaseModel):
    """For simple message responses"""
    message: str

class StatusResponse(BaseModel):
    """For status responses"""
    status: str

class ShareTokenResponse(BaseModel):
    """For share token operations"""
    assignment_id: UUID
    share_token: str
    share_url: str
    action: str  # "created" or "retrieved"
```

#### Validation Process

To ensure consistency, all new endpoints must:

1. **Use `response_model`**: Every endpoint must declare its return type
2. **Return SQLAlchemy models**: Let Pydantic handle serialization
3. **No manual `.isoformat()`**: Dates handled automatically by Pydantic
4. **No manual `str(uuid)`**: UUIDs serialized consistently by Pydantic
5. **Schema reuse**: Use existing schemas or extend them, don't create manual dicts

#### Testing Consistency

When adding new endpoints:

```python
# Test that response follows expected schema
def test_endpoint_response_schema():
    response = client.get("/api/endpoint")
    assert response.status_code == 200
    
    data = response.json()
    # Verify Pydantic serialization patterns
    assert data["start_time"] is None or isinstance(data["start_time"], str)
    assert "Invalid Date" not in str(data)
```

#### Monitoring

- **Frontend**: Check for "Invalid Date" in JavaScript console
- **Backend**: Ensure all endpoints have `response_model` declarations
- **Testing**: Verify date/UUID formats in API responses

This consistency ensures reliable data exchange between frontend and backend, preventing serialization-related bugs and maintaining a predictable API contract.

---

This API reference covers all current endpoints and provides patterns for planned features. The API is designed for RESTful consistency while accommodating theater production workflows.