# The Case of the Vanishing Scripts: A Critical Data Loss Bug Investigation

## Overview

This document chronicles the investigation and resolution of a critical data loss bug where imported scripts would mysteriously disappear from the database when users accessed shared show pages. This bug was particularly insidious because it left no error traces, making it appear as if scripts had never existed.

## The Problem

**Symptom:** Scripts would vanish from the database entirely after being successfully imported and initially visible. The disappearance occurred when accessing the shared (scoped) version of a show via share tokens.

**Impact:** 
- Complete data loss of non-shared scripts
- No error messages or logs indicating the deletion
- Silent failure that could go unnoticed until users tried to access their work

## Investigation Timeline

### Initial Discovery
Users reported that scripts would "disappear" after accessing shared show pages. The behavior was consistent but mysterious:

1. Script import succeeded (confirmed via logs and database)
2. Script was visible and accessible on the authenticated side
3. User accessed shared page via share token
4. Script completely vanished from database

### Debug Strategy
To catch this elusive bug, we implemented comprehensive database logging:

```python
# Added to database.py
engine = create_engine(
    DATABASE_URL,
    echo=True,  # Log all SQL statements
    echo_pool=True,  # Log connection pool events
    pool_pre_ping=True
)

# Event listeners for transaction tracking
@event.listens_for(engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    logger.info(f"🔍 SQL EXECUTE: {statement}")
    if parameters:
        logger.info(f"🔍 SQL PARAMS: {parameters}")

@event.listens_for(engine, "commit")
def receive_commit(conn):
    logger.info("✅ DATABASE COMMIT")

@event.listens_for(engine, "rollback") 
def receive_rollback(conn):
    logger.info("❌ DATABASE ROLLBACK")
```

### The Smoking Gun
With comprehensive logging enabled, we traced the exact moment of script deletion:

```sql
-- Script elements being deleted
DELETE FROM "scriptElementsTable" 
WHERE "scriptElementsTable".element_id = %(element_id)s::UUID

-- Main script being deleted
DELETE FROM "scriptsTable" 
WHERE "scriptsTable".script_id = %(script_id)s::UUID

-- Transaction committed, making the deletion permanent
✅ DATABASE COMMIT
```

These DELETE statements were happening during shared page access, not from any explicit delete operation.

## Root Cause Analysis

The culprit was a seemingly innocent line in `backend/routers/show_sharing.py`:

```python
# DANGEROUS: This line caused data loss!
show.scripts = [script for script in show.scripts if script.is_shared]
```

**What went wrong:**

1. **SQLAlchemy Relationship Modification:** The code modified the `show.scripts` relationship in-place on a loaded SQLAlchemy object
2. **ORM Interpretation:** SQLAlchemy interpreted this as scripts being "removed" from the relationship
3. **Cascade Delete:** When the transaction committed, SQLAlchemy generated DELETE statements to "sync" the relationship changes to the database
4. **Silent Execution:** The deletes happened automatically as part of ORM relationship management, leaving no obvious trace

### The Deceptive Simplicity
This bug was particularly dangerous because:
- The filtering logic appeared correct and harmless
- No explicit `delete()` calls were made in the code
- SQLAlchemy's ORM behavior made the deletions appear "automatic"
- No exceptions or errors were thrown
- The shared page continued to work normally (just showing no scripts, which seemed expected)

## The Solution

**Fixed by creating a separate filtered list instead of modifying the ORM relationship:**

```python
# SAFE: Create new list, don't modify SQLAlchemy relationship
shared_scripts = [script for script in show.scripts if script.is_shared]

# Create a show copy with filtered scripts for response
show_copy = models.Show(
    show_id=show.show_id,
    show_name=show.show_name,
    # ... other fields ...
    venue=show.venue,
    scripts=shared_scripts  # Use filtered list
)

# Return the safe copy
return schemas.SharedShowResponse(shows=[show_copy], ...)
```

**Key principles applied:**
1. **Never modify SQLAlchemy relationships in-place** when you only want to filter for display
2. **Create separate data structures** for response filtering
3. **Preserve original database relationships** intact

## Lessons Learned

### Technical Lessons
1. **ORM Relationship Safety:** Modifying SQLAlchemy relationship collections can trigger unintended database operations
2. **Silent Failures:** The most dangerous bugs are those that fail silently without errors
3. **Comprehensive Logging:** Database-level logging was essential to catch this bug
4. **Separation of Concerns:** Display filtering should not modify persistent data structures

### Process Lessons
1. **Systematic Debugging:** A methodical, step-by-step reproduction process was crucial
2. **Logging Strategy:** Temporary comprehensive logging can reveal hidden behaviors
3. **Test Isolation:** Clean environment testing helped isolate the exact trigger

### Prevention Strategies
1. **Code Review Focus:** Pay special attention to any code that modifies ORM relationships
2. **Integration Testing:** Test shared/scoped functionality as part of the main workflow
3. **Database Monitoring:** Consider permanent monitoring for unexpected DELETE operations
4. **Documentation:** Document when relationship modifications are intentional vs. display-only

## Impact Assessment

**Before Fix:**
- Any access to shared pages caused permanent data loss
- Users could lose hours of work without knowing why
- No error messages or recovery path available

**After Fix:**
- Shared pages display only intended scripts without affecting database
- All original scripts remain intact
- No performance impact from the safer approach

## Conclusion

This investigation demonstrates how seemingly simple operations in ORMs can have profound and destructive consequences. A single line intended for display filtering became a data deletion mechanism due to SQLAlchemy's automatic relationship synchronization.

The fix preserves the intended functionality (showing only shared scripts on shared pages) while preventing the catastrophic side effect of actual data deletion. This case serves as a reminder that with great ORM power comes great responsibility for understanding the underlying database operations.

**Key Takeaway:** Always assume that modifying ORM relationship collections will trigger database changes, even when your intention is purely for display purposes.

---

*Documented: 2025-08-23*  
*Severity: Critical (Data Loss)*  
*Resolution: Complete*  
*Prevention: Code review guidelines updated*