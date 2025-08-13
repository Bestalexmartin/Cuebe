# User Permissions and Access Control

**Date:** January 2025  
**Status:** Current  
**Category:** System Architecture & Security

Cuebe implements a sophisticated but intuitive permission system designed specifically for theater production workflows. The system balances security with usability, enabling both verified users and guest crew members to access appropriate resources.

## Overview

The access control system is built around theater production hierarchies and relationships, supporting:
- **Verified Users**: Full account holders with complete system access
- **Guest Users**: Crew members with limited, managed access
- **Manager-Crew Relationships**: Hierarchical access control
- **Resource Ownership**: Content creators control access to their resources
- **Script Sharing**: Secure, token-based read-only access

## User Types and Status

### 1. User Status Model

#### UserStatus Enum
Located in `backend/models.py:98-102`

```python
class UserStatus(enum.Enum):
    GUEST = "guest"         # Created by someone else, no Clerk account
    VERIFIED = "verified"   # Has Clerk account and can log in
```

#### Verified Users
- **Authentication**: Full Clerk account with login credentials
- **Permissions**: Complete system access within their ownership scope
- **Capabilities**:
  - Create and manage shows, scripts, venues, departments
  - Invite and manage guest users
  - Share scripts with controlled access
  - Full CRUD operations on owned resources

#### Guest Users
- **Authentication**: No login credentials, access via invitations/shares only
- **Permissions**: Limited, managed access through relationships
- **Capabilities**:
  - View shared scripts and relevant show information
  - Access department-specific content
  - Limited profile management
  - No resource creation or management

### 2. User Role System

#### UserRole Enum
Located in `backend/models.py:50-71`

The system supports comprehensive theater production roles:

**Management Roles**:
- `DIRECTOR` - Overall creative control
- `PRODUCER` - Production oversight
- `STAGE_MANAGER` - Production coordination
- `ASSISTANT_STAGE_MANAGER` - Production support
- `TECHNICAL_DIRECTOR` - Technical oversight

**Design Roles**:
- `LIGHTING_DESIGNER` - Lighting design and supervision
- `SOUND_DESIGNER` - Audio design and supervision
- `COSTUME_DESIGNER` - Costume design
- `SET_DESIGNER` - Set design
- `CHOREOGRAPHER` - Movement direction
- `MUSIC_DIRECTOR` - Musical direction

**Technical Roles**:
- `ELECTRICIAN` - Lighting execution
- `SOUND_TECHNICIAN` - Audio execution
- `PROPS_MASTER` - Props management

**Other Roles**:
- `WARDROBE`, `MAKEUP_ARTIST`, `HAIR_STYLIST`
- `CREW` - General crew member
- `OTHER` - Custom roles

## Access Control Architecture

### 1. Crew Relationship Model

#### CrewRelationship Table
Located in `backend/models.py` (CrewRelationship class)

```sql
CREATE TABLE crewRelationshipsTable (
    relationship_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_user_id UUID NOT NULL, -- Who manages this relationship
    crew_user_id UUID NOT NULL,    -- Who is being managed
    notes TEXT NULL,               -- Management notes
    is_active BOOLEAN DEFAULT true,
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (manager_user_id) REFERENCES userTable(user_id) ON DELETE CASCADE,
    FOREIGN KEY (crew_user_id) REFERENCES userTable(user_id) ON DELETE CASCADE,
    
    UNIQUE(manager_user_id, crew_user_id) -- Prevent duplicate relationships
);
```

#### Relationship Characteristics
- **One-to-Many**: One manager can manage multiple crew members
- **Many-to-Many**: Crew members can be managed by multiple managers
- **Hierarchical**: Supports theater production hierarchies
- **Trackable**: Includes notes and timestamps for relationship management

### 2. Resource Ownership Model

#### Ownership Principles
All major resources have an `owner_id` field that determines primary access:

**Scripts**: 
- Owner has full CRUD access
- Can share with controlled permissions
- Can delegate management to crew

**Shows**:
- Owner controls cast and crew assignments
- Manages production timeline and venues
- Controls script associations

**Venues/Departments**:
- Owner manages configurations and assignments
- Controls access to departmental resources

#### Ownership Verification Pattern
```python
# Common pattern in API endpoints
def verify_resource_access(user: User, resource_owner_id: UUID, required_permission: str = "read"):
    # Self-access always allowed
    if user.user_id == resource_owner_id:
        return True
    
    # Check crew relationship for managed access
    if required_permission == "read":
        relationship = db.query(CrewRelationship).filter(
            CrewRelationship.manager_user_id == resource_owner_id,
            CrewRelationship.crew_user_id == user.user_id,
            CrewRelationship.is_active == True
        ).first()
        return relationship is not None
    
    # Write permissions require ownership
    return False
```

## Permission Levels and Scope

### 1. Resource Permissions

