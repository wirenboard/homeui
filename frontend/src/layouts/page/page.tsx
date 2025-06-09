import classNames from 'classnames';
import { PropsWithChildren, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import EditSquareIcon from '@/assets/icons/edit-square.svg';
import { Alert } from '@/components/alert';
import { AlertProps } from '@/components/alert/types';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Loader } from '@/components/loader';
import { Notifications } from '@/components/notifications';
import { PageProps } from './types';
import './styles.css';

export const PageLayout = ({
  children,
  title,
  errors = [],
  hasRights,
  stickyHeader,
  isEditingTitle,
  editingTitlePlaceholder,
  isLoading = false,
  actions,
  onTitleChange,
  onTitleEditEnable,
}: PropsWithChildren<PageProps>) => {
  const { t } = useTranslation();
  const [titleValue, setTitleValue] = useState('');

  useEffect(() => {
    setTitleValue(title);
  }, [title]);

  if (errors.find((error) => error.code === 404)) {
    return (
      <main className="page">
        <header className="page-headerContainer">
          <h1 className="page-title">{t('page.not-found')}</h1>
        </header>
        <Alert variant="danger" className="page-error">
          {t('page.not-found-description')}
        </Alert>
      </main>
    );
  }

  return (
    <main className="page">
      {(titleValue || isEditingTitle) && (
        <header className="page-headerContainer">
          <div className="page-headerTitleWrapper">
            {isEditingTitle ? (
              <Input
                className="editRule-nameInput"
                value={titleValue}
                placeholder={editingTitlePlaceholder}
                autoFocus
                isFullWidth
                onChange={onTitleChange}
              />
            ) : (<h1 className="page-title">{title}</h1>)}

            {(!isEditingTitle && onTitleChange) && (
              <Button
                size="small"
                type="button"
                icon={<EditSquareIcon />}
                variant="secondary"
                isOutlined
                onClick={() => onTitleEditEnable()}
              />
            )}
          </div>

          {!isLoading && <div className="page-actions">{actions}</div>}
        </header>
      )}

      {errors?.map((error, i) => (
        <Alert variant={error.variant as AlertProps['variant']} key={i} className="page-error">
          {error.text}
        </Alert>
      ))}

      {!hasRights && (
        <Alert variant="danger">
          <Trans
            i18nKey="page.access-denied"
            components={[<a href="/#!/access-level" key="access-level" />]}
          />
        </Alert>
      )}

      {hasRights && (
        isLoading
          ? <Loader className="page-loader" />
          : (
            <div
              className={classNames({
                'page-container': stickyHeader,
              })}
            >
              {children}
            </div>
          )
      )}

      <div id="floating-container" />

      <Notifications />
    </main>
  );
};
