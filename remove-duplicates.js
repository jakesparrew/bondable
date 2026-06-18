#!/usr/bin/env node

import fs from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in an ES module:
const __filename = fileURLToPath(import.meta.url);
const __dirname  = __filename.replace(/[/\\][^/\\]+$/, '');

const inputPath  = join(process.cwd(), 'src', 'locales', 'fr.json');
const outputPath = join(process.cwd(), 'src', 'locales', 'fr2.json');

try {
  const raw  = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(raw); // duplicates dropped, last wins

  fs.mkdirSync(join(__dirname, 'src', 'locales'), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n');

  console.log(`✅ Duplicates removed. Written to ${outputPath}`);
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
