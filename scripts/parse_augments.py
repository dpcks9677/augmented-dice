import re
import json

def parse_md():
    with open('../.documents/augments_explaination.md', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by list items starting with '*   **'
    lines = content.split('\n')
    
    augments = []
    current_aug = None
    
    for line in lines:
        line = line.strip()
        if line.startswith('*   **') and re.search(r'\d+\.', line):
            if current_aug:
                augments.append(current_aug)
            
            # Extract number and name
            match = re.search(r'(\d+)\.\s+([^\*]+)\*\*', line)
            if match:
                current_aug = {
                    'id': int(match.group(1)),
                    'name': match.group(2).strip(),
                }
            else:
                current_aug = None
        elif current_aug and line.startswith('*   **'):
            # Extract key-value
            match = re.search(r'\*\*(.+?):\*\*\s*(.*)', line)
            if match:
                key = match.group(1).strip()
                val = match.group(2).strip()
                
                if key == '대상':
                    current_aug['target'] = val
                elif key == '족보 표기':
                    current_aug['mark'] = val
                elif '조건' in key:
                    current_aug['condition'] = val
                elif '효과' in key:
                    current_aug['effect'] = val
                elif key == '텍스트':
                    current_aug['description'] = val
                elif key == '보상':
                    current_aug['reward'] = val
    
    if current_aug:
        augments.append(current_aug)
        
    with open('../src/augments_explaination.json', 'w', encoding='utf-8') as f:
        json.dump(augments, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    parse_md()
