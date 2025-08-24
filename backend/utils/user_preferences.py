# backend/utils/user_preferences.py

from typing import Dict, Any

# User preference bit positions
USER_PREFERENCE_BITS = {
    'dark_mode': 0,              # bit position 0 (0=light, 1=dark)
    'colorize_dep_names': 1,      # bit position 1
    'auto_sort_cues': 2,          # bit position 2
    'show_clock_times': 3,        # bit position 3
    'use_military_time': 4,       # bit position 4 (0=12hr, 1=24hr)
    'danger_mode': 5,            # bit position 5 (0=safe, 1=danger)
    # bit positions 6+ available for future preferences
}

# Default preferences (dark_mode=False, colorize_dep_names=True, auto_sort_cues=True, show_clock_times=False, use_military_time=False, danger_mode=False)
DEFAULT_PREFERENCES_BITMAP = 6  # 0b000110 = dark_mode(0) + colorize_dep_names(1) + auto_sort_cues(1) + show_clock_times(0) + use_military_time(0) + danger_mode(0)


def set_bit(bitmap: int, bit_position: int, value: bool) -> int:
    """Set a specific bit in the bitmap to the given boolean value."""
    if value:
        return bitmap | (1 << bit_position)
    else:
        return bitmap & ~(1 << bit_position)


def get_bit(bitmap: int, bit_position: int) -> bool:
    """Get the boolean value of a specific bit in the bitmap."""
    return bool(bitmap & (1 << bit_position))


def bitmap_to_preferences(bitmap: int) -> Dict[str, bool]:
    """Convert a bitmap integer to a preferences dictionary."""
    if bitmap is None:
        bitmap = DEFAULT_PREFERENCES_BITMAP
    
    preferences = {}
    for key, bit_position in USER_PREFERENCE_BITS.items():
        preferences[key] = get_bit(bitmap, bit_position)
    
    return preferences


def preferences_to_bitmap_updates(current_bitmap: int, preference_updates: Dict[str, Any]) -> int:
    """
    Apply preference updates to the current bitmap.
    Only processes boolean values for known preference keys.
    """
    if current_bitmap is None:
        current_bitmap = DEFAULT_PREFERENCES_BITMAP
    
    updated_bitmap = current_bitmap
    
    for key, value in preference_updates.items():
        if key in USER_PREFERENCE_BITS and isinstance(value, bool):
            bit_position = USER_PREFERENCE_BITS[key]
            updated_bitmap = set_bit(updated_bitmap, bit_position, value)
    
    return updated_bitmap


def validate_preferences(preferences: Dict[str, Any]) -> Dict[str, str]:
    """
    Validate preference updates and return any error messages.
    Returns empty dict if all preferences are valid.
    """
    errors = {}
    
    for key, value in preferences.items():
        if key not in USER_PREFERENCE_BITS:
            errors[key] = f"Unknown preference: {key}"
        elif not isinstance(value, bool):
            errors[key] = f"Preference '{key}' must be a boolean value, got {type(value).__name__}"
    
    return errors


def get_default_preferences() -> Dict[str, bool]:
    """Get the default preferences as a dictionary."""
    return bitmap_to_preferences(DEFAULT_PREFERENCES_BITMAP)