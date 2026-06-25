import { observer } from 'mobx-react-lite';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { RouterProvider } from 'react-router-dom';
import { Loader } from '@/components/loader';
import { SkipToContentButton } from '@/components/skip-to-content-button';
import { uiStore } from '@/stores/ui';
import { type AppProps } from './types';
import './styles.css';

export const App = observer(({ router }: AppProps) => {
  const { t } = useTranslation();

  if (uiStore.isSettingUpHttps) {
    return (
      <div className="app-loader">
        <Loader caption={t('common.labels.setting-up-https')} />
        <div className="floating"></div>
      </div>
    );
  }

  return (
    <>
      <SkipToContentButton />
      <Suspense>
        <RouterProvider router={router} />
      </Suspense>
      <div className="floating"></div>
    </>
  );
});
