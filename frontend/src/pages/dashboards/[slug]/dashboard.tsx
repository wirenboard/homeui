import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { Fragment, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import EditIcon from '@/assets/icons/edit.svg';
import FullScreenExitIcon from '@/assets/icons/full-screen-exit.svg';
import FullScreenIcon from '@/assets/icons/full-screen.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { documentation } from '@/common/links';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Cell } from '@/components/cell';
import { ColumnsWrapper } from '@/components/columns-wrapper';
import { Confirm } from '@/components/confirm';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { dashboardsStore } from '@/stores/dashboards';
import { devicesStore } from '@/stores/devices';
import { useToggleFullscreen } from '@/utils/full-screen';
import { WidgetAdd } from './components/widget-add';
import { WidgetEdit } from './components/widget-edit';
import './styles.css';

const DashboardPage = observer(() => {
  const { t, i18n } = useTranslation();
  const { cells } = devicesStore;
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dashboards, widgets, isLoading } = dashboardsStore;
  const hasEditRights = authStore.hasRights(UserRole.Operator);
  const [isFullscreen, toggleFullscreen] = useToggleFullscreen();
  const [isAddWidgetModalOpened, setIsAddWidgetModalOpened] = useState(false);
  const [removedWidgetId, setRemovedWidgetId] = useState(null);
  const [editingWidgetId, setEditingWidgetId] = useState(null);

  const actions = hasEditRights && !searchParams.has('hmi') ? [
    {
      title: t('dashboard.buttons.remove-widget'), action: (id: string) => setRemovedWidgetId(id),
      icon: TrashIcon,
      isPopupAction: true,
    },
    {
      title: t('dashboard.buttons.edit-widget'),
      action: (id: string) => setEditingWidgetId(id),
      icon: EditIcon,
      isPopupAction: true,
    },
  ] : [];

  const returnToPreviousPage = () => {
    let url = `/dashboards/svg/view/${searchParams.get('sourceDashboardId')}`;

    if (searchParams.has('hmi')) {
      url += '?hmi';

      if (searchParams.get('hmicolor')) {
        url += `&hmicolor=${searchParams.get('hmicolor')}`;
      }
    }
    navigate(url);
  };

  return (
    <>
      <PageLayout
        title={dashboards.get(params.id)?.name || ''}
        infoLink={documentation[i18n.language]?.dashboards}
        actions={!searchParams.has('fullscreen') && (
          <>
            {searchParams.get('sourceDashboardId') && (
              <Button
                label={t('dashboard.buttons.back-to-dashboard')}
                variant="secondary"
                onClick={returnToPreviousPage}
              />
            )}
            {hasEditRights && !isFullscreen && (
              <Button
                label={t('dashboard.buttons.add-widget')}
                aria-haspopup="dialog"
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
                aria-label={isFullscreen ? t('dashboard.buttons.fullscreen-exit') : t('dashboard.buttons.fullscreen')}
                onClick={() => toggleFullscreen()}
              />
            </Tooltip>
          </>
        )}
        isHideHeader={!!searchParams.has('hmi')}
        isLoading={isLoading}
        hasRights
      >
        {dashboards.get(params.id)?.widgets.length ? (
          <div
            className={classNames('dashboard-container', {
              'dashboard-fullScreen': searchParams.has('hmi'),
            })}
          >
            <ColumnsWrapper baseColumnWidth={376}>
              {dashboards.get(params.id).widgets.map((widgetId) => widgets.get(widgetId) ? (
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
                          isReadOnly={cell.readOnly}
                          isCompact={widgets.get(widgetId).compact}
                          extra={cell.extra}
                        />
                      ) : cell.type === 'separator' ? (
                        <div className="dashboard-separator">
                          {!!cell.name && <span className="dashboard-separatorTitle">{cell.name}</span>}
                        </div>
                      )
                        : <div>{cell.name || 'nosuchcell'}</div>
                      }
                    </Fragment>
                  ))}
                </Card>
              ) : null)}
            </ColumnsWrapper>
          </div>
        ) : (
          <Alert variant="info" style={{ width: '100%' }}>
            {t('dashboard.labels.no-widgets')}
          </Alert>
        )}

        {searchParams.get('sourceDashboardId') && searchParams.has('hmi') && (
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
            dashboard={dashboards.get(params.id)}
            cells={cells}
            isOpened={isAddWidgetModalOpened}
            topics={devicesStore.topicsWithoutSystem}
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
              dashboardsStore.removeWidgetFromDashboard(params.id, removedWidgetId);
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
          topics={devicesStore.topicsWithoutSystem}
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
