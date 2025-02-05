import { PropsWithChildren } from 'react';
import { Trans } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Loader } from '@/components/loader';
import { Notifications } from '@/components/notifications';
import { PageProps } from './types';
import './styles.css';

export const PageLayout = ({
  children, title, hasRights, isLoading = false, actions,
}: PropsWithChildren<PageProps>) => (
  <main>
    <header className="page-headerContainer">
      <h1 className="page-title">{title}</h1>

      <div className="page-actions">{actions}</div>
    </header>

    {!hasRights && (
      <Alert variant="danger">
        <Trans
          i18nKey="page.access-denied"
          components={[<a href="/#!/access-level" key="access-level" />]}
        />
      </Alert>
    )}

    {hasRights && (
      isLoading ? <Loader className="page-loader" /> : children
    )}

    <Notifications />
  </main>
);
