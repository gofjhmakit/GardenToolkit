#!/usr/bin/env node
/**
 * One-off migration helper: wraps user-visible English strings in t('…').
 *
 *   node scripts/i18n/wrap-strings.mjs [--write] <files…>
 *
 * Handles plain JSX text, string props that are shown to people (title,
 * aria-label, placeholder, label, hint, …), string values of such object
 * properties, and toast()/confirm/prompt texts. Anything with interpolation
 * or mixed with other JSX is reported for manual translation instead of being
 * split into fragments (word order differs between languages).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, dirname, resolve } from 'node:path';
import { parse } from '@babel/parser';
import traverseMod from '@babel/traverse';
import MagicString from 'magic-string';

const traverse = traverseMod.default ?? traverseMod;
const write = process.argv.includes('--write');
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const I18N = resolve('src/i18n/index.ts');

const ATTRS = new Set(['title', 'aria-label', 'placeholder', 'label', 'hint', 'alt', 'description', 'confirmLabel', 'cancelLabel', 'message', 'emptyText', 'caption', 'heading', 'text', 'aria-description', 'aria-roledescription', 'aria-valuetext', 'emptyLabel', 'summary', 'subtitle', 'sub']);
const PROPS = new Set(['label', 'title', 'hint', 'message', 'description', 'confirmLabel', 'cancelLabel', 'placeholder', 'heading', 'caption', 'text', 'detail', 'why', 'shortLabel', 'sub']);
const CALLS = new Set(['toast', 'confirmAsync', 'promptAsync', 'announce']);
const human = (s) => /[A-Za-z]{2}/.test(s) && !/^[a-z0-9-]+$/.test(s) && !/^[a-z]+[A-Z]\w*$/.test(s) && !/^(https?:|#|\.|\/)/.test(s);

/** React's JSX text rules: lines are trimmed, lines are joined with a space. */
function jsxText(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  let out = '';
  lines.forEach((line, i) => {
    let l = line.replace(/\t/g, ' ');
    if (i !== 0) l = l.replace(/^[ ]+/, '');
    if (i !== lines.length - 1) l = l.replace(/[ ]+$/, '');
    if (l) out += (out && i !== 0 ? ' ' : '') + l;
  });
  return out;
}
const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

