# Administration Dashboard Architecture

## Overview

The Cuebe Administration Dashboard will provide comprehensive system monitoring, analytics, and management capabilities for system administrators. This document outlines the architecture, security model, data collection requirements, and implementation strategy for a secure, scalable administrative interface.

## Security Architecture

### Multi-Factor Authentication Requirements

#### Primary Authentication: Hardware Security Keys
- **Yubikey FIDO2/WebAuthn** - Primary authentication method
- **Backup Yubikey** - Secondary device for redundancy
- **No SMS/TOTP fallback** - Hardware-only security for admin access

#### Implementation Strategy
```python
# Admin authentication flow
class AdminAuth:
    def __init__(self):
        self.webauthn = WebAuthnServer(
            rp_id="admin.cuebe.com",  # Separate subdomain
            rp_name="Cuebe Admin Dashboard"
        )
    
    async def verify_admin_access(self, user_id: str, webauthn_response: dict):
        # 1. Verify user is designated admin
        admin_user = await self.verify_admin_status(user_id)
        # 2. Verify hardware key authentication
        credential_verified = await self.webauthn.verify(webauthn_response)
        # 3. Create time-limited admin session
        return await self.create_admin_session(admin_user, credential_verified)
```

#### Admin User Model
```python
class AdminUser(BaseModel):
    user_id: UUID
    admin_level: AdminLevel  # SUPER_ADMIN, SYSTEM_MONITOR, READ_ONLY
    webauthn_credentials: List[WebAuthnCredential]
    last_admin_login: datetime
    admin_permissions: List[AdminPermission]
    session_timeout_minutes: int = 30  # Auto-logout
```

### Network Security

#### Admin Subdomain Isolation
- **Separate subdomain**: `admin.cuebe.com` 
- **IP Whitelist**: Restrict to known admin locations
- **VPN Requirement**: Optional additional layer for remote access
- **Rate Limiting**: Strict rate limits on admin endpoints

#### Session Security
```python
class AdminSession:
    session_id: str
    user_id: UUID
    created_at: datetime
    expires_at: datetime
    ip_address: str
    user_agent: str
    webauthn_credential_id: str
    permissions: List[AdminPermission]
    
    # Auto-expire after 30 minutes of inactivity
    # Require re-authentication for sensitive operations
```

## Data Collection & Analytics Architecture

### Application Analytics

#### User Behavior Tracking
```python
class UserAnalytics:
    # Session tracking
    session_id: str
    user_id: Optional[UUID]  # Null for guest users
    session_start: datetime
    session_end: Optional[datetime]
    pages_viewed: int
    actions_performed: int
    
    # Feature usage
    features_used: List[str]  # ['script_edit', 'crew_management', 'sharing']
    time_in_feature: Dict[str, int]  # seconds per feature
    
    # Performance metrics
    average_page_load_time: float
    api_calls_made: int
    errors_encountered: List[ErrorEvent]
```

#### Business Metrics Collection
```python
class BusinessMetrics:
    # User growth
    daily_signups: int
    monthly_active_users: int
    user_retention_rates: Dict[str, float]  # 7-day, 30-day, 90-day
    
    # Feature adoption
    feature_usage_stats: Dict[str, int]
    premium_feature_usage: Dict[str, int]
    
    # Content creation
    shows_created_daily: int
    scripts_created_daily: int
    collaboration_events: int  # Real-time editing sessions
```

### System Performance Monitoring

#### Real-Time Metrics Collection
```python
class SystemMetrics:
    # Server performance
    cpu_usage_percent: float
    memory_usage_percent: float
    disk_usage_percent: float
    active_connections: int
    
    # Database performance
    query_response_times: List[float]
    active_db_connections: int
    slow_queries: List[SlowQuery]
    
    # Cache performance
    redis_hit_rate: float
    cache_memory_usage: float
    cache_evictions_per_hour: int
    
    # WebSocket performance
    active_websocket_connections: int
    websocket_message_rate: float
    connection_duration_avg: float
```

