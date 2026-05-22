import { snippet } from '@codemirror/autocomplete';
import { type EditorView } from '@codemirror/view';

export const insertSnippetAtCursor = (view: EditorView, template: string) => {
  const { from, to } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const cursorAtLineEnd = from === line.to && from === to;
  const lineIsEmpty = line.text.trim() === '';

  const insertPos = cursorAtLineEnd ? from : line.to;
  const replaceTo = cursorAtLineEnd ? to : line.to;
  const prefix = lineIsEmpty ? '' : '\n';

  const apply = snippet(prefix + template);
  apply(view, null, insertPos, replaceTo);
  view.focus();
};
