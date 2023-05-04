import { observer } from 'mobx-react-lite';
import React, { useLayoutEffect, useRef } from 'react';
import i18n from '../../i18n/react/config';
import { createJSONEditor } from '../../json-editor/wb-json-editor';
import { isEqual } from 'lodash';

const JsonEditor = observer(props => {
  const container = useRef();
  var jse = useRef(null);

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
        props.onChange(editor.getValue(), editor.validate());
      }
    });
    return editor;
  };

  useLayoutEffect(() => {
    if (!jse.current) {
      jse.current = constructEditor(props);
    } else {
      if (isEqual(props.schema, jse.current.schema)) {
        jse.current.setValue(props.data);
      } else {
        jse.current.destroy();
        jse.current = undefined;
        jse.current = constructEditor(props);
      }
    }
  });
  return <div ref={container} />;
});

export default JsonEditor;
