import { PropsWithChildren } from 'react';
import { Trans } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Loader } from '@/components/loader';
import { Notifications } from '@/components/notifications';
import { PageProps } from './types';
import './styles.css';

export const PageLayout = ({
  children, title, isHaveRights, isLoading = false, actions,
}: PropsWithChildren<PageProps>) => (
  <main>
    <header className="page-headerContainer">
      <h1 className="page-title">{title}</h1>

      <div className="page-actions">{actions}</div>
    </header>

    {!isHaveRights && (
      <Alert variant="danger">
        <Trans
          i18nKey="page.access-denied"
          components={[<a href="/#!/access-level" />]}
        />
      </Alert>
    )}

    {isHaveRights && (
      isLoading ? <Loader className="page-loader" /> : children
    )}

    <Notifications />
  </main>
);
