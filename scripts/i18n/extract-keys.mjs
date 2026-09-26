#!/usr/bin/env node
/**
 * Lists every translation key used in src/ (English source strings).
 *
 *   node scripts/i18n/extract-keys.mjs            → JSON array of { key, plural, files }
 *   node scripts/i18n/extract-keys.mjs --missing fi → keys missing from src/i18n/fi.json
 *
 * Keys come from t('…'), tr('…') and tn('…') calls with a literal first
 * argument, plus history labels (the first/last string argument of commit(),
 * endGesture(), setProp(), setOverride() and similar), which the Edit menu shows
 * as "Undo <label>" through t(label).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@babel/parser';
import traverseMod from '@babel/traverse';

const traverse = traverseMod.default ?? traverseMod;
const HISTORY_CALLS = new Set(['commit', 'endGesture', 'setProp', 'setOverride', 'commitSetting', 'set', 'setTree', 'update']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== '__tests__' && name !== 'test') walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

export function extractKeys(root = 'src') {
  const keys = new Map();
  const add = (key, plural, file) => {
    const k = keys.get(key) ?? { key, plural: false, files: new Set() };
    k.plural ||= plural;
    k.files.add(file);
    keys.set(key, k);
  };
  for (const file of walk(root)) {
    const src = readFileSync(file, 'utf8');
    const ast = parse(src, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
    traverse(ast, {
      CallExpression(path) {
        const c = path.node.callee;
        const name = c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' && c.property.type === 'Identifier' ? c.property.name : null;
        const args = path.node.arguments;
        if ((name === 't' || name === 'tr' || name === 'tn') && c.type === 'Identifier' && args[0]?.type === 'StringLiteral') {
          add(args[0].value, name === 'tn', file);
        } else if (name && HISTORY_CALLS.has(name)) {
          for (const a of args) if (a.type === 'StringLiteral' && /^[A-Z][a-z]/.test(a.value) && /[a-z]/.test(a.value)) add(a.value, false, file);
        }
      },
    });
  }
  return [...keys.values()].map((k) => ({ ...k, files: [...k.files] })).sort((a, b) => a.key.localeCompare(b.key));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const keys = extractKeys();
  const i = process.argv.indexOf('--missing');
  if (i > 0) {
    const lang = process.argv[i + 1] ?? 'fi';
    const cat = JSON.parse(readFileSync(`src/i18n/${lang}.json`, 'utf8'));
    const missing = keys.filter((k) => (k.plural ? !(`${k.key}_one` in cat && `${k.key}_other` in cat) : !(k.key in cat)));
    console.log(JSON.stringify(missing.map((k) => (k.plural ? `${k.key} (plural)` : k.key)), null, 1));
    console.error(`${missing.length} of ${keys.length} keys missing in ${lang}.json`);
  } else console.log(JSON.stringify(keys, null, 1));
}
