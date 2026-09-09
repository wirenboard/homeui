import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
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
import { ColumnsWrapper, useMaxColumns, MIN_COLUMN_WIDTH } from '@/components/columns-wrapper';
import { Confirm } from '@/components/confirm';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { dashboardsStore } from '@/stores/dashboards';
import { devicesStore } from '@/stores/devices';
import { useToggleFullscreen } from '@/utils/full-screen';
import { ColumnsEditor } from './components/columns-editor';
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
  const [isEditLayout, setIsEditLayout] = useState(false);
  const [draftWidgets, setDraftWidgets] = useState<string[][] | null>(null);
  const [draftColumnCount, setDraftColumnCount] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const dashboard = dashboards.get(params.id);

  const hasWidgets = dashboard?.flatWidgets.length > 0;

  const maxColumns = useMaxColumns(containerRef, hasWidgets);

  const actions = hasEditRights && !searchParams.has('hmi') && !isEditLayout ? [
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

  const startEditLayout = useCallback(() => {
    if (dashboard) {
      const cols = dashboard.options?.columns ?? null;
      setDraftColumnCount(cols);
      setDraftWidgets(dashboard.widgets.map((col) => [...col]));
    }
    setIsEditLayout(true);
  }, [dashboard]);

  const cancelEditLayout = useCallback(() => {
    setDraftWidgets(null);
    setDraftColumnCount(null);
    setIsEditLayout(false);
  }, []);

  const saveEditLayout = useCallback(() => {
    if (dashboard && draftWidgets) {
      dashboardsStore.saveDashboardLayout(
        dashboard.id,
        draftWidgets,
        draftColumnCount ?? undefined,
      );
    }
    setDraftWidgets(null);
    setDraftColumnCount(null);
    setIsEditLayout(false);
  }, [dashboard, draftWidgets, draftColumnCount]);

  const renderWidget = useCallback((widgetId: string) => {
    const widget = widgets.get(widgetId);
    if (!widget) return null;
    return (
      <Card
        id={widgetId}
        heading={widget.name}
        actions={actions}
        isBodyVisible
      >
        {widget.cells.map((cell, i) => (
          <Fragment key={cell.id || i}>
            {cells.has(cell.id) ? (
              <Cell
                cell={cells.get(cell.id)}
                name={cell.name}
                isReadOnly={cell.readOnly}
                isCompact={widget.compact}
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
    );
  }, [widgets, cells, actions]);

  const columnItems = useMemo(() => {
    if (!dashboard) return undefined;
    return dashboard.widgets.map((col) =>
      (Array.isArray(col) ? col : [col])
        .filter((widgetId) => widgets.has(widgetId))
        .map((widgetId) => <Fragment key={widgetId}>{renderWidget(widgetId)}</Fragment>),
    );
  }, [dashboard?.widgets, widgets, renderWidget]);

  const handleEditorChange = useCallback((newColumns: string[][], newColumnCount: number | null) => {
    setDraftWidgets(newColumns);
    setDraftColumnCount(newColumnCount);
  }, []);

  return (
    <>
      <PageLayout
        title={dashboard?.name || ''}
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
            {hasEditRights && !isFullscreen && !isEditLayout && (
              <Button
                label={t('dashboard.buttons.add-widget')}
                aria-haspopup="dialog"
                onClick={() => setIsAddWidgetModalOpened(true)}
              />
            )}
            {hasEditRights && !isFullscreen && dashboard?.flatWidgets.length > 0 && !isEditLayout && (
              <Button
                label={t('common.buttons.edit-layout')}
                variant="secondary"
                onClick={startEditLayout}
              />
            )}
            {isEditLayout && (
              <>
                <Button
                  label={t('common.buttons.cancel-layout')}
                  variant="secondary"
                  onClick={cancelEditLayout}
                />
                <Button
                  label={t('common.buttons.save-layout')}
                  onClick={saveEditLayout}
                />
              </>
            )}
            {!isEditLayout && (
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
            )}
          </>
        )}
        isHideHeader={!!searchParams.has('hmi')}
        isLoading={isLoading}
        hasRights
      >
        {dashboard?.flatWidgets.length ? (
          <div
            ref={containerRef}
            className={classNames('dashboard-container', {
              'dashboard-fullScreen': searchParams.has('hmi'),
            })}
          >
            {isEditLayout && draftWidgets ? (
              <ColumnsEditor
                columns={draftWidgets}
                columnCount={draftColumnCount}
                maxColumns={maxColumns}
                renderWidget={renderWidget}
                onChange={handleEditorChange}
              />
            ) : (
              <ColumnsWrapper
                baseColumnWidth={MIN_COLUMN_WIDTH}
                columnCount={dashboard.options?.columns}
                columnItems={dashboard.options?.columns ? columnItems : undefined}
              >
                {dashboard.flatWidgets.map((widgetId) => widgets.get(widgetId) ? (
                  <Fragment key={widgetId}>
                    {renderWidget(widgetId)}
                  </Fragment>
                ) : null)}
              </ColumnsWrapper>
            )}
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
            dashboard={dashboard}
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
