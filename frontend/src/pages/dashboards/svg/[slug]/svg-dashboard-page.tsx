import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useResizeObserver from 'use-resize-observer';
import FullScreenExitIcon from '@/assets/icons/full-screen-exit.svg';
import FullScreenIcon from '@/assets/icons/full-screen.svg';
import { Button } from '@/components/button';
import { Confirm, useConfirm } from '@/components/confirm';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { useToggleFullscreen } from '@/utils/fullScreen';
import { useParseHash } from '@/utils/url';
import { DashboardCarousel } from './components/dashboard-carousel';
import { SvgView } from './components/svg-view';
import { type SvgDashboardPageProps } from './types';
import './styles.css';

export const SvgDashboardPage = observer(({ store, dashboardsStore, devicesStore }: SvgDashboardPageProps) => {
  const { ref, width } = useResizeObserver();
  const { t } = useTranslation();
  const [isFullscreen, toggleFullscreen] = useToggleFullscreen();
  const [ confirm, isConfirmOpened, handleConfirm, handleClose ] = useConfirm<any>();
  const { params, id } = useParseHash();
  const { hasRights } = authStore;

  useEffect(() => {
    if (devicesStore.cells.size) {
      store.setDeviceData(devicesStore.cells, devicesStore);
    }
  }, [devicesStore.topics]);

  useEffect(() => {
    if (dashboardsStore.dashboardsList.length) {
      store.setDashboards(dashboardsStore.dashboardsList);
      store.setDashboard(id);
    }
  }, [id, dashboardsStore.dashboardsList]);

  useEffect(() => {
    store.setMoveToDashboardFn((dashboardId: string, sourceDashboardId: string) => {
      const dashboard = store.dashboardConfigs.find((d) => d.id === dashboardId);
      let url = dashboard.isSvg ? `/#!/dashboards/svg/view/${dashboardId}` : `/#!/dashboards/${dashboardId}`;

      const getConcatSymbol = () => url.includes('?') ? '&' : '?';

      if (dashboard) {
        if (params.has('fullscreen')) {
          url += `?fullscreen=${params.get('fullscreen')}`;
        }
        if (params.has('hmi')) {
          url += `${getConcatSymbol()}hmi=${params.get('hmi')}`;
          if (params.has('hmicolor')) {
            url += `${getConcatSymbol()}hmicolor=${params.get('hmicolor')}`;
          }
        }
        if (!dashboard.isSvg) {
          url += `${getConcatSymbol()}sourceDashboardId=${sourceDashboardId}`;
        }
        location.assign(url);
      }
    });
  }, []);

  useEffect(() => () => store.unsubscribeAll(), [id]);

  return (
    <>
      <PageLayout
        title={store.getDashboard(id)?.name}
        isLoading={store.loading}
        actions={
          <>
            {hasRights(UserRole.Operator) && !(isFullscreen || params.has('fullscreen')) && (
              <a href={`#!/dashboards/svg/edit/${id}`}>
                <Button
                  variant="primary"
                  type="button"
                  label={t('svg-dashboard.buttons.edit')}
                />
              </a>
            )}

            {!params.has('fullscreen') && (
              <Tooltip
                text={isFullscreen
                  ? t('svg-dashboard.buttons.exit-fullscreen')
                  : t('svg-dashboard.buttons.fullscreen')}
                placement="bottom-start"
              >
                <Button
                  icon={isFullscreen ? <FullScreenExitIcon/> : <FullScreenIcon/>}
                  variant="secondary"
                  onClick={() => toggleFullscreen()}
                />
              </Tooltip>
            )}
          </>
        }
        isHideHeader={!!params.has('hmi')}
        hasRights
      >
        <DashboardCarousel store={store} width={width}>
          {store.dashboards.map((dashboard) => (
            <div className="svgDashboard" key={dashboard.id}>
              <SvgView
                id={dashboard.id}
                svg={dashboard?.svg?.current}
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
            </div>
          ))}
        </DashboardCarousel>
      </PageLayout>
      <div ref={ref}></div>
      {isConfirmOpened && (
        <Confirm
          isOpened={isConfirmOpened}
          heading={t('svg-dashboard.prompt.confirm-heading')}
          closeCallback={handleClose}
          confirmCallback={handleConfirm}
        >
          {t('svg-dashboard.prompt.confirm-question')}
        </Confirm>
      )}
    </>
  );
});

export default SvgDashboardPage;
