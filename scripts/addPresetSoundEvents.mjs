import fs from 'node:fs';
import path from 'node:path';

const directory = path.resolve('public/presets');
const files = fs.readdirSync(directory).filter(name => name.startsWith('dice_presets_') && name.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(directory, file);
  const presets = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const preset of presets) {
    const fps = Number(preset.fps) || 20;
    const frames = Array.isArray(preset.frames) ? preset.frames : [];
    const events = [{ time: 0, type: 'roll', volume: 0.42 }];
    for (let frameIndex = 1; frameIndex < frames.length - 1; frameIndex++) {
      const previous = frames[frameIndex - 1];
      const current = frames[frameIndex];
      const next = frames[frameIndex + 1];
      current.forEach((die, dieIndex) => {
        const before = previous[dieIndex]?.[1];
        const y = die?.[1];
        const after = next[dieIndex]?.[1];
        const hasLanding = Number.isFinite(before) && Number.isFinite(y) && Number.isFinite(after)
          && y < before && y <= after && y < 2.2;
        if (!hasLanding) return;
      const time = frameIndex / fps;
        events.push({ time: Number(time.toFixed(3)), type: 'impact', volume: 0.1, startOffset: 0.05 });
      });
    }
    preset.soundEvents = events;
  }
  fs.writeFileSync(filePath, `${JSON.stringify(presets)}\n`);
  console.log(`Updated ${file}`);
}
