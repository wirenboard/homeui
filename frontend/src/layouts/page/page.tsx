import { type PropsWithChildren, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EditSquareIcon from '@/assets/icons/edit-square.svg';
import { Alert } from '@/components/alert';
import { type AlertProps } from '@/components/alert/types';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Loader } from '@/components/loader';
import { focusToMainContent } from '@/utils/focus-content';
import { ExposeCheck } from './components/expose-check';
import { Info } from './components/info';
import { PageLoader } from './components/loader';
import { type PageProps } from './types';
import './styles.css';

export const PageLayout = ({
  children,
  title,
  errors = [],
  hasRights,
  titleArea,
  stickyHeader,
  isEditingTitle,
  editingTitlePlaceholder,
  isLoading = false,
  loadingOptions,
  isHideHeader = false,
  actions,
  infoLink,
  footer,
  onTitleChange,
  onTitleEditEnable,
}: PropsWithChildren<PageProps>) => {
  const { t } = useTranslation();
  const [titleValue, setTitleValue] = useState(title);

  useEffect(() => {
    setTitleValue(title);
  }, [title]);

  useEffect(() => {
    focusToMainContent(300);
  }, []);

  if (errors.find((error) => error.code === 404)) {
    return (
      <main className="page" tabIndex={-1}>
        <header className="page-headerContainer">
          <h1 className="page-title">{t('page.labels.not-found')}</h1>
        </header>
        <Alert variant="danger" className="page-error">
          {t('page.labels.not-found-description')}
        </Alert>
      </main>
    );
  }

  return (
    <div className="page-container">
      <main className="page" tabIndex={-1}>
        <ExposeCheck />
        {hasRights && !isHideHeader && (titleValue || isEditingTitle) && (
          <header className="page-headerContainer">
            <div className="page-headerTitleWrapper">
              {isEditingTitle ? (
                <Input
                  className="page-nameInput"
                  ariaLive="polite"
                  value={titleValue}
                  placeholder={editingTitlePlaceholder}
                  autoFocus
                  isFullWidth
                  onChange={onTitleChange}
                />
              ) : (
                <>
                  <h1 className="page-title" tabIndex={-1}>{title}</h1>
                  <Info link={infoLink} />
                </>
              )}

              {(!isEditingTitle && onTitleChange) && (
                <Button
                  size="small"
                  type="button"
                  aria-label={t('common.buttons.edit')}
                  aria-description={editingTitlePlaceholder}
                  icon={<EditSquareIcon />}
                  variant="secondary"
                  isOutlined
                  onClick={() => onTitleEditEnable()}
                />
              )}
              {titleArea}
            </div>

            {(!isLoading || loadingOptions?.showActions) && <div className="page-actions">{actions}</div>}
          </header>
        )}

        {errors?.map((error, i) => (
          <Alert
            variant={error.variant as AlertProps['variant']}
            key={i}
            className="page-error"
            onClose={error?.onClose}
          >
            {error.text}
          </Alert>
        ))}

        {!hasRights && (
          <Alert variant="danger">
            {t('page.labels.access-denied')}
          </Alert>
        )}

        {hasRights && (
          isLoading && !loadingOptions?.overlay
            ? <PageLoader options={loadingOptions} />
            : (
              <div className="page-contentWrapper">
                {isLoading && loadingOptions?.overlay && (
                  <div className="page-overlay">
                    <Loader />
                  </div>
                )}
                {stickyHeader ? (
                  <div className="page-container">{children}</div>
                ) : children}
              </div>
            )
        )}

      </main>
      {!!footer && <footer className="page-footer">{footer}</footer>}
    </div>
  );
};
