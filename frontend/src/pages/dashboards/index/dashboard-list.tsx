import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { ReactSortable } from 'react-sortablejs';
import useResizeObserver from 'use-resize-observer';
import CheckIcon from '@/assets/icons/check.svg';
import EditIcon from '@/assets/icons/edit.svg';
import MoveIcon from '@/assets/icons/move.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { Dropdown } from '@/components/dropdown';
import { Switch } from '@/components/switch';
import { Table, TableCell, TableRow } from '@/components/table';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { DashboardEdit } from './components/dashboard-edit';
import type { DashboardListPageProps } from './types';
import './styles.css';

const DashboardList = observer(({ dashboardsStore }: DashboardListPageProps) => {
  const { t } = useTranslation();
  const { ref, width } = useResizeObserver();
  const isDesktop = useMediaQuery({ minWidth: 874 });
  const {
    dashboards,
    isLoading,
    addDashboard,
    updateDashboards,
    updateDashboard,
  } = dashboardsStore;
  const hasEditRights = authStore.hasRights(UserRole.Operator);
  const [deletedDashboardId, setDeletedDashboardId] = useState(null);
  const [editedDashboardId, setEditedDashboardId] = useState(null);
  const dashboardsList = useMemo(() => Array.from(dashboards.values()), [dashboards.values()]);

  return (
    <>
      <PageLayout
        title={t('dashboards.title')}
        isLoading={isLoading}
        actions={
          hasEditRights && (
            <Dropdown
              value={null}
              options={[
                { label: t('dashboards.labels.text-dashboard'), value: 'dashboard' },
                { label: 'Svg', value: 'svg' },
              ]}
              placeholder={t('dashboards.buttons.add')}
              isButton
              onChange={(option) => {
                if (option?.value === 'svg') {
                  location.assign('/#!/dashboards/svg/add');
                } else if (option?.value === 'dashboard') {
                  setEditedDashboardId(Symbol('new'));
                }
              }}
            />
          )
        }
        hasRights
      >
        {dashboardsList.length ? (
          <Table>
            <TableRow isHeading>
              {hasEditRights && dashboardsList.length > 1 && width >= 480 && (
                <TableCell width={24} />
              )}
              <TableCell>{t('dashboards.labels.name')}</TableCell>
              {hasEditRights && (
                <TableCell width={40} />
              )}
              {hasEditRights && (
                <TableCell width={40} />
              )}
              {dashboardsList.some((dashboard) => dashboard.isSvg) && (
                <TableCell width={30} align="center">SVG</TableCell>
              )}
              {hasEditRights && <TableCell width={70}>{t('dashboards.labels.in-menu')}</TableCell>}
            </TableRow>

            <ReactSortable
              tag="tbody"
              list={dashboardsList}
              setList={(value, changed) => {
                if (changed) {
                  const clearValue = value.map((dashboard: any) => {
                    // eslint-disable-next-line no-unused-vars
                    const { chosen, selected, ...value } = dashboard;
                    return value;
                  });
                  updateDashboards(clearValue);
                }
              }}
              handle=".dashboardList-sortHandle"
              animation={150}
            >
              {dashboardsList.map((dashboard) => (
                <TableRow
                  url={dashboard.isSvg
                    ? `/#!/dashboards/svg/view/${dashboard.id}`
                    : `/#!/dashboards/${dashboard.id}`}
                  key={dashboard.id}
                >
                  {hasEditRights && dashboardsList.length > 1 && width >= 480 && (
                    <TableCell width={24} isDraggable>
                      <MoveIcon className="dashboardList-sortHandle" />
                    </TableCell>
                  )}

                  <TableCell ellipsis>
                    {dashboard.name}
                  </TableCell>

                  {hasEditRights && (
                    <TableCell width={30} align="center" visibleOnHover={isDesktop} preventClick>
                      <Tooltip text={t('dashboards.buttons.edit')} placement="top">
                        <Button
                          size="small"
                          icon={<EditIcon />}
                          aria-label={`${t('dashboards.buttons.edit')}`}
                          onClick={() => {
                            if (dashboard.isSvg) {
                              location.assign(`/#!/dashboards/svg/edit/${dashboard.id}`);
                            } else {
                              setEditedDashboardId(dashboard.id);
                            }
                          }}
                        />
                      </Tooltip>
                    </TableCell>
                  )}

                  {hasEditRights && (
                    <TableCell width={30} align="center" visibleOnHover={isDesktop} preventClick>
                      <Tooltip text={t('dashboards.buttons.delete')} placement="top">
                        <Button
                          size="small"
                          variant="danger"
                          icon={<TrashIcon />}
                          aria-label={`${t('dashboards.buttons.delete')}`}
                          onClick={() => setDeletedDashboardId(dashboard.id)}
                        />
                      </Tooltip>
                    </TableCell>
                  )}

                  {dashboardsList.some((dashboard) => dashboard.isSvg) && (
                    <TableCell align="center">
                      {dashboard.isSvg && <CheckIcon className="dashboardList-icon" />}
                    </TableCell>
                  )}

                  {hasEditRights && (
                    <TableCell align="right" preventClick>
                      <Tooltip
                        text={t(dashboard.options?.isHidden
                          ? 'dashboards.buttons.hidden'
                          : 'dashboards.buttons.visible')}
                        placement="left"
                      >
                        <Switch
                          id={`visibility-${dashboard.id}`}
                          value={dashboard.options?.isHidden ? !dashboard.options?.isHidden : true}
                          onChange={() => dashboard.toggleVisibility()}
                        />
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </ReactSortable>
          </Table>
        ) : (
          <Alert variant="info">
            {t('dashboards.labels.empty-list')}
          </Alert>
        )}
      </PageLayout>

      <div ref={ref}></div>

      {!!deletedDashboardId && (
        <Confirm
          isOpened={!!deletedDashboardId}
          heading={t('dashboards.prompt.delete-title')}
          variant="danger"
          acceptLabel={t('dashboards.buttons.delete')}
          closeCallback={() => setDeletedDashboardId(null)}
          confirmCallback={async() => {
            await dashboards.get(deletedDashboardId).delete();
            setDeletedDashboardId(null);
          }}
        >
          <Trans
            i18nKey="dashboards.prompt.delete-description"
            values={{
              name: dashboards.get(deletedDashboardId)?.name,
            }}
            components={[<b key="dashboard-name"/>]}
            shouldUnescape
          />
        </Confirm>
      )}
      {editedDashboardId && (
        <DashboardEdit
          dashboard={dashboards?.get(editedDashboardId)}
          dashboards={dashboardsList}
          isOpened
          onClose={() => setEditedDashboardId(null)}
          onSave={async (data, isNew) => {
            if (isNew) {
              await addDashboard(data);
            } else {
              await updateDashboard(editedDashboardId, { ...dashboards?.get(data.id), ...data });
            }
            setEditedDashboardId(null);
          }}
        />
      )}
    </>
  );
});

export default DashboardList;
