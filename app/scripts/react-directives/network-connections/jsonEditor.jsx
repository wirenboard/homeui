import { observer } from 'mobx-react-lite';
import React, { useLayoutEffect, useRef } from 'react';
import i18n from '../../i18n/react/config';
import { createJSONEditor } from '../../json-editor/wb-json-editor';

const JsonEditor = observer(props => {
  const container = useRef();
  var jse = useRef(null);

  useLayoutEffect(() => {
    if (!jse.current) {
      jse.current = createJSONEditor(
        container.current,
        props.schema,
        props.data,
        i18n.language,
        props.root
      );
      jse.current.on('change', () => {
        if (props.onChange) {
          props.onChange(jse.current.getValue(), jse.current.validate());
        }
      });
    } else {
      jse.current.setValue(props.data);
    }
  });
  return <div ref={container} />;
});

export default JsonEditor;
