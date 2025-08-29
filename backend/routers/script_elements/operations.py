# backend/routers/script_elements/operations.py - STRIPPED FOR REBUILD

from fastapi import HTTPException
from sqlalchemy.orm import Session
import schemas
from uuid import UUID
import models

import logging
logger = logging.getLogger(__name__)


def batch_update_from_edit_queue(
    script_id: UUID,
    batch_request: schemas.EditQueueBatchRequest, 
    user: models.User,
    db: Session
):
    """Process a batch of edit queue operations - EXPANDED SUPPORT"""
    logger.info(f"Processing {len(batch_request.operations)} operations for script {script_id}")
    
    from .processors import (
        _process_update_script_info_operation,
        _process_update_element_operation, 
        _process_bulk_reorder_operation,
        _process_create_group_operation,
        _process_ungroup_elements_operation,
        _process_create_element_operation,
        _process_delete_element_operation,
        _process_reorder_operation
    )
    
    results = []
    
    try:
        for operation in batch_request.operations:
            op_type = operation.get("type", "UNKNOWN")
            op_description = operation.get("description", "No description")
            logger.info(f"Processing operation: {op_type} - {op_description}")
            
            if op_type == "UPDATE_SCRIPT_INFO":
                result = _process_update_script_info_operation(db, script_id, operation, user)
                results.append({"operation": op_type, "status": "success", "details": result})
                logger.info(f"Script metadata updated: {result}")
                
            elif op_type == "UPDATE_ELEMENT":
                result = _process_update_element_operation(db, script_id, operation, user)
                results.append({"operation": op_type, "status": "success", "details": result})
                logger.info(f"Element updated: {result}")
                
            elif op_type == "BULK_REORDER":
                result = _process_bulk_reorder_operation(db, script_id, operation, user)
                results.append({"operation": op_type, "status": "success", "details": result})
                logger.info(f"Bulk reorder completed: {result}")
                
            elif op_type == "CREATE_GROUP":
                result = _process_create_group_operation(db, script_id, operation, user)
                results.append({"operation": op_type, "status": "success", "details": result})
                logger.info(f"Group created: {result}")
                
            elif op_type == "UNGROUP_ELEMENTS":
                result = _process_ungroup_elements_operation(db, script_id, operation, user)
                results.append({"operation": op_type, "status": "success", "details": result})
                logger.info(f"Elements ungrouped: {result}")
                
            elif op_type == "CREATE_ELEMENT":
                result = _process_create_element_operation(db, script_id, operation, user)
                results.append({"operation": op_type, "status": "success", "details": result})
                logger.info(f"Element created: {result}")
                
            elif op_type == "DELETE_ELEMENT":
                result = _process_delete_element_operation(db, script_id, operation, user)
                results.append({"operation": op_type, "status": "success", "details": result})
                logger.info(f"Element deleted: {result}")
                
            elif op_type == "REORDER":
                result = _process_reorder_operation(db, script_id, operation, user)
                results.append({"operation": op_type, "status": "success", "details": result})
                logger.info(f"Element reordered: {result}")
                
            elif op_type in ["ENABLE_AUTO_SORT", "DISABLE_AUTO_SORT"]:
                # These are handled client-side for preferences, but we can acknowledge them
                result = {"preference": "auto_sort", "enabled": op_type == "ENABLE_AUTO_SORT"}
                results.append({"operation": op_type, "status": "acknowledged", "details": result})
                logger.info(f"Auto-sort preference acknowledged: {result}")
                
            else:
                logger.info(f"Skipping operation type: {op_type} (not implemented yet)")
                results.append({"operation": op_type, "status": "skipped", "reason": "not implemented yet"})
        
        # Commit all changes
        db.commit()
        logger.info(f"Successfully processed {len(results)} operations for script {script_id}")
        
        return {
            "success": True,
            "message": f"Processed {len(results)} operations successfully",
            "script_id": str(script_id),
            "operations_count": len(results),
            "results": results
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing operations for script {script_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process operations: {str(e)}")