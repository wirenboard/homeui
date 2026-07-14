import { json } from '@codemirror/lang-json';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { CodeEditor } from '@/components/code-editor';
import { type JsonBindingsEditorProps } from './types';
import './styles.css';

export const JsonBindingsEditor = ({ bindingsStore }: JsonBindingsEditorProps) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="jsonBindingsEditor">
        <CodeEditor
          text={bindingsStore.jsonSource}
          extensions={[json()]}
          autoFocus
          onChange={(value) => bindingsStore.setJsonSource(value)}
        />
      </div>
      <div className="jsonBindingsEditor-buttons">
        <Button
          variant="secondary"
          label={t('edit-svg-dashboard.buttons.cancel')}
          onClick={() => bindingsStore.cancelEditingJson()}
        />
        <Button
          label={t('edit-svg-dashboard.buttons.save')}
          onClick={() => bindingsStore.saveJson()}
        />
      </div>
    </>
  );
};