#### Read Permissions
- **Own Resources**: Full read access to owned content
- **Managed Crew Access**: Read access to resources from managers
- **Shared Content**: Token-based access to shared scripts
- **Public Information**: Basic venue and department information

#### Write Permissions
- **Owner Only**: Only resource owners can modify core content
- **Delegated Updates**: Specific fields may allow crew member updates
- **Profile Management**: Users can update their own profile information
- **Relationship Notes**: Managers can update notes about crew members

#### Create Permissions
- **Verified Users**: Can create shows, scripts, venues, departments
- **Guest Users**: Cannot create new resources
- **Invitation Creation**: Verified users can create guest user accounts

#### Delete Permissions
- **Owner Only**: Only resource owners can delete their content
- **Relationship Management**: Managers can remove crew relationships
- **Account Deletion**: Users can delete their own accounts (with protections)

### 2. API Endpoint Security

#### Authentication Requirements
```python
# All API endpoints require authentication
@router.get("/api/scripts/{script_id}")
async def get_script(
    script_id: UUID,
    current_user: User = Depends(get_current_user),  # Required authentication
    db: Session = Depends(get_db)
):
```

#### Authorization Patterns
```python
# Common authorization patterns

# 1. Owner-only access
def verify_ownership(resource, user):
    if resource.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

# 2. Owner or managed crew access
def verify_read_access(resource, user, db):
    if resource.owner_id == user.user_id:
        return True
    
    # Check if user is managed by resource owner
    relationship = db.query(CrewRelationship).filter(
        CrewRelationship.manager_user_id == resource.owner_id,
        CrewRelationship.crew_user_id == user.user_id,
        CrewRelationship.is_active == True
    ).first()
    
    if not relationship:
        raise HTTPException(status_code=403, detail="Access denied")

# 3. Self or manager access (for user data)
def verify_user_access(target_user_id, current_user, db):
    if target_user_id == current_user.user_id:
        return True  # Self-access
    
    # Check if current user manages target user
    relationship = db.query(CrewRelationship).filter(
        CrewRelationship.manager_user_id == current_user.user_id,
        CrewRelationship.crew_user_id == target_user_id,
        CrewRelationship.is_active == True
    ).first()
    
    if not relationship:
        raise HTTPException(status_code=403, detail="Access denied")
```

## Script Sharing Security

### 1. Token-Based Access

#### Share Token System
- **Unique Tokens**: Each script share has a cryptographically secure token
- **Granular Permissions**: View, download, and department-specific access
- **Expiration Control**: Optional time-based access expiration
- **Usage Tracking**: Complete audit trail of share access

#### Permission Structure
```python
# Default share permissions
{
    "view": True,           # Can view script content
    "download": False,      # Cannot download/export
    "departments": [],      # Empty = all departments, or specific UUIDs
    "elements": ["CUE", "NOTE"]  # Allowed element types
}
```

### 2. Public Access Endpoints

#### Security Considerations
- **No Authentication Required**: Share tokens provide access
- **Read-Only Access**: Shared scripts are always read-only
- **Filtered Content**: Only appropriate elements shown based on permissions
- **Rate Limiting**: Prevent abuse of public endpoints
- **IP Tracking**: Monitor access for security

#### Public Endpoint Pattern
```python
@app.get("/api/public/shared-scripts/{share_token}")
async def access_shared_script(share_token: str, db: Session = Depends(get_db)):
    # Validate token without requiring user authentication
    share = db.query(ScriptShare).filter(
        ScriptShare.share_token == share_token,
        ScriptShare.is_active == True
    ).first()
    
    if not share:
        raise HTTPException(status_code=404, detail="Invalid or expired share")
    
    # Check expiration
    if share.expires_at and share.expires_at < datetime.now():
        raise HTTPException(status_code=410, detail="Share has expired")
    
    # Update access tracking
    share.access_count += 1
    share.last_accessed_at = datetime.now()
    # IP tracking would be added here
    
    # Return filtered script content based on permissions
    return filter_script_content(share.script, share.permissions)
```

## User Account Management

### 1. Guest User Creation

#### Invitation Workflow
```python
# Guest user creation process
@router.post("/guest-users/")
async def create_guest_user(
    guest_data: GuestUserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Create guest user account
    new_guest_user = User(
        email_address=guest_data.email_address,
        fullname_first=guest_data.fullname_first,
        fullname_last=guest_data.fullname_last,
        user_status=UserStatus.GUEST,
        user_role=guest_data.user_role,
        created_by=current_user.user_id,  # Track who created this guest
        phone_number=guest_data.phone_number,
        notes=guest_data.notes
    )
    db.add(new_guest_user)
    db.flush()  # Get ID without committing
    
    # Create crew relationship automatically
    crew_relationship = CrewRelationship(
        manager_user_id=current_user.user_id,
        crew_user_id=new_guest_user.user_id,
        notes=guest_data.notes
    )
    db.add(crew_relationship)
    db.commit()
    
    return {"message": "Guest user created", "user_id": new_guest_user.user_id}
```

