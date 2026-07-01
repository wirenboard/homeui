import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import useResizeObserver from 'use-resize-observer';
import FullScreenExitIcon from '@/assets/icons/full-screen-exit.svg';
import FullScreenIcon from '@/assets/icons/full-screen.svg';
import { documentation } from '@/common/links';
import { Alert } from '@/components/alert';
import { Button, ButtonLink } from '@/components/button';
import { Confirm, useConfirm } from '@/components/confirm';
import { Loader } from '@/components/loader';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { useToggleFullscreen } from '@/utils/full-screen';
import { useStore } from '@/utils/use-store';
import { DashboardCarousel } from './components/dashboard-carousel';
import { SvgView } from './components/svg-view';
import { SvgDashboardPageStore } from './store';
import './styles.css';

export const SvgDashboardPage = observer(() => {
  const { ref, width } = useResizeObserver();
  const { t, i18n } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const store = useStore(() => new SvgDashboardPageStore());
  const [isFullscreen, toggleFullscreen] = useToggleFullscreen();
  const [ confirm, isConfirmOpened, handleConfirm, handleClose ] = useConfirm<any>();
  const { hasRights } = authStore;

  useEffect(() => {
    if (store.dashboardConfigs.length) {
      store.setDashboard(params.id);
    }
  }, [params.id, store.dashboardConfigs]);

  useEffect(() => {
    store.setMoveToDashboardFn((dashboardId: string, sourceDashboardId: string) => {
      const dashboard = store.dashboardConfigs.find((d) => d.id === dashboardId);
      if (!dashboard) {
        return;
      }

      const base = dashboard.isSvg
        ? `/dashboards/svg/view/${dashboardId}`
        : `/dashboards/${dashboardId}`;

      const query = new URLSearchParams();

      if (searchParams.has('fullscreen')) {
        const val = searchParams.get('fullscreen') || 'true';
        query.append('fullscreen', val);
      }

      if (searchParams.has('hmi')) {
        const val = searchParams.get('hmi') || 'true';
        query.append('hmi', val);

        if (searchParams.has('hmicolor')) {
          query.append('hmicolor', searchParams.get('hmicolor')!);
        }
      }

      if (!dashboard.isSvg) {
        query.append('sourceDashboardId', sourceDashboardId);
      }

      const url = query.toString()
        ? `${base}?${query.toString()}`
        : base;

      navigate(url);
    });
  }, []);

  useEffect(() => () => {
    const isPageDestroy = !location.hash.startsWith('/dashboards/svg/view');
    store.unsubscribeAll(isPageDestroy);
  }, []);

  return (
    <>
      <PageLayout
        title={store.getDashboard(params.id)?.name}
        infoLink={documentation[i18n.language]?.svgdashboard}
        isLoading={store.loading}
        actions={
          <>
            {hasRights(UserRole.Operator) && !(isFullscreen || searchParams.has('fullscreen')) && (
              <ButtonLink
                to={`/dashboards/svg/edit/${params.id}`}
                type="button"
                label={t('svg-dashboard.buttons.edit')}
              />
            )}

            {!searchParams.has('fullscreen') && (
              <Tooltip
                text={isFullscreen
                  ? t('svg-dashboard.buttons.exit-fullscreen')
                  : t('svg-dashboard.buttons.fullscreen')}
                placement="bottom-start"
              >
                <Button
                  icon={isFullscreen ? <FullScreenExitIcon/> : <FullScreenIcon/>}
                  variant="secondary"
                  aria-label={isFullscreen
                    ? t('svg-dashboard.buttons.exit-fullscreen')
                    : t('svg-dashboard.buttons.fullscreen')}
                  onClick={() => toggleFullscreen()}
                />
              </Tooltip>
            )}
          </>
        }
        isHideHeader={!!searchParams.has('hmi')}
        hasRights
      >
        <DashboardCarousel store={store} width={width}>
          {store.dashboards.map((dashboard) => {
            let content;
            if (store.svgErrors.has(dashboard.id)) {
              content = (
                <Alert variant="danger">
                  <div className="svgDashboard-error">
                    <span>{t('dashboards.errors.svg-load')}</span>
                    <Button
                      variant="secondary"
                      size="small"
                      label={t('svg-dashboard.buttons.retry')}
                      onClick={() => store.reloadSvg(dashboard.id)}
                    />
                  </div>
                </Alert>
              );
            } else if (store.isSvgLoading(dashboard.id)) {
              content = <Loader />;
            } else {
              content = (
                <SvgView
                  id={dashboard.id}
                  svg={store.getSvg(dashboard.id)}
                  className={classNames({
                    'svgDashboard-fitToPage': !!dashboard?.svg_fullwidth,
                  })}
                  params={dashboard?.svg?.params}
                  values={store.channelValues}
                  currentDashboard={store.dashboardId}
                  confirmHandler={confirm}
                  onSwitchValue={(channel, value) => store.switchValue(channel, value)}
                  onMoveToDashboard={(dashboard) => store.moveToDashboard(dashboard)}
                />
              );
            }
            return (
              <div className="svgDashboard" key={dashboard.id}>
                {content}
              </div>
            );
          })}
        </DashboardCarousel>
      </PageLayout>
      <div ref={ref}></div>
      {isConfirmOpened && (
        <Confirm
          isOpened={isConfirmOpened}
          heading={t('svg-dashboard.prompt.confirm-heading')}
          closeCallback={() => handleClose(false)}
          confirmCallback={() => handleConfirm(true)}
        >
          {t('svg-dashboard.prompt.confirm-question')}
        </Confirm>
      )}
    </>
  );
});

export default SvgDashboardPage;
