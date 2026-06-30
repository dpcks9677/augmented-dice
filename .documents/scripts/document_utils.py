import sys
import re
import os

IDEAS_FILE = 'augmented_ideas.md'
CALC_FILE = 'probability_calculations.md'

def renumber_ideas():
    if not os.path.exists(IDEAS_FILE):
        print(f"Error: {IDEAS_FILE} not found.")
        return
        
    with open(IDEAS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
        
    lines = content.split('\n')
    current_num = 1
    for i in range(len(lines)):
        line = lines[i].strip()
        if line.startswith("### "):
            parts = lines[i].split()
            # Match 1., 2., 15. etc.
            if len(parts) > 1 and re.match(r'^\d+\.', parts[1]):
                title = " ".join(parts[2:])
            else:
                title = " ".join(parts[1:])
            lines[i] = f"### {current_num}. {title}"
            current_num += 1
            
    with open(IDEAS_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"Successfully renumbered headers in {IDEAS_FILE}.")

def renumber_calc():
    if not os.path.exists(CALC_FILE):
        print(f"Error: {CALC_FILE} not found.")
        return
        
    with open(CALC_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
        
    lines = content.split('\n')
    current_sub_num = 1
    for i in range(len(lines)):
        m = re.match(r'^### 2\.\d+\.\s*(.*)', lines[i].strip())
        if m:
            title = m.group(1)
            lines[i] = f"### 2.{current_sub_num}. {title}"
            current_sub_num += 1
            
    with open(CALC_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"Successfully renumbered sub-headers in {CALC_FILE}.")

def sync_all():
    renumber_ideas()
    renumber_calc()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python scripts/document_utils.py [renumber_ideas | renumber_calc | sync_all]")
        sys.exit(1)
        
    cmd = sys.argv[1]
    if cmd == 'renumber_ideas':
        renumber_ideas()
    elif cmd == 'renumber_calc':
        renumber_calc()
    elif cmd == 'sync_all':
        sync_all()
    else:
        print(f"Unknown command: {cmd}")
        print("Available commands: renumber_ideas, renumber_calc, sync_all")
