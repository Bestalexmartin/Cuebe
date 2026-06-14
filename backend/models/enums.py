# backend/models/enums.py

import enum


class ElementType(str, enum.Enum):
    """Types of script elements"""
    CUE = "CUE"
    NOTE = "NOTE"
    GROUP = "GROUP"

class TriggerType(str, enum.Enum):
    """How script elements are triggered"""
    MANUAL = "MANUAL"
    TIME = "TIME"
    AUTO = "AUTO"
    FOLLOW = "FOLLOW"
    GO = "GO"
    STANDBY = "STANDBY"

class ExecutionStatus(str, enum.Enum):
    """Current execution status of script elements"""
    PENDING = "PENDING"
    READY = "READY"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"
    FAILED = "FAILED"

class PriorityLevel(str, enum.Enum):
    """Priority levels for script elements"""
    SAFETY = "SAFETY"
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"
    OPTIONAL = "OPTIONAL"

class AccessRole(str, enum.Enum):
    """Blok 5-tier access tier (Layer 1): can this account reach a program capability.

    Ordered by privilege: SUPER_ADMIN > ADMIN > MANAGER > USER > GUEST.
    ADMIN and MANAGER are reserved for future multi-tenant use.
    """
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    USER = "USER"
    GUEST = "GUEST"


class ProductionRole(str, enum.Enum):
    """Production role (Layer 3): what job a person does on a show.

    Pure domain data; carries no access meaning. Formerly named UserRole.
    """
    CREW = "CREW"
    ASSISTANT_DIRECTOR = "ASSISTANT_DIRECTOR"
    STAGE_MANAGER = "STAGE_MANAGER"
    ASSISTANT_STAGE_MANAGER = "ASSISTANT_STAGE_MANAGER"
    TECHNICAL_DIRECTOR = "TECHNICAL_DIRECTOR"
    LIGHTING_DESIGNER = "LIGHTING_DESIGNER"
    SOUND_DESIGNER = "SOUND_DESIGNER"
    PROPS_MASTER = "PROPS_MASTER"
    ELECTRICIAN = "ELECTRICIAN"
    SOUND_TECHNICIAN = "SOUND_TECHNICIAN"
    PROJECTIONIST = "PROJECTIONIST"
    RECORDIST = "RECORDIST"
    LEAD_AUDIO = "LEAD_AUDIO"
    LEAD_VIDEO = "LEAD_VIDEO"
    GRAPHICS = "GRAPHICS"
    FLY_OPERATOR = "FLY_OPERATOR"
    CARPENTER = "CARPENTER"
    PRODUCER = "PRODUCER"
    DIRECTOR = "DIRECTOR"
    OTHER = "OTHER"

class LocationArea(str, enum.Enum):
    """Theater location areas"""
    STAGE_LEFT = "STAGE_LEFT"
    STAGE_RIGHT = "STAGE_RIGHT"
    CENTER_STAGE = "CENTER_STAGE"
    UPSTAGE = "UPSTAGE"
    DOWNSTAGE = "DOWNSTAGE"
    STAGE_LEFT_UP = "STAGE_LEFT_UP"
    STAGE_RIGHT_UP = "STAGE_RIGHT_UP"
    STAGE_LEFT_DOWN = "STAGE_LEFT_DOWN"
    STAGE_RIGHT_DOWN = "STAGE_RIGHT_DOWN"
    FLY_GALLERY = "FLY_GALLERY"
    BOOTH = "BOOTH"
    HOUSE = "HOUSE"
    BACKSTAGE = "BACKSTAGE"
    WINGS_LEFT = "WINGS_LEFT"
    WINGS_RIGHT = "WINGS_RIGHT"
    GRID = "GRID"
    TRAP = "TRAP"
    PIT = "PIT"
    LOBBY = "LOBBY"
    DRESSING_ROOM = "DRESSING_ROOM"
    OTHER = "OTHER"


class UserStatus(str, enum.Enum):
    """User authentication status"""
    GUEST = "GUEST"         # Created by someone else, no Clerk account
    VERIFIED = "VERIFIED"   # Has Clerk account and can log in

class ScriptStatus(str, enum.Enum):
    """Script workflow status"""
    DRAFT = "DRAFT"
    COPY = "COPY"
    WORKING = "WORKING"
    FINAL = "FINAL"
    IMPORTED = "IMPORTED"
    BACKUP = "BACKUP"
