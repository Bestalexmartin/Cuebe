# backend/routers/script_elements/helpers.py

from sqlalchemy.orm import Session
from typing import List
import models

def _auto_populate_show_start_duration(db: Session, script: models.Script, elements: List[models.ScriptElement]):
    """Auto-populate SHOW START duration based on script start and end times."""
    
    if script.start_time is None or script.end_time is None:
        return
    
    # Calculate duration between script start and end times
    duration_delta = script.end_time - script.start_time
    duration_seconds = int(duration_delta.total_seconds())
    
    if duration_seconds <= 0:
        return
    
    # Find SHOW START element
    show_start_element = None
    for element in elements:
        if (element.description is not None and 
            element.description.upper() == 'SHOW START'):
            show_start_element = element
            break
    
    if not show_start_element:
        return
    
    # Update duration if it's different from calculated duration
    if show_start_element.duration != duration_seconds:
        show_start_element.duration = duration_seconds
        db.commit()