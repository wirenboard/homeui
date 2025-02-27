import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useEffect, useRef, useState } from 'react';
import { breakpointState, customGutter, getGutterEffects } from './helpers';
import { CodeEditorProps } from './types';
import './styles.css';

export const CodeEditor = ({ text, errorLines, autoFocus, extensions = [], onChange, onSave }: CodeEditorProps) => {
  const editor = useRef<ReactCodeMirrorRef>(null);
  const [allExtensions, setAllExtensions] = useState([]);

  const onEditorReInit = (view: EditorView, state: EditorState) => {
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
  };

  useEffect(() => {
    const settedExtensions = [...extensions, lineNumbers(), customGutter, breakpointState];

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
        ])
      );
    }

    setAllExtensions(settedExtensions);
  }, [extensions, onSave]);

  useEffect(() => {
    if (editor.current?.view) {
      const view = editor.current.view;
      const state = view.state;
      const effects = getGutterEffects(view, state, errorLines);

      if (effects.length > 0) {
        view.dispatch({ effects });
      }
    }
  }, [errorLines]);

  return (
    <CodeMirror
      ref={editor}
      style={{ height: '100%' }}
      value={text}
      height="100%"
      autoFocus={autoFocus}
      extensions={allExtensions}
      onCreateEditor={onEditorReInit}
      onChange={onChange}
    />
  );
};
