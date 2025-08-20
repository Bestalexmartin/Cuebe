#!/usr/bin/env python3

import csv
from datetime import timedelta

def format_time(seconds):
    """Convert seconds to MM:SS format"""
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}:{secs:02d}"

def generate_large_script_csv():
    """Generate a CSV with 500 cues organized in groups"""
    
    departments = ['Lighting', 'Sound', 'Video', 'Properties', 'Scenic']
    priorities = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL']
    
    cue_types = {
        'Lighting': ['LX', 'Follow spot', 'Color change', 'Blackout', 'Strobe', 'Haze', 'Special effect'],
        'Sound': ['SFX', 'Music', 'Microphone', 'Playback', 'Live mix', 'Effects', 'Ambience'],
        'Video': ['Video', 'Projection', 'Media', 'Graphics', 'Display', 'Screen', 'Animation'],
        'Properties': ['Props', 'Set piece', 'Costume', 'Hand prop', 'Furniture', 'Decoration'],
        'Scenic': ['Fly', 'Deck', 'Turntable', 'Platform', 'Curtain', 'Backdrop']
    }
    
    actions = {
        'Lighting': ['fade in', 'fade out', 'snap on', 'snap off', 'color shift', 'intensity bump', 'follow', 'strobe', 'chase', 'special'],
        'Sound': ['play', 'stop', 'fade in', 'fade out', 'crossfade', 'loop', 'trigger', 'mute', 'unmute', 'adjust'],
        'Video': ['play', 'stop', 'transition', 'overlay', 'background', 'foreground', 'animate', 'scale', 'rotate', 'fade'],
        'Properties': ['move', 'set', 'strike', 'reset', 'adjust', 'prepare', 'store', 'activate', 'secure', 'check'],
        'Scenic': ['fly in', 'fly out', 'move', 'rotate', 'raise', 'lower', 'open', 'close', 'reveal', 'conceal']
    }

    rows = []
    current_time = 0
    cue_counter = 1
    
    # Header
    rows.append(['Time', 'Type', 'Element Name', 'Description', 'Group Path', 'Department', 'Priority'])
    
    # Generate 5 acts with varying scenes
    for act in range(1, 6):
        # Act header
        act_time = format_time(current_time)
        rows.append([act_time, 'GROUP', f'Act {act}', f'Act {act} content', f'Act {act}', '', 'NORMAL'])
        current_time += 5
        
        # 3-5 scenes per act
        scenes_in_act = 4 if act <= 3 else 3
        for scene in range(1, scenes_in_act + 1):
            # Scene header
            scene_time = format_time(current_time)
            scene_desc = f'Scene {scene} of Act {act}'
            rows.append([scene_time, 'GROUP', f'Scene {scene}', scene_desc, f'Act {act}/Scene {scene}', '', 'NORMAL'])
            current_time += 5
            
            # 15-25 cues per scene
            cues_in_scene = 20 + (scene % 5)  # Vary cue count
            for cue in range(cues_in_scene):
                dept = departments[cue_counter % len(departments)]
                cue_type = cue_types[dept][cue_counter % len(cue_types[dept])]
                action = actions[dept][cue_counter % len(actions[dept])]
                priority = priorities[cue_counter % len(priorities)]
                
                cue_time = format_time(current_time)
                cue_name = f'{cue_type} {cue_counter}'
                description = f'{cue_type} {action} - cue {cue_counter}'
                group_path = f'Act {act}/Scene {scene}'
                
                rows.append([cue_time, 'CUE', cue_name, description, group_path, dept, priority])
                
                current_time += 3 + (cue_counter % 10)  # Vary timing
                cue_counter += 1
                
                # Stop when we reach 500 cues (excluding groups)
                if cue_counter > 500:
                    break
            
            if cue_counter > 500:
                break
        
        if cue_counter > 500:
            break
    
    return rows

# Generate and write the CSV
if __name__ == '__main__':
    rows = generate_large_script_csv()
    
    with open('/Users/alex/Projects/Cuebe/performance_test_500_cues.csv', 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerows(rows)
    
    print(f"Generated CSV with {len(rows) - 1} total rows")
    cue_rows = sum(1 for row in rows[1:] if row[1] == 'CUE')
    group_rows = sum(1 for row in rows[1:] if row[1] == 'GROUP')
    print(f"- {cue_rows} CUE elements")
    print(f"- {group_rows} GROUP elements")