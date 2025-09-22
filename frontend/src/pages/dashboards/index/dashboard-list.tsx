import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ReactSortable } from 'react-sortablejs';
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
import { DashboardEdit } from './components/dashboard-edit';
import type { DashboardListPageProps } from './types';
import './styles.css';

const DashboardList = observer(({ dashboardStore, hasEditRights }: DashboardListPageProps) => {
  const { t } = useTranslation();
  const {
    dashboards,
    loadData,
    isLoading,
    setLoading,
    addDashboard,
    updateDashboards,
    updateDashboard,
  } = dashboardStore;
  const [deletedDashboardId, setDeletedDashboardId] = useState(null);
  const [editedDashboardId, setEditedDashboardId] = useState(null);
  const [errors, setErrors] = useState([]);
  const dashboardsList = useMemo(() => Array.from(dashboards.values()), [dashboards.values()]);

  useEffect(() => {
    let interval = null;
    let attempt = 0;

    // Sometimes the request finishes before the MQTT connection is established.
    // In that case we retry every 3 seconds until success.
    // The error message is displayed starting from the second attempt.
    const fetchData = () => {
      attempt++;
      loadData()
        .then(() => {
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
          setErrors([]);
        })
        .catch((error: any) => {
          if (attempt > 1 && error.data === 'MqttConnectionError') {
            setLoading(false);
            setErrors([{ variant: 'danger', text: t('dashboard.errors.mqtt-connection') }]);
          }
          if (!interval && error.data === 'MqttConnectionError') {
            interval = setInterval(fetchData, 3000);
          }
        });
    };

    fetchData();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <>
      <PageLayout
        title={t('dashboards.title')}
        isLoading={isLoading}
        errors={errors}
        actions={
          hasEditRights && (
            <Dropdown
              value={null}
              options={[{ label: t('dashboards.labels.text'), value: 'dashboard' }, { label: 'Svg', value: 'svg' }]}
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
              {hasEditRights && dashboardsList.length > 1 && (
                <TableCell width={24} />
              )}
              <TableCell width={15}>#</TableCell>
              <TableCell>{t('dashboards.labels.name')}</TableCell>
              {hasEditRights && (
                <TableCell width={40} />
              )}
              {hasEditRights && (
                <TableCell width={40} />
              )}
              {dashboardsList.some((dashboard) => dashboard.isSvg) && (
                <TableCell width={30}>SVG</TableCell>
              )}
              {hasEditRights && <TableCell width={55}>В меню</TableCell>}
            </TableRow>

            <ReactSortable
              list={dashboardsList}
              setList={(value, changed) => {
                if (changed) {
                  const clearValue = value.map((dashboard: any) => {
                    const { chosen, selected, ...value } = dashboard;
                    return value;
                  });
                  updateDashboards(clearValue);
                }
              }}
              handle=".dashboardList-sortHandle"
              animation={150}
            >
              {dashboardsList.map((dashboard, i) => (
                <TableRow
                  url={dashboard.isSvg
                    ? `/#!/dashboards/svg/view/${dashboard.id}`
                    : `/#!/dashboards/${dashboard.id}`}
                  key={dashboard.id}
                >
                  {hasEditRights && dashboardsList.length > 1 && (
                    <TableCell width={24}>
                      <MoveIcon className="dashboardList-sortHandle" />
                    </TableCell>
                  )}
                  <TableCell width={15}>
                    {i + 1}
                  </TableCell>

                  <TableCell ellipsis>
                    {dashboard.name}
                  </TableCell>

                  {hasEditRights && (
                    <TableCell width={40} visibleOnHover preventClick>
                      <Tooltip text={t('dashboards.buttons.edit')} placement="top">
                        <Button
                          className="rules-icon"
                          size="small"
                          variant="secondary"
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
                    <TableCell width={40} visibleOnHover preventClick>
                      <Tooltip text={t('dashboards.buttons.delete')} placement="top">
                        <Button
                          className="rules-icon"
                          size="small"
                          variant="secondary"
                          icon={<TrashIcon />}
                          aria-label={`${t('dashboards.buttons.delete')}`}
                          onClick={() => setDeletedDashboardId(dashboard.id)}
                        />
                      </Tooltip>
                    </TableCell>
                  )}

                  {dashboardsList.some((dashboard) => dashboard.isSvg) && (
                    <TableCell width={30} className="dashboardList-iconWrapper">
                      {dashboard.isSvg && <CheckIcon className="dashboardList-icon" />}
                    </TableCell>
                  )}

                  {hasEditRights && (
                    <TableCell width={55} className="dashboardList-cellContainer" preventClick>
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
