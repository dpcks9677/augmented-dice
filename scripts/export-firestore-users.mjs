import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const projectId = process.env.FIREBASE_PROJECT_ID || 'augmented-dice';
const outputPath = process.argv[2] || 'firestore-users.json';
const token = process.platform === 'win32'
  ? execFileSync('cmd.exe', ['/d', '/s', '/c', 'gcloud auth application-default print-access-token'], { encoding: 'utf8' }).trim()
  : execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], { encoding: 'utf8' }).trim();
if (!token) throw new Error('Google application default token unavailable');

const documents = [];
let pageToken = '';
do {
  const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users`);
  if (pageToken) url.searchParams.set('pageToken', pageToken);
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Firestore REST failed: HTTP ${response.status} ${await response.text()}`);
  const body = await response.json();
  documents.push(...(body.documents || []));
  pageToken = body.nextPageToken || '';
} while (pageToken);

await writeFile(outputPath, JSON.stringify(documents, null, 2), 'utf8');
console.log(`Exported ${documents.length} users to ${outputPath}`);
