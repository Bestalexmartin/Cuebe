# backend/utils/datetime_utils.py

from datetime import datetime
from typing import Union, Optional

def parse_iso_datetime(iso_string: Union[str, datetime, None]) -> Optional[datetime]:
    """
    Central utility for parsing ISO 8601 datetime strings from frontend.
    Handles the common pattern of Z-suffix replacement for fromisoformat compatibility.
    
    Args:
        iso_string: ISO datetime string, datetime object, or None
        
    Returns:
        datetime object or None if input is None/invalid
    """
    if iso_string is None:
        return None
        
    if isinstance(iso_string, datetime):
        return iso_string
        
    if not isinstance(iso_string, str):
        return None
        
    try:
        # Handle Z suffix (UTC) - replace with explicit UTC offset for fromisoformat
        if iso_string.endswith('Z'):
            iso_string = iso_string.replace('Z', '+00:00')
        
        return datetime.fromisoformat(iso_string)
    except (ValueError, TypeError):
        return None