#### Infrastructure Monitoring Integration
```python
# Integration with monitoring services
class InfrastructureMonitoring:
    # Docker/Container metrics
    container_health: Dict[str, ContainerStatus]
    resource_usage: Dict[str, ResourceUsage]
    
    # Network metrics
    request_latency: LatencyStats
    error_rates: ErrorRateStats
    throughput: ThroughputStats
    
    # External service health
    clerk_auth_status: ServiceHealth
    database_status: ServiceHealth
    redis_status: ServiceHealth
```

### Third-Party Data Integration

#### Google Analytics Integration
```python
class GoogleAnalyticsIntegration:
    def __init__(self, ga_credentials: str):
        self.analytics = build('analyticsreporting', 'v4', credentials=credentials)
    
    async def fetch_user_behavior(self, date_range: DateRange):
        """Fetch complementary data from Google Analytics"""
        return {
            'page_views': await self.get_page_views(date_range),
            'user_flows': await self.get_user_flows(date_range),
            'acquisition_sources': await self.get_acquisition_data(date_range),
            'device_breakdown': await self.get_device_data(date_range)
        }
    
    async def cross_reference_sessions(self):
        """Match GA sessions with our internal user data"""
        # Privacy-compliant session matching for registered users
        pass
```

#### Revenue Tracking Integration
```python
class RevenueAnalytics:
    # Subscription management
    stripe_integration: StripeAnalytics
    subscription_metrics: SubscriptionMetrics
    
    async def collect_revenue_data(self):
        return {
            'monthly_recurring_revenue': await self.calculate_mrr(),
            'churn_rate': await self.calculate_churn(),
            'lifetime_value': await self.calculate_ltv(),
            'conversion_rates': await self.calculate_conversions(),
            'payment_failures': await self.get_failed_payments()
        }
```

## Data Logging Requirements

### Application Event Logging

#### Structured Logging Format
```python
class AdminLogEntry:
    timestamp: datetime
    level: LogLevel  # DEBUG, INFO, WARN, ERROR, CRITICAL
    category: LogCategory  # SECURITY, PERFORMANCE, USER_ACTION, SYSTEM
    event_type: str
    user_id: Optional[UUID]
    session_id: Optional[str]
    details: Dict[str, Any]
    request_id: str
    ip_address: Optional[str]
```

#### Critical Events to Log
```python
# Security events
ADMIN_LOGIN_SUCCESS = "admin_login_success"
ADMIN_LOGIN_FAILURE = "admin_login_failure"
PERMISSION_ELEVATION = "permission_elevation"
SENSITIVE_DATA_ACCESS = "sensitive_data_access"

# Performance events
SLOW_QUERY_DETECTED = "slow_query_detected"
HIGH_MEMORY_USAGE = "high_memory_usage"
CACHE_MISS_SPIKE = "cache_miss_spike"

# Business events
USER_SIGNUP = "user_signup"
SUBSCRIPTION_CHANGE = "subscription_change"
FEATURE_USAGE = "feature_usage"
ERROR_OCCURRENCE = "error_occurrence"
```

### Privacy-Compliant Data Collection

#### Data Retention Policies
```python
class DataRetentionPolicy:
    # Personal data retention
    user_analytics_retention_days: int = 365
    session_data_retention_days: int = 90
    
    # System logs retention
    security_logs_retention_days: int = 2555  # 7 years for compliance
    performance_logs_retention_days: int = 180
    
    # Business metrics retention
    revenue_data_retention_years: int = 10  # Tax/legal requirements
    usage_analytics_retention_years: int = 3
```

#### Privacy Protection
```python
class PrivacyProtection:
    def anonymize_user_data(self, retention_period_expired: bool):
        """Remove PII from analytics after retention period"""
        if retention_period_expired:
            # Replace user_id with anonymous hash
            # Remove IP addresses, email domains
            # Keep aggregate statistics only
            pass
    
    def gdpr_compliance_export(self, user_id: UUID):
        """Generate complete data export for GDPR requests"""
        pass
```

