import { observer } from 'mobx-react-lite';
import { Fragment, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
import { WidgetDelete } from '@/pages/dashboards/[slug]';
import { authStore, UserRole } from '@/stores/auth';
import { PageView, type WidgetsPageProps } from './types';
import './styles.css';

const WidgetsPage = observer(({ store, devicesStore }: WidgetsPageProps) => {
  const { t } = useTranslation();
  const { cells } = devicesStore;
  const [view, setView] = useState(PageView.List);
  const [isHideAlert, setIsHideAlert] = useState(localStorage.getItem('hide-widgets-alert') === 'true');
  const [widgetToDelete, setWidgetToDelete] = useState(null);

  const errors = useMemo(() => {
    const messages: PageProps['errors'] = [];
    if (store.isLoading) {
      return messages;
    }

    if (!store.isShowWidgetsPage && !isHideAlert) {
      messages.push({
        variant: 'info',
        text: (<Trans i18nKey="widgets.errors.hidden" components={[<a href="#!/web-ui" />]}/>),
        onClose: () => {
          setIsHideAlert(true);
          localStorage.setItem('hide-widgets-alert', 'true');
        },
      });
    }

    if (!Array.from(store.widgets.values()).length) {
      messages.push({ variant: 'info', text: t('widgets.errors.empty') });
    }

    return messages;
  }, [store.isLoading, store.isShowWidgetsPage, store.widgets.values()]);

  return (
    <>
      <PageLayout
        title={t('widgets.title')}
        isLoading={store.isLoading}
        errors={errors}
        actions={
          !!Array.from(store.widgets.values()).length && (
            <Tooltip
              text={t(view === PageView.List ? 'widgets.buttons.widget-view' : 'widgets.buttons.table-view')}
              placement="bottom"
            >
              <Button
                icon={view === PageView.List ? <CardIcon /> : <ListIcon />}
                variant="secondary"
                onClick={() => setView(view === PageView.List ? PageView.Card : PageView.List)}
              />
            </Tooltip>
          )
        }
        hasRights
      >
        {!!Array.from(store.widgets.values()).length && (
          <Table>
            <TableRow isHeading>
              <TableCell width={250}>{t('widgets.labels.name-and-description')}</TableCell>
              {view === PageView.List && (<TableCell>{t('widgets.labels.cells')}</TableCell>)}
              {view === PageView.List && (<TableCell width={100}>{t('widgets.labels.types')}</TableCell>)}
              {view === PageView.List && (<TableCell width={200}>{t('widgets.labels.values')}</TableCell>)}
              {view === PageView.List && (<TableCell width={60}>{t('widgets.labels.graph')}</TableCell>)}
              {view === PageView.Card && (<TableCell>{t('widgets.labels.preview')}</TableCell>)}
              <TableCell width={250}>{t('widgets.labels.dashboards')}</TableCell>
              {authStore.hasRights(UserRole.Operator) && (<TableCell width={40} />)}
            </TableRow>
            {Array.from(store.widgets.values()).map((widget) => (
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
                              isCompact={store.widgets.get(widget.id).compact}
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
                            <a href={`#!/dashboards/${item.id}`}>{item.name}</a>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {authStore.hasRights(UserRole.Operator) && !!widget.notUsedDashboards.length && (
                    <Dropdown
                      className="widgets-addToDashboard"
                      options={widget.notUsedDashboards.map((item) => ({ label: item.name, value: item.id }))}
                      value={{}}
                      placeholder={t('widgets.buttons.add')}
                      size="small"
                      isButton
                      onChange={(option: Option<string>) => {
                        if (option) {
                          store.dashboards.get(option.value).addWidget(widget.id);
                        }
                      }}
                    />
                  )}
                </TableCell>
                {authStore.hasRights(UserRole.Operator) && (
                  <TableCell width={40} verticalAlign="top">
                    <Tooltip text={t('widgets.buttons.delete')} placement="bottom">
                      <Button
                        variant="danger"
                        size="small"
                        icon={<TrashIcon />}
                        onClick={() => setWidgetToDelete(widget.id)}
                      />
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </Table>
        )}
      </PageLayout>

      {widgetToDelete && (
        <WidgetDelete
          isOpened={!!widgetToDelete}
          name={store.widgets.get(widgetToDelete).name}
          associatedDashboards={store.widgets.get(widgetToDelete).associatedDashboards}
          onClose={() => setWidgetToDelete(null)}
          onDelete={() => {
            store.deleteWidget(widgetToDelete);
            setWidgetToDelete(null);
          }}
        />
      )}
    </>
  );
});

export default WidgetsPage;
