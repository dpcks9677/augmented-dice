// Firestore export shape -> D1 users seed generator.
// Usage: node scripts/export-rating-data.mjs firestore-users.json users.sql
import { readFile, writeFile } from 'node:fs/promises';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error('usage: node scripts/export-rating-data.mjs input.json output.sql');

const source = JSON.parse(await readFile(inputPath, 'utf8'));
const documents = Array.isArray(source) ? source : source.documents;
if (!Array.isArray(documents)) throw new Error('input must be an array or { documents: [] }');

const quote = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;
const number = (value, fallback = 500) => Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : fallback;
const rows = documents.map((document) => {
  const fields = document.fields || document;
  const uid = fields.uid?.stringValue || fields.uid || document.name?.split('/').pop();
  if (!uid) return null;
  const stats = fields.stats?.mapValue?.fields || fields.stats || {};
  const normal = stats.modes?.mapValue?.fields?.normal?.mapValue?.fields || stats.modes?.normal || {};
  const augmented = stats.modes?.mapValue?.fields?.augmented?.mapValue?.fields || stats.modes?.augmented || {};
  return `INSERT OR REPLACE INTO users (uid,nickname,avatar_url,normal_rating,normal_games,augmented_rating,augmented_games,updated_at) VALUES (${quote(uid)},${quote(fields.nickname?.stringValue || fields.nickname || 'Player')},${quote(fields.avatarUrl?.stringValue || fields.avatarUrl || null)},${number(normal.rating?.integerValue || normal.rating)},${number(normal.ratingGames?.integerValue || normal.ratingGames, 0)},${number(augmented.rating?.integerValue || augmented.rating)},${number(augmented.ratingGames?.integerValue || augmented.ratingGames, 0)},${Date.now()});`;
}).filter(Boolean);

await writeFile(outputPath, `${rows.join('\n')}\n`, 'utf8');
console.log(`Generated ${rows.length} D1 user seed statements.`);
