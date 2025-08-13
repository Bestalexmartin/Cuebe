# Security Architecture Decisions

This document outlines key security design decisions made during Cuebe development, including the rationale and trade-offs considered.

## Script Sharing URL Authentication

### Problem Statement

When sharing scripts with crew members, we need to provide secure, convenient access without requiring individual user accounts for external crew members. Three approaches were considered:

1. **Bearer Token in URL**
2. **Signed URL (JWT-based)**  
3. **Scoped Token (Database-backed)**

### Analysis

#### Bearer Token Approach ❌

**Structure**: `https://domain.com/shared/{showId}?token={bearer-token}`

**Security Issues**:
- **High Risk**: URLs logged in server access logs, browser history, accidentally shared
- **No Revocation Control**: Cannot disable access for departing crew members
- **Token Hijacking**: Anyone with URL has full API access as that crew member
- **Persistent Access**: No automatic session timeout
- **Over-privileged**: Bearer token grants broader API access than needed
- **Exposed Structure**: URL reveals show ID and system structure

**Verdict**: Unacceptable security risk for production use.

#### Signed URL Approach ✅

**Structure**: `https://domain.com/shared/{signed-jwt-payload}`

**Example**: `https://cuebe.com/shared/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...`

**Advantages**:
- No database lookups required (stateless)
- Completely opaque URLs hide system structure
- Built-in expiration via JWT claims
- Cryptographically secure signatures
- Scalable (no database storage needed)

**Disadvantages**:
- Limited access tracking (only basic web server logs)
- Cannot differentiate individual crew member usage
- Difficult revocation (requires token blacklists or key rotation)
- No detailed audit trail for compliance
- Harder to detect abuse patterns

#### Scoped Token Approach ✅✅ (Selected)

**Structure**: `https://domain.com/shared/{opaque-token}`

**Example**: `https://cuebe.com/shared/cm_sh_4K9mP2xR8nQ7vL3w`

**Database Schema**:
```sql
CREATE TABLE crew_sharing_links (
    token_id UUID PRIMARY KEY,
    show_id UUID REFERENCES shows(show_id),
    user_id UUID REFERENCES users(user_id), 
    department_id UUID REFERENCES departments(department_id),
    token_hash VARCHAR NOT NULL UNIQUE,
    scopes JSON NOT NULL, -- ['view_shared_scripts']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(user_id)
);

CREATE TABLE crew_access_logs (
    log_id UUID PRIMARY KEY,
    token_id UUID REFERENCES crew_sharing_links(token_id),
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    resource_accessed VARCHAR,
    success BOOLEAN DEFAULT TRUE
);
```

**Advantages**:
- **Detailed Access Tracking**: Every request logs to `crew_access_logs`
- **Individual Usage Analytics**: Track which crew members access content when
- **Instant Revocation**: Disable `is_active` flag immediately blocks access
- **Compliance Ready**: Complete audit trail for sensitive productions
- **Abuse Detection**: Can spot unusual access patterns by IP, frequency, timing
- **Scoped Permissions**: Token only grants specific access (view shared scripts)
- **Department-based Access Control**: Permissions tied to crew member's department
- **Opaque URLs**: No system structure exposed

**Trade-offs**:
- Database lookup required on every request (minor performance impact)
- More complex implementation than signed URLs
- Database storage overhead

### Decision

**Selected: Scoped Token Approach**

**Primary Reasons**:
1. **Audit Requirements**: Theater productions often need detailed access logs for union compliance, content protection, and security audits
2. **Security Control**: Immediate revocation capability essential for crew changes during production
3. **Usage Analytics**: Directors and producers need visibility into script access patterns
4. **Abuse Prevention**: Can detect and prevent unauthorized sharing or excessive access

**Implementation Notes**:
- Token format: `cm_sh_` + 20-character random string  
- Default expiration: 30 days (configurable per production)
- Scoped to specific endpoints: `/api/shows/{showId}/shared-scripts`
- Access logging includes: timestamp, IP, user agent, resources accessed
- Administrative dashboard for viewing usage analytics and managing active tokens

### Future Considerations

- **Token Rotation**: Implement automatic token refresh for long-running productions
- **Geographic Restrictions**: Add IP-based access controls for international productions
- **Integration Alerts**: Notify production managers of unusual access patterns
- **Mobile App Integration**: Consider deep-linking support for mobile crew apps

---

*Last Updated: [Current Date]*
*Decision Status: Implemented*
*Review Date: [6 months from implementation]*