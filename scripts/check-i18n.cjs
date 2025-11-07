// Quick i18n key audit: scans t("...")/t('...')/t(`...`) and compares with locales
// Usage: node scripts/check-i18n.cjs

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const LOCALES = path.join(SRC, 'locales');

function walk(dir) {
  const res = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) res.push(...walk(p));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) res.push(p);
  }
  return res;
}

function collectKeysFromSource(content) {
  const keys = new Set();
  const dynamic = new Set();
  // t("key") or t('key')
  const reStatic = /\bt\(\s*(["'])([^"'\)]+)\1/g;
  let m;
  while ((m = reStatic.exec(content))) {
    keys.add(m[2]);
  }
  // t(`...`) dynamic
  const reTpl = /\bt\(\s*`([^`]*)`/g;
  while ((m = reTpl.exec(content))) {
    dynamic.add(m[1]);
  }
  return { keys, dynamic };
}

function flatten(obj, prefix = '') {
  const out = new Set();
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      const keyPath = prefix ? `${prefix}.${k}` : k;
      const v = obj[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        for (const f of flatten(v, keyPath)) out.add(f);
      } else {
        out.add(keyPath);
      }
    }
  }
  return out;
}

function loadJson(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function main() {
  const files = walk(SRC);
  const used = new Set();
  const dynamic = new Set();
  for (const f of files) {
    const c = fs.readFileSync(f, 'utf8');
    const { keys, dynamic: dyn } = collectKeysFromSource(c);
    keys.forEach((k) => used.add(k));
    dyn.forEach((k) => dynamic.add(k));
  }

  const en = loadJson(path.join(LOCALES, 'en', 'translation.json'));
  const ar = loadJson(path.join(LOCALES, 'ar', 'translation.json'));
  const enKeys = en ? flatten(en) : new Set();
  const arKeys = ar ? flatten(ar) : new Set();

  const missingInEn = [];
  const missingInAr = [];
  used.forEach((k) => {
    if (!enKeys.has(k)) missingInEn.push(k);
    if (!arKeys.has(k)) missingInAr.push(k);
  });

  const report = {
    counts: {
      used: used.size,
      dynamic: dynamic.size,
      enKeys: enKeys.size,
      arKeys: arKeys.size,
      missingInEn: missingInEn.length,
      missingInAr: missingInAr.length,
    },
    missingInEn: missingInEn.sort(),
    missingInAr: missingInAr.sort(),
    dynamic: Array.from(dynamic).sort(),
  };

  console.log(JSON.stringify(report, null, 2));
}

main();

