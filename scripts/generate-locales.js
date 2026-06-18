#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

// ── YOUR DEEPL PRO KEY ───────────────────────────────────────────────────────────
const DEEPL_KEY = '8fb7d249-abb9-475d-b3e9-4f67757a8f3a';
// ────────────────────────────────────────────────────────────────────────────────

if (!DEEPL_KEY) {
  console.error('❌ Please set your DeepL API key in the DEEPL_KEY variable.');
  process.exit(1);
}

/**
 * Send a batch of texts to DeepL for translation.
 * @param {string[]} texts 
 * @param {string} targetLang  e.g. 'fr', 'es', 'de', 'it', 'pt'
 * @returns {Promise<string[]>}
 */
async function translateBatch(texts, targetLang) {
  const params = new URLSearchParams();
  params.append('auth_key', DEEPL_KEY);
  texts.forEach(t => params.append('text', t));
  params.append('target_lang', targetLang.toUpperCase());

  const res = await fetch('https://api.deepl.com/v2/translate', {
    method: 'POST',
    body: params
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepL error: ${err}`);
  }

  const { translations } = await res.json();
  return translations.map(entry => entry.text);
}

async function run() {
  const inPath = path.resolve('src', 'locales', 'en.json');
  const raw    = await fs.readFile(inPath, 'utf8');
  const enJson = JSON.parse(raw);

  const keys   = Object.keys(enJson);
  const values = keys.map(k => enJson[k]);

  const targets = ['es'];

  for (const lang of targets) {
    console.log(`🔄 Translating to ${lang}...`);
    const translated = await translateBatch(values, lang);

    const out = keys.reduce((obj, key, i) => {
      obj[key] = translated[i];
      return obj;
    }, {});

    const outDir  = path.resolve('src', 'locales');
    const outPath = path.join(outDir, `${lang}.json`);

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log(`✅ Written ${lang}.json`);
  }
}

run().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
