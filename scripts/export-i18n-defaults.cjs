// Extracts default strings passed to t("key", "Default") calls.
// Usage: node scripts/export-i18n-defaults.cjs > defaults.json

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

function walk(dir) {
  const res = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      res.push(...walk(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      res.push(full);
    }
  }
  return res;
}

function collectDefaults(file) {
  const content = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const entries = {};

  function getKeyFromCallExpression(node) {
    if (!ts.isCallExpression(node)) return null;
    const expr = node.expression;
    if (!ts.isIdentifier(expr) || expr.text !== "t") return null;
    const [keyArg] = node.arguments;
    if (keyArg && ts.isStringLiteralLike(keyArg)) {
      return keyArg.text;
    }
    return null;
  }

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const key = getKeyFromCallExpression(node);
      if (key) {
        const defaultArg = node.arguments[1];
        if (defaultArg && ts.isStringLiteralLike(defaultArg)) {
          entries[key] = defaultArg.text;
        }
      }
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken
    ) {
      const key = getKeyFromCallExpression(node.left);
      if (key && ts.isStringLiteralLike(node.right)) {
        entries[key] = node.right.text;
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return entries;
}

function main() {
  const files = walk(SRC);
  const defaults = {};
  for (const file of files) {
    const entries = collectDefaults(file);
    for (const [key, value] of Object.entries(entries)) {
      if (!defaults[key]) defaults[key] = value;
    }
  }
  console.log(JSON.stringify(defaults, null, 2));
}

main();
