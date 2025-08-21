#!/usr/bin/env python3

import csv
import argparse
import random
from datetime import timedelta

def format_time(seconds):
    """Convert seconds to MM:SS format"""
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}:{secs:02d}"

def generate_large_script_csv(num_cues=500):
    """Generate a CSV with specified number of cues organized in flat groups (no nesting)"""
    
    # Mix of standard departments and variations that will need mapping
    departments = [
        'Lighting', 'Sound', 'Video', 'Properties', 'Scenic',
        # Variations that should be mapped to existing departments
        'LX', 'Lights', 'Audio', 'SFX', 'Costumes', 'Costume', 
        'Scenery', 'SM', 'Projection', 'Special Effects', 'Pyrotechnics',
        # Some completely new ones that should create new departments
        'Hair & Makeup', 'Orchestra', 'Follow Spot', 'Rigging'
    ]
    priorities = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL']
    
    # Map department variations to cue types
    cue_types = {
        'Lighting': ['LX', 'Follow spot', 'Color change', 'Blackout', 'Strobe', 'Haze', 'Special effect'],
        'LX': ['LX', 'Follow spot', 'Color change', 'Blackout', 'Strobe', 'Haze', 'Special effect'],
        'Lights': ['LX', 'Follow spot', 'Color change', 'Blackout', 'Strobe', 'Haze', 'Special effect'],
        'Sound': ['SFX', 'Music', 'Microphone', 'Playback', 'Live mix', 'Effects', 'Ambience'],
        'Audio': ['SFX', 'Music', 'Microphone', 'Playback', 'Live mix', 'Effects', 'Ambience'],
        'SFX': ['SFX', 'Music', 'Microphone', 'Playback', 'Live mix', 'Effects', 'Ambience'],
        'Video': ['Video', 'Projection', 'Media', 'Graphics', 'Display', 'Screen', 'Animation'],
        'Projection': ['Video', 'Projection', 'Media', 'Graphics', 'Display', 'Screen', 'Animation'],
        'Properties': ['Props', 'Set piece', 'Costume', 'Hand prop', 'Furniture', 'Decoration'],
        'Costumes': ['Costume', 'Wardrobe', 'Dress', 'Accessory', 'Quick change', 'Wig', 'Makeup'],
        'Costume': ['Costume', 'Wardrobe', 'Dress', 'Accessory', 'Quick change', 'Wig', 'Makeup'],
        'Scenic': ['Fly', 'Deck', 'Turntable', 'Platform', 'Curtain', 'Backdrop'],
        'Scenery': ['Fly', 'Deck', 'Turntable', 'Platform', 'Curtain', 'Backdrop'],
        'SM': ['Standby', 'Go', 'Hold', 'Check', 'Clear', 'Reset', 'Places'],
        'Special Effects': ['Pyro', 'Smoke', 'Fog', 'Confetti', 'Bubble', 'Wind', 'Flash'],
        'Pyrotechnics': ['Pyro', 'Flash', 'Spark', 'Flame', 'Explosion', 'Firework'],
        'Hair & Makeup': ['Makeup', 'Hair', 'Wig', 'Prosthetic', 'Touch-up', 'Quick change'],
        'Orchestra': ['Music', 'Conductor', 'Solo', 'Ensemble', 'Intro', 'Bridge', 'Outro'],
        'Follow Spot': ['Follow', 'Pick up', 'Track', 'Iris', 'Color', 'Blackout', 'Fade'],
        'Rigging': ['Fly', 'Hoist', 'Lower', 'Secure', 'Release', 'Tension', 'Safety check']
    }
    
    # Generic actions that work for most departments
    default_actions = ['start', 'stop', 'go', 'standby', 'ready', 'execute', 'check', 'clear', 'reset', 'hold']

    rows = []
    current_time = 0
    cue_counter = 1
    
    # Header
    rows.append(['Time', 'Type', 'Element Name', 'Description', 'Group Path', 'Department', 'Priority'])
    
    # Calculate number of groups needed with some randomization
    base_groups = max(3, num_cues // 10)
    num_groups = base_groups + random.randint(-1, 2)  # Add some variance
    num_groups = max(2, min(num_groups, num_cues // 3))  # Keep reasonable bounds
    
    # Create randomized group sizes instead of equal distribution
    remaining_cues = num_cues
    group_sizes = []
    
    for i in range(num_groups - 1):
        # Random group size between 20% and 50% of remaining cues
        min_size = max(2, remaining_cues // 5)
        max_size = max(min_size, remaining_cues // 2)
        group_size = random.randint(min_size, max_size)
        group_sizes.append(group_size)
        remaining_cues -= group_size
    
    # Last group gets all remaining cues
    group_sizes.append(remaining_cues)
    
    # Generate flat groups (no nesting)
    for group_num in range(1, num_groups + 1):
        # Group header - using simple names like "Scene 1", "Song 2", etc.
        group_names = ['Scene', 'Song', 'Act', 'Transition', 'Opening', 'Finale', 'Intermission', 'Preshow', 'Sequence', 'Moment']
        group_type = random.choice(group_names)
        
        group_time = format_time(current_time)
        group_name = f'{group_type} {group_num}'
        rows.append([group_time, 'GROUP', group_name, f'{group_name} content', group_name, '', 'NORMAL'])
        current_time += random.randint(3, 8)  # Randomize group start timing
        
        # Generate cues for this group
        cues_in_this_group = group_sizes[group_num - 1]
            
        for cue in range(cues_in_this_group):
            # Randomly select department to get good variety for testing mapping
            dept = random.choice(departments)
            
            # Get cue type for this department (fallback to generic if not found)
            if dept in cue_types:
                cue_type = random.choice(cue_types[dept])
            else:
                cue_type = 'Cue'
            
            action = random.choice(default_actions)
            priority = random.choice(priorities)
            
            cue_time = format_time(current_time)
            cue_name = f'{cue_type} {cue_counter}'
            description = f'{cue_type} {action} - cue {cue_counter}'
            group_path = group_name  # Flat structure - no nesting
            
            rows.append([cue_time, 'CUE', cue_name, description, group_path, dept, priority])
            
            current_time += random.randint(1, 12)  # More varied timing between cues
            cue_counter += 1
            
            if cue_counter > num_cues:
                break
        
        if cue_counter > num_cues:
            break
        
        # Add a random gap between groups (except for the last group)
        if group_num < num_groups:
            current_time += random.randint(5, 20)
    
    return rows

# Generate and write the CSV
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate test CSV files for script import')
    parser.add_argument('--cues', type=int, default=500, help='Number of cues to generate (default: 500)')
    parser.add_argument('--output', type=str, help='Output filename (default: generated based on cue count)')
    
    args = parser.parse_args()
    
    # Generate filename if not provided
    if args.output:
        filename = args.output
    else:
        filename = f'/Users/alex/Projects/cuebe/utility/test_script_{args.cues}_cues.csv'
    
    rows = generate_large_script_csv(args.cues)
    
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerows(rows)
    
    print(f"Generated CSV: {filename}")
    print(f"Total rows: {len(rows) - 1}")
    cue_rows = sum(1 for row in rows[1:] if row[1] == 'CUE')
    group_rows = sum(1 for row in rows[1:] if row[1] == 'GROUP')
    note_rows = sum(1 for row in rows[1:] if row[1] == 'NOTE')
    print(f"- {cue_rows} CUE elements")
    print(f"- {group_rows} GROUP elements")
    print(f"- {note_rows} NOTE elements")
    
    # Show department variety for testing mapping
    departments_used = set(row[5] for row in rows[1:] if row[5])  # Skip empty departments
    print(f"- {len(departments_used)} unique departments for testing mapping:")
    for dept in sorted(departments_used):
        print(f"  • {dept}")