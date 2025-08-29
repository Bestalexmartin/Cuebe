# backend/routers/script_elements/__init__.py
# 
# Import router for backwards compatibility with existing imports
# e.g., `from routers.script_elements import router`

from .routes import router
from .processors import (
    _process_update_script_info_operation,
    _process_bulk_reorder_operation,
    _process_create_group_operation,
    _process_ungroup_elements_operation,
    _process_update_element_operation
)

__all__ = [
    "router",
    "_process_update_script_info_operation",
    "_process_bulk_reorder_operation", 
    "_process_create_group_operation",
    "_process_ungroup_elements_operation",
    "_process_update_element_operation"
]