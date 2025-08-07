"""
Utility functions for script sharing functionality
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID
import secrets
import string
from urllib.parse import urljoin

from sqlalchemy.orm import Session
from models import ScriptShare, Script, ScriptElement, Department, User


class ScriptShareUtils:
    """Utility functions for script sharing operations"""
    
    @staticmethod
    def generate_secure_token(length: int = 64) -> str:
        """Generate a cryptographically secure random token"""
        alphabet = string.ascii_letters + string.digits + '-_'
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    @staticmethod
    def ensure_unique_token(db: Session, length: int = 64, max_attempts: int = 10) -> str:
        """Generate a unique token that doesn't exist in the database"""
        for _ in range(max_attempts):
            token = ScriptShareUtils.generate_secure_token(length)
            if not db.query(ScriptShare).filter(ScriptShare.share_token == token).first():
                return token
        
        # If we can't generate a unique token after max_attempts, use a longer token
        return ScriptShareUtils.generate_secure_token(length + 16)
    
    @staticmethod
    def build_share_url(token: str, base_url: str = "https://Cuebe.app") -> str:
        """Build a complete sharing URL from a token"""
        return urljoin(base_url.rstrip('/') + '/', f'shared/{token}')
    
    @staticmethod
    def get_default_expiration(days: int = 30) -> datetime:
        """Get a default expiration time (30 days from now)"""
        return datetime.now(timezone.utc) + timedelta(days=days)
    
    @staticmethod
    def filter_elements_by_departments(
        elements: List[ScriptElement],
        department_ids: Optional[List[UUID]]
    ) -> List[ScriptElement]:
        """Filter script elements by department IDs"""
        if not department_ids:
            return elements
        
        return [
            element for element in elements
            if element.department_id is None or element.department_id in department_ids
        ]
    
    @staticmethod
    def get_share_summary(script_share: ScriptShare, db: Session) -> Dict[str, Any]:
        """Get a summary of a script share for management interfaces"""
        script = db.query(Script).filter(Script.script_id == script_share.script_id).first()
        
        # Count total elements and filtered elements
        total_elements = db.query(ScriptElement).filter(
            ScriptElement.script_id == script_share.script_id,
            ScriptElement.is_active == True
        ).count()
        
        filtered_elements = total_elements
        if script_share.department_filter:
            filtered_elements = db.query(ScriptElement).filter(
                ScriptElement.script_id == script_share.script_id,
                ScriptElement.is_active == True,
                ScriptElement.department_id.in_(script_share.department_filter)
            ).count()
        
        # Get department names if filtering is applied
        department_names = []
        if script_share.department_filter:
            departments = db.query(Department).filter(
                Department.department_id.in_(script_share.department_filter)
            ).all()
            department_names = [dept.department_name for dept in departments]
        
        # Check if expired
        is_expired = (
            script_share.expires_at is not None and 
            script_share.expires_at <= datetime.now(timezone.utc)
        )
        
        return {
            "share_id": script_share.share_id,
            "script_name": script.script_name if script else "Unknown Script",
            "share_token": script_share.share_token,
            "share_name": script_share.share_name,
            "is_active": script_share.is_active,
            "is_expired": is_expired,
            "expires_at": script_share.expires_at,
            "access_count": script_share.access_count,
            "last_accessed_at": script_share.last_accessed_at,
            "department_filter": department_names if department_names else "All Departments",
            "permissions": script_share.permissions,
            "total_elements": total_elements,
            "filtered_elements": filtered_elements,
            "share_url": ScriptShareUtils.build_share_url(script_share.share_token),
            "date_created": script_share.date_created
        }
    
    @staticmethod
    def validate_department_access(
        user: User,
        department_ids: List[UUID],
        db: Session
    ) -> bool:
        """
        Validate that a user has access to create shares for specific departments
        This could be extended with more complex permission logic
        """
        # For now, we assume script owners can share with any department
        # In the future, this could check if the user has crew assignments
        # or management permissions for the specified departments
        return True
    
    @staticmethod
    def get_user_shareable_departments(user: User, script: Script, db: Session) -> List[Dict[str, Any]]:
        """Get departments that a user can share a script with"""
        # Get all departments owned by the same user as the script
        departments = db.query(Department).filter(
            Department.owner_id == script.owner_id
        ).order_by(Department.department_name).all()
        
        return [
            {
                "department_id": str(dept.department_id),
                "department_name": dept.department_name,
                "department_color": dept.department_color,
                "department_initials": dept.department_initials
            }
            for dept in departments
        ]
    
    @staticmethod
    def create_department_specific_shares(
        script_id: UUID,
        department_ids: List[UUID],
        user: User,
        db: Session,
        base_permissions: Dict[str, bool] = None,
        expires_at: Optional[datetime] = None,
        share_name_prefix: str = "Auto-generated"
    ) -> List[ScriptShare]:
        """Create individual shares for multiple departments"""
        if base_permissions is None:
            base_permissions = {"view": True, "download": False}
        
        shares = []
        for dept_id in department_ids:
            # Get department name for share naming
            department = db.query(Department).filter(Department.department_id == dept_id).first()
            dept_name = department.department_name if department else f"Department {dept_id}"
            
            share = ScriptShare(
                script_id=script_id,
                created_by=user.user_id,
                share_token=ScriptShareUtils.ensure_unique_token(db),
                department_filter=[dept_id],  # Single department filter
                permissions=base_permissions,
                expires_at=expires_at,
                share_name=f"{share_name_prefix} - {dept_name}",
                notes=f"Auto-generated share for {dept_name} department"
            )
            
            db.add(share)
            shares.append(share)
        
        db.commit()
        for share in shares:
            db.refresh(share)
        
        return shares
    
    @staticmethod
    def revoke_expired_shares(db: Session) -> int:
        """Revoke all expired shares and return count of revoked shares"""
        now = datetime.now(timezone.utc)
        
        updated_count = db.query(ScriptShare).filter(
            ScriptShare.expires_at <= now,
            ScriptShare.is_active == True
        ).update({
            ScriptShare.is_active: False,
            ScriptShare.date_updated: now
        })
        
        db.commit()
        return updated_count
    
    @staticmethod
    def get_share_analytics(script_id: UUID, db: Session) -> Dict[str, Any]:
        """Get analytics data for script sharing"""
        shares = db.query(ScriptShare).filter(ScriptShare.script_id == script_id).all()
        
        now = datetime.now(timezone.utc)
        
        total_shares = len(shares)
        active_shares = sum(1 for share in shares if share.is_active and (
            share.expires_at is None or share.expires_at > now
        ))
        expired_shares = sum(1 for share in shares if share.expires_at and share.expires_at <= now)
        revoked_shares = sum(1 for share in shares if not share.is_active)
        total_accesses = sum(share.access_count for share in shares)
        
        # Get most accessed share
        most_accessed = max(shares, key=lambda s: s.access_count) if shares else None
        
        # Get recent activity (last 7 days)
        recent_cutoff = now - timedelta(days=7)
        recent_accesses = sum(
            share.access_count for share in shares 
            if share.last_accessed_at and share.last_accessed_at > recent_cutoff
        )
        
        return {
            "total_shares": total_shares,
            "active_shares": active_shares,
            "expired_shares": expired_shares,
            "revoked_shares": revoked_shares,
            "total_accesses": total_accesses,
            "recent_accesses": recent_accesses,
            "most_accessed_share": {
                "share_name": most_accessed.share_name,
                "access_count": most_accessed.access_count
            } if most_accessed else None
        }