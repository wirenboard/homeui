import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { EditorSelection } from '@codemirror/state';

const ScriptEditor = observer(({ text, errorLine, onChange }) => {
  const [scrolled, setScrolled] = useState(false);
  const refCallback = ref => {
    if (!scrolled && errorLine != null && ref?.view) {
      setScrolled(true);
      const line = ref.view.state.doc.line(errorLine);
      ref.view.dispatch({
        selection: EditorSelection.single(line.from, line.to),
        scrollIntoView: true,
      });
    }
  };

  return (
    <div className="script-editor">
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
});

export default ScriptEditor;