let total = 0;
const manual = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(src, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  } catch (e) {
    console.error('parse error', file, e.message);
    continue;
  }
  const ms = new MagicString(src);
  let edits = 0;
  const conflicts = new Set();
  const note = (node, what) => manual.push(`${file}:${node.loc.start.line}: ${what}`);
  const useT = (path) => {
    const b = path.scope.getBinding('t');
    if (b && b.kind !== 'module' && !(b.path.isVariableDeclarator() && /useTranslation/.test(src.slice(b.path.node.start, b.path.node.end)))) conflicts.add(b);
  };
  traverse(ast, {
    JSXText(path) {
      const raw = path.node.value;
      const text = jsxText(raw);
      if (!human(text)) return;
      // Icons and other self-closing elements next to a label do not split the phrase.
      const siblings = path.parent.children.filter(
        (c) => !(c.type === 'JSXText' && !jsxText(c.value).trim()) && !(c.type === 'JSXElement' && c.openingElement.selfClosing),
      );
      if (siblings.length > 1) {
        note(path.node, `mixed JSX text: "${text.trim()}"`);
        return;
      }
      const lead = /^\s/.test(text) ? "{' '}" : '';
      const trail = /\s$/.test(text) ? "{' '}" : '';
      const leadWs = raw.match(/^\s*/)[0];
      const trailWs = raw.match(/\s*$/)[0];
      ms.overwrite(path.node.start, path.node.end, `${leadWs.includes('\n') ? leadWs : ''}${lead}{t(${q(text.trim())})}${trail}${trailWs.includes('\n') ? trailWs : ''}`);
      useT(path);
      edits++;
    },
    JSXAttribute(path) {
      const name = path.node.name.name;
      if (!ATTRS.has(name)) return;
      const v = path.node.value;
      if (v?.type === 'StringLiteral' && human(v.value)) {
        ms.overwrite(v.start, v.end, `{t(${q(v.value)})}`);
        useT(path);
        edits++;
      } else if (v?.type === 'JSXExpressionContainer' && v.expression.type === 'TemplateLiteral' && v.expression.quasis.some((x) => human(x.value.cooked))) {
        note(v, `template in ${name}`);
      }
    },
    ObjectProperty(path) {
      const k = path.node.key;
      const key = k.type === 'Identifier' ? k.name : k.type === 'StringLiteral' ? k.value : null;
      if (!key || !PROPS.has(key)) return;
      const v = path.node.value;
      if (v.type === 'StringLiteral' && human(v.value)) {
        ms.overwrite(v.start, v.end, `t(${q(v.value)})`);
        useT(path);
        edits++;
      } else if (v.type === 'TemplateLiteral' && v.quasis.some((x) => human(x.value.cooked))) note(v, `template in prop ${key}`);
    },
    StringLiteral(path) {
      const v = path.node;
      if (!human(v.value)) return;
      // Branches of a conditional/logical expression shown in JSX or a display prop.
      let p = path;
      let branch = false;
      while (p.parentPath && ['ConditionalExpression', 'LogicalExpression', 'ParenthesizedExpression'].includes(p.parentPath.node.type)) {
        const par = p.parentPath.node;
        if (par.type === 'ConditionalExpression' && p.node === par.test) return;
        if (par.type === 'LogicalExpression' && p.node === par.left && par.operator !== '??' && par.operator !== '||') return;
        branch = true;
        p = p.parentPath;
      }
      const ctx = p.parentPath?.node;
      let ok = false;
      if (branch && ctx?.type === 'JSXExpressionContainer') {
        const host = p.parentPath.parentPath?.node;
        ok = host?.type === 'JSXElement' || host?.type === 'JSXFragment' || (host?.type === 'JSXAttribute' && ATTRS.has(host.name.name));
      } else if (branch && ctx?.type === 'ObjectProperty' && p.node === ctx.value) {
        const key = ctx.key.type === 'Identifier' ? ctx.key.name : ctx.key.value;
        ok = PROPS.has(key);
      }
      // Values of label tables: const METHOD_LABELS = { rows: 'Rows', … }.
      if (!ok && path.parentPath.isObjectProperty() && path.node === path.parentPath.node.value) {
        const decl = path.parentPath.parentPath.parentPath;
        let d = decl;
        while (d && ['TSAsExpression', 'TSSatisfiesExpression'].includes(d.node.type)) d = d.parentPath;
        if (d?.isVariableDeclarator() && /(LABELS?|TEXTS?|HINTS?|NAMES|TITLES?|DESCRIPTIONS?)$/.test(d.node.id.name ?? '')) ok = true;
      }
      if (!ok) return;
      ms.overwrite(v.start, v.end, `t(${q(v.value)})`);
      useT(path);
      edits++;
    },
    CallExpression(path) {
      const c = path.node.callee;
      if (c.type !== 'Identifier' || !CALLS.has(c.name)) return;
      for (const a of path.node.arguments) {
        const strs = a.type === 'ArrayExpression' ? a.elements : [a];
        for (const s of strs) {
          if (s?.type === 'StringLiteral' && human(s.value) && !['ok', 'error', 'info', 'warn'].includes(s.value)) {
            ms.overwrite(s.start, s.end, `t(${q(s.value)})`);
            useT(path);
            edits++;
          } else if (s?.type === 'TemplateLiteral' && s.quasis.some((x) => human(x.value.cooked))) note(s, `template in ${c.name}()`);
        }
      }
    },
  });
  // Local variables called `t` would shadow the translation function: rename them.
  for (const b of conflicts) {
    for (const id of [b.identifier, ...b.referencePaths.map((r) => r.node)]) ms.overwrite(id.start, id.end, 'item');
    note(b.identifier, `renamed local "t" to "item"`);
  }
  if (!edits) continue;
  const hasImport = /import \{[^}]*\bt\b[^}]*\} from '[^']*i18n'/.test(src) || /const \{ t \} = useTranslation\(\)/.test(src);
  if (!hasImport) {
    let rel = relative(dirname(resolve(file)), I18N).replace(/\\/g, '/').replace(/\/index\.ts$/, '').replace(/\.ts$/, '');
    if (!rel.startsWith('.')) rel = './' + rel;
    const lastImport = [...ast.program.body].reverse().find((n) => n.type === 'ImportDeclaration');
    ms.appendLeft(lastImport ? lastImport.end : 0, `${lastImport ? '\n' : ''}import { t } from '${rel}';${lastImport ? '' : '\n'}`);
  }
  total += edits;
  console.log(`${edits.toString().padStart(4)}  ${file}`);
  if (write) writeFileSync(file, ms.toString());
}
console.log(`\n${total} strings ${write ? 'wrapped' : 'would be wrapped'}; ${manual.length} places need manual work:`);
for (const m of manual) console.log('  ' + m);
