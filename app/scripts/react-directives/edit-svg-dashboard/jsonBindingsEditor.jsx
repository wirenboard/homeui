import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

const JsonBindingsEditor = ({ bindingsStore }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="json-editor">
        <CodeMirror
          style={{ height: '100%' }}
          value={bindingsStore.jsonSource}
          height="100%"
          extensions={[javascript({ jsx: false })]}
          onChange={value => bindingsStore.setJsonSource(value)}
        />
      </div>
      <div className="json-editor-buttons">
        <div className="pull-right button-group">
          <Button
            type="success"
            label={t('edit-svg-dashboard.buttons.save')}
            onClick={() => bindingsStore.saveJson()}
          />
          <Button
            label={t('edit-svg-dashboard.buttons.cancel')}
            onClick={() => bindingsStore.cancelEditingJson()}
          />
        </div>
      </div>
    </>
  );
};

export default JsonBindingsEditor;