## Dashboard Implementation

### Admin Schema Architecture

#### Separate Admin API Endpoints
```python
# Admin-only router with strict authentication
admin_router = APIRouter(
    prefix="/admin",
    dependencies=[Depends(require_admin_authentication)]
)

@admin_router.get("/system/health", response_model=SystemHealthReport)
async def get_system_health(admin_user: AdminUser = Depends(get_admin_user)):
    """Comprehensive system health dashboard"""
    pass

@admin_router.get("/analytics/users", response_model=UserAnalyticsReport)  
async def get_user_analytics(
    date_range: DateRange,
    admin_user: AdminUser = Depends(get_admin_user)
):
    """User behavior and growth analytics"""
    pass

@admin_router.get("/revenue/metrics", response_model=RevenueReport)
async def get_revenue_metrics(admin_user: AdminUser = Depends(get_admin_user)):
    """Financial performance metrics"""
    pass
```

#### Admin-Only Response Models
```python
class SystemHealthReport(BaseModel):
    server_status: ServerStatus
    database_metrics: DatabaseMetrics
    cache_performance: CacheMetrics
    websocket_stats: WebSocketStats
    error_summary: ErrorSummary
    alert_count: int

class UserAnalyticsReport(BaseModel):
    daily_active_users: int
    monthly_active_users: int
    new_signups: int
    retention_rates: RetentionMetrics
    feature_usage: Dict[str, int]
    session_analytics: SessionMetrics

class RevenueReport(BaseModel):
    monthly_recurring_revenue: Decimal
    total_subscriptions: int
    churn_rate: float
    conversion_metrics: ConversionMetrics
    payment_health: PaymentHealthMetrics
```

### Frontend Architecture

#### Admin Dashboard SPA
```typescript
// Separate admin frontend application
interface AdminDashboard {
  // Real-time monitoring
  systemHealth: SystemHealthWidget;
  performanceCharts: PerformanceChartsWidget;
  
  // User analytics
  userGrowthCharts: UserGrowthWidget;
  featureUsageHeatmap: FeatureUsageWidget;
  sessionAnalytics: SessionAnalyticsWidget;
  
  // Revenue tracking
  revenueCharts: RevenueWidget;
  subscriptionMetrics: SubscriptionWidget;
  
  // System management
  userManagement: UserManagementWidget;
  systemLogs: LogViewerWidget;
  alertsCenter: AlertsCenterWidget;
}
```

## Implementation Phases

### Phase 1: Security Foundation
1. **WebAuthn implementation** with Yubikey support
2. **Admin user model** and database schema
3. **Session management** with time-based expiration
4. **Admin subdomain** setup and network security

### Phase 2: Core Analytics
1. **System metrics collection** (CPU, memory, DB performance)
2. **User session tracking** implementation  
3. **Feature usage analytics** collection
4. **Basic admin dashboard** with real-time health monitoring

### Phase 3: Business Intelligence
1. **Google Analytics integration** for enhanced user behavior data
2. **Revenue tracking** and subscription analytics
3. **Advanced reporting** with historical trends
4. **Alert system** for critical metrics

### Phase 4: Advanced Features
1. **Predictive analytics** for user churn and growth
2. **Performance optimization** recommendations
3. **Automated scaling** triggers based on metrics
4. **Compliance reporting** for data protection requirements

## Security Considerations

### Data Access Logging
- **All admin actions logged** with full audit trail
- **Data access tracking** for compliance requirements
- **Regular security reviews** of admin access patterns

### Incident Response
```python
class SecurityIncident:
    incident_id: str
    severity: IncidentSeverity
    detected_at: datetime
    admin_notified: bool
    automated_response: List[str]  # Account locks, IP blocks, etc.
    manual_investigation_required: bool
```

This architecture provides a comprehensive, secure foundation for system administration while maintaining user privacy and enabling data-driven decision making for the Cuebe platform.