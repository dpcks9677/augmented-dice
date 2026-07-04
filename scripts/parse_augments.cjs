const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../.documents/augments_explaination.md'), 'utf8');
const lines = content.split('\n');

const augments = [];
let currentAug = null;

for (let line of lines) {
    line = line.trim();
    if (line.startsWith('*   **') && /\d+\./.test(line)) {
        if (currentAug) {
            augments.push(currentAug);
        }
        
        const match = line.match(/(\d+)\.\s+([^\*]+)\*\*/);
        if (match) {
            currentAug = {
                id: parseInt(match[1]),
                name: match[2].trim(),
            };
            
            // Try to extract SVG icon
            const svgMatch = line.match(/<svg.*?<\/svg>/);
            if (svgMatch) {
                currentAug.icon = svgMatch[0];
            }
        } else {
            currentAug = null;
        }
    } else if (currentAug && line.startsWith('*   **')) {
        const match = line.match(/\*\*(.+?):\*\*\s*(.*)/);
        if (match) {
            const key = match[1].trim();
            const val = match[2].trim();
            
            if (key === '대상') currentAug.target = val;
            else if (key === '족보 표기') currentAug.mark = val;
            else if (key.includes('조건')) currentAug.condition = val;
            else if (key.includes('효과')) currentAug.effect = val;
            else if (key === '텍스트') currentAug.description = val;
            else if (key === '보상') currentAug.reward = val;
        }
    }
}

if (currentAug) {
    augments.push(currentAug);
}

fs.writeFileSync(path.join(__dirname, '../src/augments.json'), JSON.stringify(augments, null, 2), 'utf8');
console.log('Successfully wrote to src/augments.json');
