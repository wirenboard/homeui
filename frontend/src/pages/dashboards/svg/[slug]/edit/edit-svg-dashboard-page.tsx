import { observer } from 'mobx-react-lite';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { documentation } from '@/common/links';
import { Button, ButtonLink } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { dashboardsStore } from '@/stores/dashboards';
import { devicesStore } from '@/stores/devices';
import { useAsyncAction } from '@/utils/async-action';
import { useStore } from '@/utils/use-store';
import { VisualEditView } from './components/visual-edit-view';
import { EditSvgDashboardPageStore } from './stores/store';

const JsonBindingsEditor = lazy(() => import('./components/json-bindings-editor'));

const EditSvgDashboardPage = observer(() => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const store = useStore(() => new EditSvgDashboardPageStore());
  const [isDeleteDashboard, setIsDeleteDashboard] = useState(false);

  useEffect(() => {
    const isNew = location.pathname === '/dashboards/svg/add';
    store.setDashboard(isNew ? null : params.id);
  }, [params.id, dashboardsStore.isLoading]);

  const [save, isSaving] = useAsyncAction(async () => {
    const id = await store.onSaveDashboard();
    if (id) {
      navigate(`/dashboards/svg/edit/${id}`);
    }
  });

  const [deleteDashboard, isDeleting] = useAsyncAction(async () => {
    await store.removeDashboard();
    setIsDeleteDashboard(false);
    return navigate('/dashboards');
  });

  return (
    <>
      <PageLayout
        title={store.isNew ? t('edit-svg-dashboard.labels.create') : t('edit-svg-dashboard.labels.edit')}
        infoLink={documentation[i18n.language]?.svgdashboard}
        isLoading={store.isLoading}
        hasRights={authStore.hasRights(UserRole.Operator)}
        errors={[
          ...(store.svgLoadError ? [{ variant: 'danger', text: t('dashboards.errors.svg-load') }] : []),
          ...(store.idConflictError ? [{ variant: 'danger', text: t('dashboards.errors.duplicate') }] : []),
          ...(dashboardsStore.saveError ? [{ variant: 'danger', text: dashboardsStore.saveError }] : []),
        ]}
        actions={
          <>
            {store.isNew ? (
              <Button
                label={t('edit-svg-dashboard.buttons.cancel')}
                variant="secondary"
                onClick={() => {
                  // A new dashboard is only persisted on Save, so cancel just leaves (no DELETE).
                  navigate('/dashboards');
                }}
              />
            ) : (
              <>
                {params.id && (
                  <ButtonLink
                    to={`/dashboards/svg/view/${params.id}`}
                    label={t('edit-svg-dashboard.buttons.preview')}
                    variant="secondary"
                  />
                )}

                <Button
                  variant="danger"
                  label={t('edit-svg-dashboard.buttons.remove')}
                  aria-haspopup="dialog"
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
