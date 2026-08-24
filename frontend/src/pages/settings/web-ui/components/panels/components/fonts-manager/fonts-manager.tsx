import Uploady, { useUploady, useItemFinishListener, useItemErrorListener } from '@rpldy/uploady';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Loader } from '@/components/loader';
import { fontsStore } from '@/stores/fonts';
import './styles.css';

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FontsList = observer(() => {
  const { t } = useTranslation();
  const uploady = useUploady();
  const [error, setError] = useState('');

  useEffect(() => {
    fontsStore.loadFonts();
  }, []);

  useItemFinishListener(() => {
    fontsStore.loadFonts();
    setError('');
  });

  useItemErrorListener(() => {
    setError(t('web-ui-settings.errors.font-upload'));
  });

  if (fontsStore.isLoading && !fontsStore.fonts.length) {
    return <Loader />;
  }

  return (
    <div className="fontsManager">
      <h4 className="fontsManager-heading">{t('web-ui-settings.labels.fonts')}</h4>
      {error && (
        <Alert variant="danger" size="small" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {fontsStore.fonts.length === 0 ? (
        <p className="fontsManager-empty">{t('web-ui-settings.labels.no-fonts')}</p>
      ) : (
        <ul className="fontsManager-list">
          {fontsStore.fonts.map((font) => (
            <li key={font.name} className="fontsManager-item">
              <span className="fontsManager-name">{font.name}</span>
              <span className="fontsManager-size">{formatSize(font.size)}</span>
              <Button
                size="small"
                variant="danger"
                icon={<TrashIcon />}
                aria-label={t('web-ui-settings.labels.delete-font')}
                onClick={() => fontsStore.deleteFont(font.name)}
              />
            </li>
          ))}
        </ul>
      )}

      <Button
        label={t('web-ui-settings.labels.upload-font')}
        variant="secondary"
        size="small"
        onClick={() => uploady.showFileUpload()}
      />
    </div>
  );
});

export const FontsManager = () => (
  <Uploady
    accept=".ttf,.woff,.woff2,.otf"
    multiple={false}
    method="POST"
    destination={{ url: '/api/fonts' }}
    autoUpload
  >
    <FontsList />
  </Uploady>
);
