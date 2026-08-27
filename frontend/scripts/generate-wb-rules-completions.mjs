// Generates autocomplete/globals-generated.ts from autocomplete/wb-rules.d.ts (synced
// from the wb-rules repo); run `npm run generate:completions` after updating it.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import ts from 'typescript';

// single-quoted to match the repo eslint style, so regenerating never dirties the tree
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;

const here = path.dirname(url.fileURLToPath(import.meta.url));
const dtsPath = path.join(here, '../src/stores/rules/autocomplete/wb-rules.d.ts');
// an explicit output path serves the drift test (globals-generated.test.ts)
const outPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(here, '../src/stores/rules/autocomplete/globals-generated.ts');

const source = ts.createSourceFile('wb-rules.d.ts', fs.readFileSync(dtsPath, 'utf8'), ts.ScriptTarget.Latest);
const printer = ts.createPrinter({ removeComments: true });

const seen = new Set();
const completions = [];

const signatureOf = (node) => {
  const text = printer.printNode(ts.EmitHint.Unspecified, node, source)
    .replace(/^declare\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
};

const snippetFor = (name, params) => {
  if (params.length === 0) return `${name}()`;
  const args = params
    .filter((p) => !p.questionToken && !p.dotDotDotToken)
    .map((p, i) => `\${${i + 1}:${p.name.getText(source)}}`);
  return `${name}(${args.join(', ')})`;
};

for (const stmt of source.statements) {
  if (ts.isFunctionDeclaration(stmt) && stmt.name) {
    const name = stmt.name.text;
    if (seen.has(name)) continue; // keep the first overload only
    seen.add(name);
    completions.push({
      label: name,
      type: 'function',
      detail: signatureOf(stmt),
      snippet: snippetFor(name, stmt.parameters),
    });
  } else if (ts.isVariableStatement(stmt)) {
    for (const decl of stmt.declarationList.declarations) {
      const name = decl.name.getText(source);
      if (seen.has(name)) continue;
      seen.add(name);
      // a callable global declared as a type literal (PersistentStorage): complete it like a function
      const callSig = decl.type && ts.isTypeLiteralNode(decl.type)
        ? decl.type.members.find((m) => ts.isCallSignatureDeclaration(m))
        : undefined;
      if (callSig) {
        const sigText = printer.printNode(ts.EmitHint.Unspecified, callSig, source)
          .replace(/^\(/, '(')
          .replace(/;\s*$/, '')
          .replace(/\s+/g, ' ')
          .trim();
        const detail = `function ${name}${sigText}`;
        completions.push({
          label: name,
          type: 'function',
          detail: detail.length > 60 ? `${detail.slice(0, 57)}...` : detail,
          snippet: snippetFor(name, callSig.parameters),
        });
        continue;
      }
      completions.push({
        label: name,
        type: 'variable',
        detail: decl.type ? signatureOf(decl.type) : '',
      });
    }
  }
}

const body = completions.map((c) => {
  const detail = q(c.detail);
  return c.snippet && c.snippet !== `${c.label}()`
    ? `  snippetCompletion(${q(c.snippet)}, { label: ${q(c.label)}, type: '${c.type}', detail: ${detail} }),`
    : `  { label: ${q(c.label)}, type: '${c.type}', detail: ${detail}${c.snippet ? `, apply: ${q(c.snippet)}` : ''} },`;
}).join('\n');

// Codacy flags non-literal fs paths; the repo-level exclude is not honored here
// eslint-disable-next-line
fs.writeFileSync(outPath, `// GENERATED from wb-rules.d.ts — do not edit by hand.
// Regenerate with: npm run generate:completions
import { snippetCompletion, type Completion } from '@codemirror/autocomplete';

export const wbRulesGlobals: Completion[] = [
${body}
];
`);
console.log(`generated ${completions.length} completions -> ${outPath}`);
