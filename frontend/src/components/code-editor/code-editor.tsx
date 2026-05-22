import { type EditorState } from '@codemirror/state';
import { type EditorView, keymap, lineNumbers } from '@codemirror/view';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useEffect, useRef, useState } from 'react';
import { breakpointState, customGutter, getGutterEffects } from './helpers';
import { type CodeEditorProps } from './types';
import './styles.css';

export const CodeEditor = ({
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

  const onEditorReInit = (view: EditorView, state: EditorState) => {
    if (withBreakpoints) {
      if (errorLines?.length) {
        view.dispatch({
          selection: { anchor: state.doc.line(Math.min(errorLines[0], state.doc.lines)).from },
          scrollIntoView: true,
        });
      }

      const effectList = getGutterEffects(view, state, errorLines);

      if (effectList.length > 0) {
        view.dispatch({ effects: effectList });
      }
    }

    onCreateEditor?.(view, state);
  };

  useEffect(() => {
    const settedExtensions = [...extensions, lineNumbers()];

    if (withBreakpoints) {
      settedExtensions.push(customGutter, breakpointState);
    }

    if (onSave) {
      const saveHandler = (ev: Event) => {
        ev.preventDefault();
        onSave();
      };

      settedExtensions.push(
        keymap.of([
          {
            key: 'Mod-s',
            run: () => {
              saveHandler(new Event('keydown'));
              return true;
            },
          },
        ]),
      );
    }

    setAllExtensions(settedExtensions);
  }, [extensions, onSave, withBreakpoints]);

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
      style={{ height: '100%' }}
      value={text}
      height="100%"
      autoFocus={autoFocus}
      extensions={allExtensions}
      basicSetup={basicSetup}
      onCreateEditor={onEditorReInit}
      onChange={onChange}
    />
  );
};