#### Guest User Characteristics
- **No Login Credentials**: Cannot authenticate directly
- **Managed Access**: Access controlled through relationships
- **Profile Limitations**: Limited self-management capabilities
- **Invitation Tracking**: Records who created the guest account

### 2. User Status Transitions

#### Guest to Verified Transition
Guest users can be upgraded to verified status:

```python
# Transition workflow (planned feature)
def upgrade_guest_to_verified(guest_user: User, clerk_user_id: str):
    if guest_user.user_status != UserStatus.GUEST:
        raise ValueError("User is not a guest")
    
    # Update to verified status
    guest_user.user_status = UserStatus.VERIFIED
    guest_user.clerk_user_id = clerk_user_id
    guest_user.user_role = "admin"  # Upgrade role
    
    # Preserve existing relationships and data
    # Guest becomes a full user while maintaining crew relationships
```

## Security Patterns and Best Practices

### 1. Data Isolation

#### Tenant Isolation Pattern
```python
# All queries filter by user ownership or relationships
def get_user_scripts(user: User, db: Session):
    return db.query(Script).filter(
        or_(
            Script.owner_id == user.user_id,  # Own scripts
            Script.owner_id.in_(  # Scripts from managed users
                db.query(CrewRelationship.manager_user_id)
                .filter(CrewRelationship.crew_user_id == user.user_id)
                .filter(CrewRelationship.is_active == True)
            )
        )
    ).all()
```

#### Query Security
- **Always Filter**: Never return unfiltered resource lists
- **Verify Ownership**: Check ownership on all operations
- **Relationship Validation**: Verify crew relationships before access
- **Input Validation**: Sanitize all user inputs

### 2. Audit and Monitoring

#### Access Logging
```python
# Access logging pattern
def log_resource_access(user: User, resource_type: str, resource_id: UUID, action: str):
    audit_log = AuditLog(
        user_id=user.user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        action=action,
        timestamp=datetime.now(),
        ip_address=get_client_ip(),
        user_agent=get_user_agent()
    )
    db.add(audit_log)
```

#### Security Monitoring
- **Failed Access Attempts**: Track and alert on permission denials
- **Unusual Patterns**: Monitor for suspicious access patterns
- **Share Usage**: Track script share access and usage
- **Relationship Changes**: Log crew relationship modifications

## API Endpoint Examples

### 1. Crew Management Endpoints

#### List Managed Crew
```http
GET /api/crews/
Authorization: Bearer {jwt_token}

Response: List of crew members user manages + self
```

#### Create Crew Relationship
```http
POST /api/crew-relationships/
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
    "crew_user_id": "uuid",
    "notes": "Lighting team member for summer season"
}
```

#### Update Crew Member
```http
PUT /api/crews/{crew_id}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
    "user_data": {
        "phone_number": "555-0123"
    },
    "relationship_notes": "Updated contact info"
}
```

### 2. Script Access Endpoints

#### Get Script (Ownership + Relationship Check)
```http
GET /api/scripts/{script_id}
Authorization: Bearer {jwt_token}

Security: 
- Returns script if user owns it OR
- User is managed by script owner OR  
- User has valid share token
```

#### Share Script
```http
POST /api/scripts/{script_id}/shares
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
    "shared_with_user_id": "uuid",
    "permissions": {"view": true, "download": false},
    "expires_at": "2025-12-31T23:59:59Z"
}
```

## Error Handling and Responses

### 1. HTTP Status Codes

#### Authentication Errors
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Valid authentication but insufficient permissions
- **404 Not Found**: Resource doesn't exist or user lacks access

#### Permission Errors
```python
# Standard permission error responses
{
    "detail": "Access denied",
    "error_code": "INSUFFICIENT_PERMISSIONS",
    "required_permission": "owner_or_manager_access"
}
```

### 2. Graceful Degradation

#### Limited Access Scenarios
- **Guest Users**: Hide features they cannot access
- **Shared Scripts**: Show only permitted content
- **Crew Members**: Display relevant departmental information only

## Future Enhancements

### 1. Role-Based Permissions

#### Planned Improvements
- **Department-Specific Roles**: Permissions based on theater department
- **Show-Specific Permissions**: Temporary permissions for specific productions
- **Granular Script Access**: Element-level permission control
- **Time-Based Permissions**: Automatic permission expiration

### 2. Advanced Security Features

#### Enhanced Security
- **Multi-Factor Authentication**: For high-privilege accounts
- **Session Management**: Advanced session control and monitoring
- **API Rate Limiting**: Comprehensive rate limiting by user and endpoint
- **Advanced Audit**: Machine learning-based anomaly detection

This permission system provides robust security while maintaining the flexibility needed for diverse theater production workflows and team structures.