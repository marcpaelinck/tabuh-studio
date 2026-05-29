const fs   = require('fs');
const path = require('path');

function scoreToFormattedJson(score) {
    const flatten = (key, value) => {
        if (/^(execution|staff|group|positions)$/.test(key) && value) {
            const json = value.map((item) => JSON.stringify(item));
            if (key !== 'execution') return '[' + json.join(', ') + ']';
            return json;   // execution: return array of strings → each item inlined on own line
        }
        if (/^[A-Z][A-Z\d_]+$/.test(key) && value && typeof value === 'object' && 'notation' in value) {
            return JSON.stringify(value);   // Staff object: inline on one line
        }
        if (key === 'starttime') return undefined;
        return value;
    };

    const json = JSON.stringify(score, flatten, 2);
    return json
        .replace(/"([\{\[])/g,          '$1')
        .replace(/([\}\]])"/g,           '$1')
        .replace(/\\"/g,                 '"')
        .replace(/:(?! )/g,              ': ')
        .replace(/([\]\}\d"]),"/g,       '$1, "')
        .replace(/(true|false),(?![ \n\r])/g, '$1, ')
        .replace(/([\d]),(?=\d)/g,       '$1, ');
}

const scoresDir = path.join(__dirname, 'frontend/public/scores');
const files = fs.readdirSync(scoresDir).filter(f => f.endsWith('.json') && f !== 'content.json');

let count = 0;
for (const file of files) {
    const filePath = path.join(scoresDir, file);
    const score = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const formatted = scoreToFormattedJson(score);
    fs.writeFileSync(filePath, formatted, 'utf-8');
    count++;
    console.log(`Formatted: ${file}`);
}
console.log(`\nDone — ${count} files formatted.`);
