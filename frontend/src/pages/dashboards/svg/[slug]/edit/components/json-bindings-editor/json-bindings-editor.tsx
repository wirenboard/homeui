import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { type JsonBindingsEditorProps } from './types';
import './styles.css';

export const JsonBindingsEditor = ({ bindingsStore }: JsonBindingsEditorProps) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="jsonBindingsEditor">
        <CodeMirror
          style={{ height: '100%' }}
          value={bindingsStore.jsonSource}
          height="100%"
          extensions={[javascript({ jsx: false })]}
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
