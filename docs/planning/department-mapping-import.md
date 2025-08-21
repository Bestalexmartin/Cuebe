# Department Mapping for Script Import

## Overview

When importing scripts via CSV, users often have department names that don't exactly match their existing department taxonomy. Rather than automatically creating new departments (which leads to taxonomy pollution), we need an intelligent mapping interface that allows users to:

1. Map incoming departments to existing ones
2. Create new departments when appropriate
3. Remember these mappings for future imports

## User Experience Design

### Import Flow Enhancement
The current import flow will be enhanced with a new department mapping step:

```
Upload CSV → Parse → Department Mapping → Preview → Import
```

### Department Mapping Interface

**Two-Column Drag-and-Drop Design:**
- **Left Column**: "Unmapped Departments" - Incoming departments that don't exactly match existing ones
- **Right Column**: "Your Departments" - User's existing departments, sorted by similarity score

**User Actions:**
- **Drag from left to right**: Map incoming department to existing one
- **Leave on left**: Create new department with incoming name
- **Visual feedback**: Clear drop zones, highlighting, confirmation states

**Smart Suggestions:**
- Existing departments in right column are sorted by similarity to each unmapped department
- Top suggestions are highlighted or visually emphasized
- Similarity scores could be shown to help user decisions

### Persistent Learning
- User mapping choices are stored in database
- Future imports automatically apply these mappings
- Users can view/edit their mapping preferences in settings
- Mappings are user-specific (not global)

## Algorithm Options for Fuzzy Matching

### 1. Levenshtein Distance
**How it works:** Calculates minimum number of single-character edits (insertions, deletions, substitutions) needed to transform one string into another.

**Pros:**
- Simple to understand and implement
- Good for catching typos and minor variations
- Fast computation

**Cons:**
- Doesn't handle word reordering well
- Doesn't account for semantic meaning

**Example:**
- "SOUND" → "AUDIO": Distance = 5 (completely different)
- "LIGHTING" → "LIGHTS": Distance = 3 (good match)

### 2. Jaro-Winkler Distance
**How it works:** Measures similarity based on common characters and their positions, with extra weight given to common prefixes.

**Pros:**
- Better for names and proper nouns
- Gives bonus for matching prefixes
- More nuanced than pure edit distance

**Cons:**
- More complex to implement
- Still doesn't handle synonyms

**Example:**
- "LX" → "LIGHTING": Low similarity (different lengths)
- "WARDROBE" → "COSTUMES": Low similarity

### 3. Token-Based Similarity (Jaccard/Cosine)
**How it works:** Breaks strings into tokens (words) and measures overlap. Jaccard uses set intersection, Cosine uses vector similarity.

**Pros:**
- Handles word reordering
- Good for multi-word departments
- Can weight important words

**Cons:**
- Requires tokenization logic
- May miss single-character abbreviations

**Example:**
- "SOUND DESIGN" → "AUDIO DESIGN": High similarity (shared "DESIGN")
- "FOH" → "FRONT OF HOUSE": Low similarity without preprocessing

### 4. Hybrid Approach with Abbreviation Mapping
**How it works:** Combines multiple algorithms with domain-specific knowledge.

**Components:**
- **Abbreviation dictionary**: "LX"→"LIGHTING", "FOH"→"FRONT OF HOUSE", "SM"→"STAGE MANAGEMENT"
- **Synonym mapping**: "SOUND"→"AUDIO", "COSTUMES"→"WARDROBE"
- **Primary algorithm**: Jaro-Winkler for general matching
- **Fallback**: Levenshtein for short strings

**Pros:**
- Handles theater-specific terminology
- Most accurate for domain use case
- Can be tuned over time

**Cons:**
- More complex implementation
- Requires domain knowledge maintenance

## Recommended Implementation

### Phase 1: Simple Levenshtein with Threshold
Start with Levenshtein distance and a similarity threshold (e.g., 0.7). This covers the most common cases:
- Typos: "LIGHITNG" → "LIGHTING"
- Case differences: "sound" → "SOUND"
- Minor variations: "LIGHTS" → "LIGHTING"

### Phase 2: Add Theater-Specific Mappings
Expand with common theater abbreviations and synonyms:
```javascript
const theaterMappings = {
  'LX': 'LIGHTING',
  'SFX': 'SOUND',
  'FOH': 'FRONT OF HOUSE',
  'SM': 'STAGE MANAGEMENT',
  'COSTUMES': 'WARDROBE',
  'AUDIO': 'SOUND'
};
```

### Phase 3: Machine Learning (Future)
Eventually could learn from user mapping patterns to improve suggestions automatically.

## Data Storage

### User Department Mappings Table
```sql
CREATE TABLE user_department_mappings (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  incoming_name VARCHAR NOT NULL,
  mapped_to_department_id UUID REFERENCES departments(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, incoming_name)
);
```

### Usage Tracking (Optional)
Track mapping frequency to improve algorithm suggestions:
```sql
CREATE TABLE department_mapping_analytics (
  id UUID PRIMARY KEY,
  incoming_name VARCHAR NOT NULL,
  mapped_name VARCHAR NOT NULL,
  frequency INTEGER DEFAULT 1,
  last_used TIMESTAMP DEFAULT NOW()
);
```

## Technical Implementation Plan

### 1. Backend Changes
- Add fuzzy matching utility functions
- Extend import API to handle department mapping
- Create department mapping persistence endpoints
- Add department mapping analytics (optional)

### 2. Frontend Changes
- Add new step to ScriptImportModal flow
- Create DepartmentMappingStep component with drag-and-drop
- Implement fuzzy matching in frontend for real-time suggestions
- Add department mapping management to user settings

### 3. Testing Strategy
- Unit tests for fuzzy matching algorithms
- Integration tests for mapping persistence
- UX testing with real theater data
- Performance testing with large department lists

## Success Metrics

### User Experience
- Reduction in duplicate/similar departments created
- Time spent on department mapping step
- User adoption of mapping suggestions

### Data Quality
- Consistency of department naming across imports
- Reduction in orphaned/unused departments
- Accuracy of automatic mapping suggestions

## Future Enhancements

### Shared Mappings
- Optional: Allow users to contribute to community mapping database
- System-wide common mappings that benefit all users

### Batch Operations
- Allow users to map multiple similar departments at once
- "Apply to all similar" functionality

### Import Templates
- Save complete import configurations including department mappings
- Share import templates between users (with permission)

## Related Components

This feature will integrate with:
- **Script Import System**: Adds new step to import workflow
- **Department Management**: Leverages existing department CRUD operations
- **User Preferences**: Stores personal mapping choices
- **Analytics**: Potential for improving system-wide suggestions

## Risk Considerations

### Data Integrity
- Ensure mappings don't create circular references
- Handle edge cases where mapped departments are deleted
- Validate that mappings maintain referential integrity

### Performance
- Fuzzy matching algorithms can be computationally expensive
- May need caching for large department lists
- Consider debouncing for real-time suggestion updates

### User Confusion
- Clear visual feedback for mapping actions
- Undo functionality for incorrect mappings
- Documentation/help text for the mapping interface