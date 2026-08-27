import { type EditorState } from '@codemirror/state';
import { type EditorView, keymap, lineNumbers } from '@codemirror/view';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { uiStore } from '@/stores/ui';
import { breakpointState, customGutter, getGutterEffects } from './helpers';
import { type CodeEditorProps } from './types';
import './styles.css';

export const CodeEditor = observer(({
  text,
  errorLines,
  autoFocus,
  extensions = [],
  withBreakpoints = true,
  basicSetup,
  onChange,
  onSave,
  onCreateEditor,
}: CodeEditorProps) => {
  const editor = useRef<ReactCodeMirrorRef>(null);
  const [allExtensions, setAllExtensions] = useState([]);
  // @uiw/react-codemirror reconfigures its whole extension stack whenever extensions or
  // onChange change identity, and pages pass inline handlers per keystroke: bridge them through refs
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const handleChange = useCallback((value: string) => onChangeRef.current?.(value), []);

  const onEditorReInit = (view: EditorView, state: EditorState) => {
    // jump to the first error line even without the gutter marker (the page may render it as a lint diagnostic)
    if (errorLines?.length) {
      view.dispatch({
        selection: { anchor: state.doc.line(Math.min(errorLines[0], state.doc.lines)).from },
        scrollIntoView: true,
      });
    }

    if (withBreakpoints) {
      const effectList = getGutterEffects(view, state, errorLines);

      if (effectList.length > 0) {
        view.dispatch({ effects: effectList });
      }
    }

    onCreateEditor?.(view, state);
  };

  const hasOnSave = !!onSave;
  useEffect(() => {
    const settedExtensions = [...extensions, lineNumbers()];

    if (withBreakpoints) {
      settedExtensions.push(customGutter, breakpointState);
    }

    if (hasOnSave) {
      settedExtensions.push(
        keymap.of([
          {
            key: 'Mod-s',
            run: () => {
              onSaveRef.current?.();
              return true;
            },
          },
        ]),
      );
    }

    setAllExtensions(settedExtensions);
  }, [extensions, hasOnSave, withBreakpoints]);

  useEffect(() => {
    if (!withBreakpoints) {
      return;
    }
    if (editor.current?.view) {
      const view = editor.current.view;
      const state = view.state;
      const effects = getGutterEffects(view, state, errorLines);

      if (effects.length > 0) {
        view.dispatch({ effects });
      }
    }
  }, [errorLines, withBreakpoints]);

  return (
    <CodeMirror
      ref={editor}
      theme={uiStore.resolvedTheme as 'dark' | 'light'}
      style={{ height: '100%' }}
      value={text}
      height="100%"
      autoFocus={autoFocus}
      extensions={allExtensions}
      basicSetup={basicSetup}
      onCreateEditor={onEditorReInit}
      onChange={handleChange}
    />
  );
});
