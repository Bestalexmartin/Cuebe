# Script Sharing System

**Date:** January 2025  
**Status:** Backend Ready, API Implementation Pending  
**Category:** Collaboration & Security

The Script Sharing System enables secure, controlled access to call scripts for crew members assigned to shows. This system provides read-only script access through secure tokens while maintaining audit trails and access control.

## Overview

The script sharing system allows script managers (typically Stage Managers or Directors) to share call scripts with crew members without granting full system access. Each share is individual, tracked, and can be revoked or modified at any time.

## Key Features

### Secure Token-Based Access
- Unique tokens for each script-user pair
- No account creation required for crew members
- Configurable expiration dates
- Individual access control and revocation

### Granular Permissions
- **View**: Access to read script content
- **Download**: Permission to export script data
- **Department Filtering**: Limit visible elements by department
- **Time-based Access**: Expiration controls

### Comprehensive Audit Trail
- Access tracking with timestamps and IP addresses
- Usage statistics and analytics
- Share creation and modification history
- Security monitoring and alerts

### User-Friendly Management
- Simple share creation workflow
- QR code generation for mobile access
- Bulk management for show crews
- Integration with crew assignment system

## Architecture Components

### 1. Database Models

#### ScriptShare Model
Located in `backend/models.py:407-449`

```python
class ScriptShare(Base):
    """Script sharing tokens for secure crew access to read-only script views"""
    __tablename__ = "script_shares"
    
    # Core identification
    share_id = Column(UUID, primary_key=True)
    script_id = Column(UUID, ForeignKey("scriptsTable.script_id"))
    created_by = Column(UUID, ForeignKey("userTable.user_id"))
    shared_with_user_id = Column(UUID, ForeignKey("userTable.user_id"))
    
    # Security and access
    share_token = Column(String(255), unique=True, nullable=False)
    permissions = Column(JSON, default={"view": True, "download": False})
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Usage tracking
    access_count = Column(Integer, default=0)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)
    last_accessed_by_ip = Column(String(45), nullable=True)
    
    # Management metadata
    share_name = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
```

#### Key Relationships
- **Script**: Many shares per script
- **Creator**: User who created the share
- **Shared With**: Target user for the share
- **Audit Trail**: Tracked through timestamps and usage data

### 2. Pydantic Schemas

Located in `backend/schemas/sharing.py`

#### ScriptShareCreate
```python
class ScriptShareCreate(BaseModel):
    shared_with_user_id: UUID
    permissions: Optional[dict] = {"view": True, "download": False}
    expires_at: Optional[datetime] = None
    share_name: Optional[str] = None
    notes: Optional[str] = None
```

#### ScriptShareResponse
```python
class ScriptShareResponse(BaseModel):
    share_id: UUID
    script_id: UUID
    share_token: str
    permissions: dict
    expires_at: Optional[datetime]
    is_active: bool
    access_count: int
    last_accessed_at: Optional[datetime]
    
    # Computed fields
    shared_with_user_name: Optional[str]
    shared_with_user_email: Optional[str]
    is_expired: bool
    share_url: str
```

#### SharedScriptAccessResponse
```python
class SharedScriptAccessResponse(BaseModel):
    """Public endpoint response for accessing shared scripts"""
    script_id: UUID
    script_name: str
    script_status: str
    show_name: Optional[str]
    venue_name: Optional[str]
    elements: List[dict]  # Filtered script elements
    departments: Optional[List[dict]]
    permissions: dict
    expires_at: Optional[datetime]
```

### 3. Frontend Service

Located in `frontend/src/services/scriptSharingService.ts`

#### Current Implementation
The frontend service provides basic script sharing toggle functionality:

```typescript
export class ScriptSharingService {
    // Mark script as shared (toggle sharing on)
    static async shareWithAllCrew(scriptId: string, token: string): Promise<void>
    
    // Mark script as hidden (toggle sharing off)  
    static async hideFromAllCrew(scriptId: string, token: string): Promise<void>
    
    // Get current sharing status
    static async getSharingStatus(scriptId: string, token: string): Promise<ScriptSharingStatus>
}
```

#### Planned Extensions
The service should be extended to support:
- Individual share creation and management
- QR code generation
- Share link management
- Bulk crew sharing operations

## Security Model

### Token Security
- **Unique Tokens**: Each share has a cryptographically secure unique token
- **No Reuse**: Tokens are never reused across shares
- **Expiration**: Optional time-based expiration
- **Revocation**: Immediate deactivation capability

### Access Control
- **Read-Only**: Shared scripts are always read-only
- **Department Filtering**: Users see only relevant departments
- **Permission Levels**: Configurable view/download permissions
- **IP Tracking**: Access monitoring for security

### Privacy Protection
- **Minimal Data**: Shared views contain only necessary information
- **No Personal Data**: Crew member personal information protected
- **Audit Compliance**: Complete access logging for security audits

## API Endpoints (Planned Implementation)

### Script Share Management

#### Create Share
```http
POST /api/scripts/{script_id}/shares
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
    "shared_with_user_id": "uuid",
    "permissions": {"view": true, "download": false},
    "expires_at": "2025-12-31T23:59:59Z",
    "share_name": "Lighting Crew Access",
    "notes": "Access for lighting team during tech week"
}
```

#### List Shares
```http
GET /api/scripts/{script_id}/shares
Authorization: Bearer {jwt_token}

Response: ScriptShareListResponse
```

#### Update Share
```http
PATCH /api/scripts/{script_id}/shares/{share_id}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
    "permissions": {"view": true, "download": true},
    "is_active": false
}
```

