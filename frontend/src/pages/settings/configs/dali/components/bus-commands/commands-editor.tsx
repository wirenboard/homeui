import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  snippet,
} from '@codemirror/autocomplete';
import { Compartment, type EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder as placeholderExtension } from '@codemirror/view';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CodeEditor } from '@/components/code-editor';
import type { BusCommandsStore } from '@/stores/dali';
import type { ListCommandsEntry } from '@/stores/dali/types';
import { insertSnippetAtCursor } from './snippet-utils';

interface CommandsEditorProps {
  store: BusCommandsStore;
  onEditorReady: (_insertSnippet: (_template: string) => void) => void;
}

const toCompletion = (entry: ListCommandsEntry): Completion => ({
  label: entry.name,
  detail: entry.category,
  apply: snippet(entry.snippet),
  type: 'function',
});

const buildPlaceholder = (text: string): HTMLElement => {
  const container = document.createElement('div');
  text.split('\n').forEach((line, i) => {
    if (i > 0) container.appendChild(document.createElement('br'));
    container.appendChild(document.createTextNode(line));
  });
  return container;
};

export const CommandsEditor = observer(({ store, onEditorReady }: CommandsEditorProps) => {
  const { t } = useTranslation();
  const viewRef = useRef<EditorView | null>(null);
  const editableCompartment = useRef(new Compartment()).current;

  const extensions = useMemo(() => {
    const completionSource = (context: CompletionContext): CompletionResult | null => {
      const word = context.matchBefore(/[\w.]*/);
      if (!word) return null;
      if (word.from === word.to && !context.explicit) return null;
      if (store.catalog === null) return null;
      return {
        from: word.from,
        options: store.catalog.map(toCompletion),
        validFor: /^[\w.]*$/,
      };
    };

    return [
      editableCompartment.of(EditorView.editable.of(true)),
      EditorView.lineWrapping,
      placeholderExtension(buildPlaceholder(t('dali.labels.commands-placeholder'))),
      autocompletion({ override: [completionSource] }),
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            store.run();
            return true;
          },
        },
      ]),
    ];
  }, [store, t, editableCompartment]);

  const onCreateEditor = useCallback((view: EditorView, _state: EditorState) => {
    viewRef.current = view;
    view.dispatch({
      effects: editableCompartment.reconfigure(EditorView.editable.of(!store.isRunning)),
    });
    onEditorReady((template) => insertSnippetAtCursor(view, template));
  }, [store, onEditorReady, editableCompartment]);

  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: editableCompartment.reconfigure(EditorView.editable.of(!store.isRunning)),
    });
  }, [store.isRunning, editableCompartment]);

  return (
    <div className="dali-busCommands-editor">
      <CodeEditor
        text={store.text}
        extensions={extensions}
        withBreakpoints={false}
        basicSetup={{
          lineNumbers: false,
          autocompletion: false,
          foldGutter: false,
          foldKeymap: false,
          searchKeymap: false,
          lintKeymap: false,
          syntaxHighlighting: false,
          indentOnInput: false,
          rectangularSelection: false,
          highlightSelectionMatches: false,
        }}
        onChange={(value) => store.setText(value)}
        onCreateEditor={onCreateEditor}
      />
    </div>
  );
});
