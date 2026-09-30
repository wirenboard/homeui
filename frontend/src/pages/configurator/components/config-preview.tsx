import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useTranslation } from 'react-i18next';
import CopyIcon from '@/assets/icons/copy.svg';
import DownloadIcon from '@/assets/icons/download.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CodeEditor } from '@/components/code-editor';
import type { ConfigPreviewProps } from '../types';

const READ_ONLY_EXTENSIONS = [EditorState.readOnly.of(true), EditorView.editable.of(false)];

export const ConfigPreview = ({
  yaml, deviceCount, status, backendState, isSaving, onSave, onCopy, onDownload, onStatusClose,
}: ConfigPreviewProps) => {
  const { t } = useTranslation();
  const isEmpty = deviceCount === 0;

  return (
    <Card
      className="configurator-preview"
      heading={t('configurator.labels.config')}
      variant="secondary"
    >
      {isEmpty ? (
        <p className="configurator-empty">{t('configurator.labels.config-empty')}</p>
      ) : (
        <div className="configurator-config">
          <CodeEditor
            text={yaml}
            extensions={READ_ONLY_EXTENSIONS}
            withBreakpoints={false}
            basicSetup={{ foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }}
            onChange={() => {}}
          />
        </div>
      )}

      {backendState === 'unavailable' && (
        <Alert variant="info" size="small" className="configurator-alert">
          {t('configurator.labels.save-unavailable')}
        </Alert>
      )}

      {status && (
        <Alert variant={status.variant} size="small" className="configurator-alert" onClose={onStatusClose}>
          {status.text}
        </Alert>
      )}

      <div className="configurator-actions">
        <Button
          label={t('configurator.buttons.save')}
          disabled={isEmpty || backendState !== 'available'}
          isLoading={isSaving || backendState === 'checking'}
          onClick={onSave}
        />
        <Button
          variant="secondary"
          icon={<CopyIcon />}
          label={t('configurator.buttons.copy')}
          disabled={isEmpty}
          onClick={onCopy}
        />
        <Button
          variant="secondary"
          icon={<DownloadIcon />}
          label={t('configurator.buttons.download')}
          disabled={isEmpty}
          onClick={onDownload}
        />
      </div>
    </Card>
  );
};
