import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { Fragment, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import EditIcon from '@/assets/icons/edit.svg';
import FullScreenExitIcon from '@/assets/icons/full-screen-exit.svg';
import FullScreenIcon from '@/assets/icons/full-screen.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Cell } from '@/components/cell';
import { Confirm } from '@/components/confirm';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { useToggleFullscreen } from '@/utils/fullScreen';
import { useParseHash } from '@/utils/url';
import { WidgetAdd } from './components/widget-add';
import { WidgetEdit } from './components/widget-edit';
import type { DashboardPageProps } from './types';
import './styles.css';

const DashboardPage = observer(({ dashboardStore, devicesStore, hasEditRights }: DashboardPageProps) => {
  const { t } = useTranslation();
  const { cells } = devicesStore;
  const { dashboards, widgets, loadData, isLoading } = dashboardStore;
  const { page: dashboardId, params } = useParseHash();
  const [isFullscreen, toggleFullscreen] = useToggleFullscreen();
  const [isAddWidgetModalOpened, setIsAddWidgetModalOpened] = useState(false);
  const [removedWidgetId, setRemovedWidgetId] = useState(null);
  const [editingWidgetId, setEditingWidgetId] = useState(null);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    setTimeout(() => {
      loadData().catch((error) => {
        if (error.data === 'MqttConnectionError') {
          console.log(22222, error);
          setErrors([{ variant: 'danger', text: t('dashboard.errors.mqtt-connection') }]);
        }
      });
    }, 500);
  }, [dashboardId]);

  const actions = hasEditRights ? [
    {
      title: t('dashboard.buttons.remove-widget'), action: (id: string) => {
        setRemovedWidgetId(id);
      }, icon: TrashIcon,
    },
    {
      title: t('dashboard.buttons.edit-widget'), action: (id: string) => setEditingWidgetId(id), icon: EditIcon,
    },
  ] : [];

  const returnToPreviousPage = () => {
    let url = `/#!/dashboards/svg/view/${params.get('sourceDashboardId')}`;

    if (params.has('hmi')) {
      url += '?hmi';

      if (params.get('hmicolor')) {
        url += `&hmicolor=${params.get('hmicolor')}`;
      }
    }
    location.assign(url);
  };

  return (
    <>
      <PageLayout
        title={dashboards.get(dashboardId)?.name || ''}
        actions={!params.has('fullscreen') && (
          <>
            {params.get('sourceDashboardId') && (
              <Button
                label={t('dashboard.buttons.back-to-dashboard')}
                variant="secondary"
                onClick={returnToPreviousPage}
              />
            )}
            {hasEditRights && !isFullscreen && (
              <Button
                label={t('dashboard.buttons.add-widget')}
                variant="success"
                onClick={() => setIsAddWidgetModalOpened(true)}
              />
            )}
            <Tooltip
              text={isFullscreen ? t('dashboard.buttons.fullscreen-exit') : t('dashboard.buttons.fullscreen')}
              placement="bottom-start"
            >
              <Button
                icon={isFullscreen ? <FullScreenExitIcon/> : <FullScreenIcon/>}
                variant="secondary"
                onClick={() => toggleFullscreen()}
              />
            </Tooltip>
          </>
        )}
        isHideHeader={!!params.has('hmi')}
        isLoading={isLoading}
        errors={errors}
        hasRights
      >
        {dashboards.get(dashboardId)?.widgets.length ? (
          <div
            className={classNames('dashboard-container', {
              'dashboard-fullScreen': params.has('hmi'),
            })}
          >
            {dashboards.get(dashboardId).widgets.map((widgetId) => widgets.get(widgetId) ? (
              <Card
                id={widgetId}
                heading={widgets.get(widgetId)?.name}
                key={widgetId}
                actions={actions}
                isBodyVisible
              >
                {widgets.get(widgetId).cells.map((cell, i) => (
                  <Fragment key={cell.id || i}>
                    {cells.has(cell.id) ? (
                      <Cell
                        cell={cells.get(cell.id)}
                        name={cell.name}
                        isCompact={widgets.get(widgetId).compact}
                        extra={cell.extra}
                      />
                    ) : cell.id?.startsWith('separator') ? (
                      <div className="dashboard-separator">
                        {!!cell.name && <span className="dashboard-separatorTitle">{cell.name}</span>}
                      </div>
                    )
                      : cell.name || 'nosuchcell'
                    }
                  </Fragment>
                ))}
              </Card>
            ) : null)}
          </div>
        ) : !errors.length && (
          <Alert variant="info" style={{ width: '100%' }}>
            {t('dashboard.labels.no-widgets')}
          </Alert>
        )}

        {params.get('sourceDashboardId') && params.has('hmi') && (
          <Button
            className="dashboard-backButton"
            label={t('dashboard.buttons.back-to-dashboard')}
            variant="secondary"
            onClick={returnToPreviousPage}
          />
        )}

        {isAddWidgetModalOpened && (
          <WidgetAdd
            widgets={widgets}
            dashboard={dashboards.get(dashboardId)}
            cells={cells}
            isOpened={isAddWidgetModalOpened}
            controls={devicesStore.controls}
            onClose={() => setIsAddWidgetModalOpened(false)}
          />
        )}

        {!!removedWidgetId && (
          <Confirm
            isOpened={!!removedWidgetId}
            heading={t('dashboard.prompt.remove-title')}
            variant="danger"
            closeCallback={() => setRemovedWidgetId(null)}
            confirmCallback={() => {
              dashboardStore.removeWidgetFromDashboard(dashboardId, removedWidgetId);
              setRemovedWidgetId(null);
            }}
          >
            <Trans
              i18nKey="dashboard.prompt.remove-description"
              values={{
                name: widgets.get(removedWidgetId)?.name,
              }}
              components={[<b key="widget-name"/>]}
              shouldUnescape
            />
          </Confirm>
        )
        }
      </PageLayout>

      {editingWidgetId && (
        <WidgetEdit
          widget={widgets.get(editingWidgetId)}
          cells={cells}
          dashboard={dashboards.get(dashboardId)}
          controls={devicesStore.controls}
          isOpened={!!editingWidgetId}
          onClose={() => setEditingWidgetId(null)}
          onSave={(data) => {
            widgets.get(editingWidgetId).save(data);
            setEditingWidgetId(null);
          }}
        />
      )}
    </>
  );
});

export default DashboardPage;
