import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { EditorSelection } from '@codemirror/state';

const ScriptEditor = observer(
  React.forwardRef(({ text, errorLine, onChange, visible }, cmRef) => {
    const refCallback = ref => {
      if (ref?.view && !cmRef.current) {
        cmRef.current = ref.view;
        cmRef.current.dispatch({
          selection: EditorSelection.single(0, 0),
          scrollIntoView: true,
        });
      }
    };
    useEffect(() => {
      if (cmRef?.current) {
        if (errorLine != null) {
          if (errorLine > cmRef.current.state.doc.lines) {
            errorLine = cmRef.current.state.doc.lines;
          }
          const line = cmRef.current.state.doc.line(errorLine);
          cmRef.current.dispatch({
            selection: EditorSelection.single(line.from, line.from),
            scrollIntoView: true,
          });
        }
      }
    });

    return (
      <div className="script-editor" style={{ display: visible ? '' : 'none' }}>
        <CodeMirror
          ref={refCallback}
          style={{ height: '100%' }}
          value={text}
          height="100%"
          extensions={[javascript({ jsx: false })]}
          onChange={onChange}
        />
      </div>
    );
  })
);

export default ScriptEditor;