#### Delete Share
```http
DELETE /api/scripts/{script_id}/shares/{share_id}
Authorization: Bearer {jwt_token}
```

### Public Access Endpoints

#### Access Shared Script
```http
GET /api/public/shared-scripts/{share_token}

Response: SharedScriptAccessResponse
```

#### Validate Share Token
```http
GET /api/public/shared-scripts/{share_token}/validate

Response: TokenValidationResponse
```

## User Interface Components

### Share Creation Modal
**Location**: Planned in `frontend/src/features/script/components/modals/`

**Features**:
- User selection from show crew
- Permission configuration
- Expiration date picker
- Share name and notes
- Bulk creation for departments

### Share Management View
**Location**: Planned as part of script toolbar

**Features**:
- List of active shares
- Quick actions (revoke, extend, modify)
- Usage statistics
- QR code generation
- Share link copying

### Share Access View
**Location**: Planned public page

**Features**:
- Script display optimized for crew access
- Department filtering
- Mobile-responsive design
- No authentication required
- Print-friendly formatting

## QR Code Integration

### Generation
- QR codes contain share URLs for easy mobile access
- Generated on-demand for each share
- Includes basic error correction
- Optimized for various screen sizes

### Display Options
- Modal overlay with QR code
- Printable QR code sheets
- Email embedding
- Integration with share management interface

### Mobile Access
- QR codes link directly to mobile-optimized script view
- Touch-friendly navigation
- Offline capability for downloaded scripts
- Progressive web app features

## Workflow Examples

### Basic Share Creation
1. **Open Script**: Navigate to script in Edit or View mode
2. **Access Sharing**: Click sharing button in toolbar
3. **Select Crew**: Choose crew members from show assignments
4. **Configure Access**: Set permissions and expiration
5. **Generate Shares**: Create individual access tokens
6. **Distribute**: Send links or QR codes to crew

### Bulk Crew Sharing
1. **Show Integration**: Access crew from show management
2. **Department Selection**: Choose relevant departments
3. **Batch Creation**: Generate shares for all crew members
4. **Custom Permissions**: Set department-specific access
5. **Notification**: Automated email distribution (future)

### Share Management
1. **Monitor Usage**: View access statistics and recent activity
2. **Modify Access**: Update permissions or extend expiration
3. **Revoke Access**: Immediately deactivate problematic shares
4. **Audit Review**: Export access logs for security review

## Integration Points

### Show Management
- **Crew Assignment**: Automatic crew member selection
- **Department Context**: Permission filtering by department
- **Show Dates**: Default expiration based on show schedule

### User Management
- **Guest Users**: Share access without full account creation
- **Crew Relationships**: Integration with crew assignment system
- **Permission Inheritance**: Role-based default permissions

### Script Elements
- **Department Filtering**: Show only relevant script elements
- **Time Filtering**: Configurable time range restrictions
- **Element Types**: Permission-based element visibility

## Performance Considerations

### Caching Strategy
- **Token Validation**: Cache valid tokens to reduce database load
- **Script Content**: Cache shared script views
- **Department Data**: Cache department mappings
- **User Information**: Cache crew member details

### Access Optimization
- **Mobile Performance**: Optimized for mobile data connections
- **Offline Support**: Progressive web app capabilities
- **Load Times**: Minimized initial page load
- **Responsive Design**: Adaptive to various screen sizes

### Security Performance
- **Rate Limiting**: Prevent abuse of public endpoints
- **Token Generation**: Efficient cryptographic token creation
- **Database Indexing**: Optimized queries for share lookups
- **Audit Efficiency**: Streamlined access logging

## Implementation Status

### ✅ Completed
- Database models and relationships
- Pydantic schemas for all operations
- Basic frontend service structure
- Security model design
- Database migrations

### 🔄 In Progress
- Backend API router implementation
- Frontend UI components
- QR code generation
- Integration testing

### 📋 Planned
- Email notification system
- Mobile app integration
- Advanced analytics dashboard
- Bulk management tools
- Enterprise security features

## Security Considerations

### Threat Model
- **Token Interception**: HTTPS enforcement and token rotation
- **Unauthorized Access**: IP-based monitoring and anomaly detection
- **Data Leakage**: Minimal data exposure and permission enforcement
- **Account Takeover**: Isolated share access without account compromise

### Compliance
- **Audit Requirements**: Complete access logging and reporting
- **Data Protection**: GDPR-compliant data handling
- **Industry Standards**: Theater industry security best practices
- **Access Controls**: Role-based permission model

### Monitoring
- **Access Patterns**: Anomaly detection for unusual access
- **Failed Attempts**: Security alerting for invalid tokens
- **Usage Analytics**: Performance and security metrics
- **Incident Response**: Automated threat response capabilities

## Future Enhancements

### Advanced Features
- **Real-time Updates**: Live script changes during performance
- **Collaborative Annotations**: Crew member notes and feedback
- **Version Control**: Share-specific script versions
- **Mobile App**: Dedicated crew member mobile application
- **Offline Sync**: Full offline script access capability

### Enterprise Features
- **SSO Integration**: Single sign-on for large organizations
- **Advanced Analytics**: Detailed usage and performance analytics
- **Custom Branding**: Organization-specific share page branding
- **API Extensions**: Third-party integration capabilities
- **White-label Options**: Fully customizable sharing platform

This script sharing system provides a robust foundation for secure, controlled script distribution while maintaining the flexibility needed for various theater production workflows and security requirements.