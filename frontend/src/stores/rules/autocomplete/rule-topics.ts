import type { CompletionContext, CompletionSource } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNode } from '@lezer/common';

const getCallName = (args: SyntaxNode | null, context: CompletionContext) => {
  const call = args?.parent;
  const name = call?.firstChild;
  return args?.name === 'ArgList' && call?.name === 'CallExpression' && name?.name === 'VariableName'
    ? context.state.sliceDoc(name.from, name.to)
    : null;
};

export const makeRuleTopicsSource = (topics: string[]): CompletionSource => (context) => {
  let node: SyntaxNode | null = syntaxTree(context.state).resolveInner(context.pos, -1);
  while (node && !['ArgList', 'Property', 'ArrayExpression'].includes(node.name)) {
    if (node.name === 'LineComment' || node.name === 'BlockComment') {
      return null;
    }
    node = node.parent;
  }
  if (!node) {
    return null;
  }

  let separator: SyntaxNode | null;
  if (node.name === 'ArgList') {
    if (getCallName(node, context) !== 'defineAlias') {
      return null;
    }
    const commas = node.getChildren(',').filter((comma) => comma.to <= context.pos);
    if (commas.length !== 1) {
      return null;
    }
    separator = commas[0];
  } else {
    const property = node.name === 'ArrayExpression' ? node.parent : node;
    const key = property?.firstChild;
    const object = property?.parent;
    if (property?.name !== 'Property' || !key || object?.name !== 'ObjectExpression'
      || getCallName(object.parent, context) !== 'defineRule') {
      return null;
    }
    const name = context.state.sliceDoc(key.from, key.to);
    if (!['whenChanged', '"whenChanged"', '\'whenChanged\''].includes(name)) {
      return null;
    }
    separator = node.name === 'ArrayExpression'
      ? node.getChildren(',').filter((comma) => comma.to <= context.pos).at(-1) ?? node.firstChild
      : property.getChild(':');
  }
  if (!separator || separator.to > context.pos) {
    return null;
  }

  // Inspect just the current argument or array item, including across line breaks.
  const before = context.state.sliceDoc(separator.to, context.pos);
  const match = before.match(/^\s*(?:"((?:[^"\\\r\n]|\\.)*)|'((?:[^'\\\r\n]|\\.)*)|([\w/-]*))$/);
  if (!match) {
    return null;
  }
  const text = match[1] ?? match[2] ?? match[3];
  const quoted = match[3] === undefined;

  return {
    from: context.pos - text.length,
    to: context.pos,
    options: topics.map((topic) => ({
      label: topic,
      type: 'property',
      apply: quoted ? topic : `"${topic}"`,
    })),
  };
};
