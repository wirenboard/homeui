import { observer } from 'mobx-react-lite';
import { Fragment, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import EditIcon from '@/assets/icons/edit.svg';
import CardIcon from '@/assets/icons/file-list.svg';
import ListIcon from '@/assets/icons/list.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Cell, CellHistory } from '@/components/cell';
import { Dropdown, type Option } from '@/components/dropdown';
import { Table, TableCell, TableRow } from '@/components/table';
import { Tooltip } from '@/components/tooltip';
import { PageLayout, type PageProps } from '@/layouts/page';
import { WidgetDelete, WidgetEdit } from '@/pages/dashboards/[slug]';
import { authStore, UserRole } from '@/stores/auth';
import { dashboardsStore, Widget } from '@/stores/dashboards';
import { devicesStore } from '@/stores/devices';
import { PageView } from './types';
import './styles.css';

const WidgetsPage = observer(() => {
  const { t } = useTranslation();
  const { cells } = devicesStore;
  const [view, setView] = useState(PageView.List);
  const [isHideAlert, setIsHideAlert] = useState(localStorage.getItem('hide-widgets-alert') === 'true');
  const [widgetToDelete, setWidgetToDelete] = useState(null);
  const [widgetToEdit, setWidgetToEdit] = useState(null);

  const errors = useMemo(() => {
    const messages: PageProps['errors'] = [];
    if (dashboardsStore.isLoading) {
      return messages;
    }

    if (!dashboardsStore.isShowWidgetsPage && !isHideAlert) {
      messages.push({
        variant: 'info',
        text: (<Trans i18nKey="widgets.errors.hidden" components={[<Link to="/web-ui" />]}/>),
        onClose: () => {
          setIsHideAlert(true);
          localStorage.setItem('hide-widgets-alert', 'true');
        },
      });
    }

    if (!Array.from(dashboardsStore.widgets.values()).length) {
      messages.push({ variant: 'info', text: t('widgets.errors.empty') });
    }

    return messages;
  }, [dashboardsStore.isLoading, dashboardsStore.isShowWidgetsPage, dashboardsStore.widgets.values()]);

  return (
    <>
      <PageLayout
        title={t('widgets.title')}
        isLoading={dashboardsStore.isLoading}
        errors={errors}
        actions={
          !!Array.from(dashboardsStore.widgets.values()).length && (
            <Tooltip
              text={t(view === PageView.List ? 'widgets.buttons.widget-view' : 'widgets.buttons.table-view')}
              placement="bottom"
            >
              <Button
                icon={view === PageView.List ? <CardIcon /> : <ListIcon />}
                aria-label={t(view === PageView.List ? 'widgets.buttons.widget-view' : 'widgets.buttons.table-view')}
                variant="secondary"
                onClick={() => setView(view === PageView.List ? PageView.Card : PageView.List)}
              />
            </Tooltip>
          )
        }
        hasRights
      >
        {!!Array.from(dashboardsStore.widgets.values()).length && (
          <Table>
            <TableRow isHeading>
              <TableCell width={250}>{t('widgets.labels.name-and-description')}</TableCell>
              {view === PageView.List && (<TableCell>{t('widgets.labels.cells')}</TableCell>)}
              {view === PageView.List && (<TableCell width={100}>{t('widgets.labels.types')}</TableCell>)}
              {view === PageView.List && (<TableCell width={200}>{t('widgets.labels.values')}</TableCell>)}
              {view === PageView.List && (<TableCell width={60}>{t('widgets.labels.graph')}</TableCell>)}
              {view === PageView.Card && (<TableCell>{t('widgets.labels.preview')}</TableCell>)}
              <TableCell width={250}>{t('widgets.labels.dashboards')}</TableCell>
              {authStore.hasRights(UserRole.Operator) && (<TableCell width={80} />)}
            </TableRow>
            {Array.from(dashboardsStore.widgets.values()).map((widget) => (
              <TableRow key={widget.id}>
                <TableCell width={250} verticalAlign="top">
                  <b>{widget.name}</b>
                  <div className="widgets-description">{widget.description}</div>
                </TableCell>
                {view === PageView.List && (
                  <TableCell>
                    {widget.cells.map((cell) => (
                      <div className="widgets-cellItem" key={cell.id}>{cell.name}</div>
                    ))}
                  </TableCell>
                )}
                {view === PageView.List && (
                  <TableCell width={100}>
                    {widget.cells.map((cell) => (
                      <div className="widgets-cellItem" key={cell.id}>{cell.type}</div>
                    ))}
                  </TableCell>
                )}
                {view === PageView.List && (
                  <TableCell align="left" width={200}>
                    {widget.cells.map((cell) => (
                      <div className="widgets-cellItem" key={cell.id}>
                        {cells.get(cell.id) ? (
                          <Cell
                            cell={cells.get(cell.id)}
                            name={cell.name}
                            hideHistory
                            isCompact
                          />
                        ) : (
                          <div className="widgets-cellItem"></div>
                        )}
                      </div>
                    ))}
                  </TableCell>
                )}
                {view === PageView.List && (
                  <TableCell width={60}>
                    {widget.cells.map((cell) => (
                      <div className="widgets-cellItem" key={cell.id}>
                        {cells.get(cell.id) && <CellHistory cell={cells.get(cell.id)} key={cell.id} isVisible />}
                      </div>
                    ))}
                  </TableCell>
                )}

                {view === PageView.Card && (
                  <TableCell>
                    <Card
                      className="widgets-card"
                      heading={widget.name}
                      key={widget.id}
                      isBodyVisible
                    >
                      {widget.cells.map((cell, i) => (
                        <Fragment key={cell.id || i}>
                          {cells.has(cell.id) ? (
                            <Cell
                              cell={cells.get(cell.id)}
                              name={cell.name}
                              isCompact={dashboardsStore.widgets.get(widget.id).compact}
                              extra={cell.extra}
                            />
                          ) : cell.type === 'separator' ? (
                            <div className="dashboard-separator">
                              {!!cell.name && (
                                <span className="dashboard-separatorTitle">
                                  {cell.name}
                                </span>
                              )}
                            </div>
                          )
                            : cell.name || 'nosuchcell'
                          }
                        </Fragment>
                      ))}
                    </Card>
                  </TableCell>
                )}
                <TableCell width={250} verticalAlign="top">
                  {!!widget.associatedDashboards.length && (
                    <>
                      <ul className="widgets-dashboardList">
                        {widget.associatedDashboards.map((item) => (
                          <li key={item.id}>
                            <Link to={`/dashboards/${item.id}`}>{item.name}</Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {authStore.hasRights(UserRole.Operator) && !!widget.notUsedDashboards.length && (
                    <Dropdown
                      className="widgets-addToDashboard"
                      options={widget.notUsedDashboards.map((item) => ({ label: item.name, value: item.id }))}
                      value={null}
                      placeholder={t('widgets.buttons.add')}
                      size="small"
                      isButton
                      onChange={(option: Option<string>) => {
                        if (option) {
                          dashboardsStore.dashboards.get(option.value).addWidget(widget.id);
                        }
                      }}
                    />
                  )}
                </TableCell>
                {authStore.hasRights(UserRole.Operator) && (
                  <TableCell width={80} verticalAlign="top">
                    <div className="widgets-actions">
                      <Tooltip text={t('widget.buttons.edit')} placement="bottom">
                        <Button
                          size="small"
                          icon={<EditIcon />}
                          aria-label={t('widget.buttons.edit')}
                          onClick={() => setWidgetToEdit(widget.id)}
                        />
                      </Tooltip>
                      <Tooltip text={t('widgets.buttons.delete')} placement="bottom">
                        <Button
                          variant="danger"
                          size="small"
                          aria-label={t('widget.buttons.delete')}
                          icon={<TrashIcon />}
                          onClick={() => setWidgetToDelete(widget.id)}
                        />
                      </Tooltip>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </Table>
        )}
      </PageLayout>

      {widgetToEdit && (
        <WidgetEdit
          widget={dashboardsStore.widgets.get(widgetToEdit)}
          cells={cells}
          topics={devicesStore.topicsWithoutSystem}
          isOpened={!!widgetToEdit}
          onClose={() => {
            setWidgetToEdit(null);
          }}
          onSave={(data) => {
            (dashboardsStore.widgets.get(widgetToEdit) ?? new Widget(data)).save(data);
            setWidgetToEdit(null);
          }}
        />
      )}

      {widgetToDelete && (
        <WidgetDelete
          isOpened={!!widgetToDelete}
          name={dashboardsStore.widgets.get(widgetToDelete).name}
          associatedDashboards={dashboardsStore.widgets.get(widgetToDelete).associatedDashboards}
          onClose={() => setWidgetToDelete(null)}
          onDelete={() => {
            dashboardsStore.deleteWidget(widgetToDelete);
            setWidgetToDelete(null);
          }}
        />
      )}
    </>
  );
});

export default WidgetsPage;
