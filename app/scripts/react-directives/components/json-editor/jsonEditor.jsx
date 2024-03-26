import { observer } from 'mobx-react-lite';
import React, { useLayoutEffect, useRef, useState } from 'react';
import i18n from '../../../i18n/react/config';
import { createJSONEditor } from '../../../json-editor/wb-json-editor';
import { isEqual } from 'lodash';

const JsonEditor = observer(props => {
  const container = useRef();
  var jse = useRef(null);
  const stateRef = useRef();
  const [schema, setSchema] = useState(undefined);
  const [firstStart, setFirstStart] = useState(true);
  stateRef.current = firstStart;

  const constructEditor = props => {
    var editor = createJSONEditor(
      container.current,
      props.schema,
      props.data,
      i18n.language,
      props.root
    );
    editor.on('change', () => {
      if (props.onChange) {
        props.onChange(editor.getValue(), editor.validate(), stateRef.current);
      }
      if (stateRef.current) {
        setFirstStart(false);
      }
    });
    // json-editor can modify an internal schema object,
    // so store original one to recreate editor only on real schema change
    setSchema(props.schema);
    return editor;
  };

  useLayoutEffect(() => {
    if (!jse.current) {
      jse.current = constructEditor(props);
    } else {
      if (isEqual(props.schema, schema)) {
        if (!isEqual(props.data, jse.current.getValue())) {
          jse.current.setValue(props.data);
        }
      } else {
        jse.current.destroy();
        jse.current = undefined;
        jse.current = constructEditor(props);
      }
    }
  });
  return <div ref={container} className={props.className} />;
});

export default JsonEditor;
