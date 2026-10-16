import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Validate the signed/exported product, not only the source Xcode settings.
const app = process.argv[2];
const expected = process.argv[3] ?? 'wine.matchrim.app';
if (!app?.endsWith('.app') || !fs.statSync(app).isDirectory()) {
  throw new Error('Usage: node scripts/check-ios-bundle-identifiers.mjs /absolute/App.app [expected.identifier]');
}
const visit = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(directory, entry.name);
  if (entry.isSymbolicLink()) return [];
  return entry.isDirectory() ? visit(file) : entry.name === 'Info.plist' ? [file] : [];
});
const bundles = visit(app).map(file => {
  const metadata = JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', file], { encoding: 'utf8' }));
  return { path: path.relative(app, path.dirname(file)) || '.', identifier: metadata.CFBundleIdentifier };
}).filter(bundle => typeof bundle.identifier === 'string' && bundle.identifier.length > 0);
const errors = [];
if (bundles.find(bundle => bundle.path === '.')?.identifier !== expected) errors.push('Root application identifier mismatch');
const seen = new Map();
for (const bundle of bundles) {
  const previous = seen.get(bundle.identifier);
  if (previous !== undefined) errors.push(`Duplicate ${bundle.identifier}: ${previous}, ${bundle.path}`);
  seen.set(bundle.identifier, bundle.path);
  if (bundle.path.startsWith('Frameworks/') && bundle.identifier === expected) {
    errors.push(`Framework inherited the application identifier: ${bundle.path}`);
  }
}
console.log(JSON.stringify({ passed: errors.length === 0, app, bundles, errors }, null, 2));
if (errors.length) process.exitCode = 1;
