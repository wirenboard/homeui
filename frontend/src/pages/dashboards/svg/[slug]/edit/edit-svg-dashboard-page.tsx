import { observer } from 'mobx-react-lite';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { useAsyncAction } from '@/utils/async-action';
import { useParseHash } from '@/utils/url';
import { useStore } from '@/utils/use-store';
import { VisualEditView } from './components/visual-edit-view';
import { EditSvgDashboardPageStore } from './stores/store';
import { type EditSvgDashboardPageProps } from './types';

const JsonBindingsEditor = lazy(() => import('./components/json-bindings-editor'));

const EditSvgDashboardPage = observer(({ dashboardsStore, devicesStore, openPage }: EditSvgDashboardPageProps) => {
  const { t } = useTranslation();
  const { id } = useParseHash();
  const store = useStore(() => new EditSvgDashboardPageStore(dashboardsStore));
  const [isDeleteDashboard, setIsDeleteDashboard] = useState(false);

  useEffect(() => {
    if (id && !dashboardsStore.isLoading) {
      const isNew = id === 'add';
      if (!dashboardsStore.dashboards.get(id) && !isNew) {
        openPage('dashboard-svg-add');
      } else {
        store.setDashboard(isNew ? null : id);
      }
    }
  }, [id, dashboardsStore.isLoading]);

  const [save, isSaving] = useAsyncAction(async () => {
    const id = await store.onSaveDashboard();
    openPage('dashboard-svg-edit', { id });
  });

  const [deleteDashboard, isDeleting] = useAsyncAction(async () => {
    await store.removeDashboard();
    setIsDeleteDashboard(false);
    return openPage('dashboards');
  });

  return (
    <>
      <PageLayout
        title={store.isNew ? t('edit-svg-dashboard.labels.create') : t('edit-svg-dashboard.labels.edit')}
        isLoading={store.isLoading}
        hasRights={authStore.hasRights(UserRole.Operator)}
        errors={dashboardsStore.saveError ? [{ variant: 'danger', text: dashboardsStore.saveError }] : []}
        actions={
          <>
            {store.isNew ? (
              <Button
                label={t('edit-svg-dashboard.buttons.cancel')}
                variant="secondary"
                onClick={async () => {
                  await store.removeDashboard();
                  openPage('dashboards');
                }}
              />
            ) : (
              <>
                <Button
                  label={t('edit-svg-dashboard.buttons.preview')}
                  variant="secondary"
                  onClick={() => {
                    if (!id) {
                      return;
                    }
                    openPage('dashboard-svg', { id });
                  }}
                />
                <Button
                  variant="danger"
                  label={t('edit-svg-dashboard.buttons.remove')}
                  onClick={() => setIsDeleteDashboard(true)}
                />
              </>
            )}

            <Button
              label={t('edit-svg-dashboard.buttons.save')}
              disabled={!store.isValid}
              isLoading={isSaving}
              onClick={save}
            />
          </>
        }
      >
        {store.bindingsStore.jsonEditMode ? (
          <Suspense>
            <JsonBindingsEditor bindingsStore={store.bindingsStore} />
          </Suspense>
        ) : (
          <VisualEditView
            store={store}
            dashboardsStore={dashboardsStore}
            devices={devicesStore.topics}
          />
        )}
      </PageLayout>

      {isDeleteDashboard && (
        <Confirm
          isOpened={isDeleteDashboard}
          heading={t('edit-svg-dashboard.prompt.confirm-remove')}
          variant="danger"
          isLoading={isDeleting}
          closeCallback={() => setIsDeleteDashboard(false)}
          confirmCallback={deleteDashboard}
        >
          <Trans
            i18nKey="edit-svg-dashboard.prompt.delete-dashboard"
            values={{
              name: store.commonParameters.name,
            }}
            components={[<b key="dashboard-name" />]}
            shouldUnescape
          />
        </Confirm>
      )}
    </>
  );
});

export default EditSvgDashboardPage;
