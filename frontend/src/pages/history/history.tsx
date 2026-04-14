import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Chart } from '@/components/chart';
import { DateTimePicker } from '@/components/datetime-picker';
import { Dropdown, type Option } from '@/components/dropdown';
import { Progress } from '@/components/progress';
import { Table, TableCell, TableRow } from '@/components/table';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { HistoryStore } from '@/stores/history';
import { downloadFile } from '@/utils/donwload-file';
import { useParseHash } from '@/utils/url';
import { useStore } from '@/utils/use-store';
import type { HistoryPageProps } from './types';
import './styles.css';

const HistoryPage = observer(({
  historyProxy,
  dashboardsStore,
  devicesStore,
  $state,
}: HistoryPageProps) => {
  const { t, i18n } = useTranslation();
  const { id, params } = useParseHash();

  const store = useStore(() => new HistoryStore({
    historyProxy,
    dashboardsStore,
    devicesStore,
    $state,
  }));

  useEffect(() => {
    if (!dashboardsStore.isLoading) {
      store.initialize(id);
    }
  }, [id, dashboardsStore.isLoading]);

  const downloadHistoryTable = () => {
    const rows = document.querySelectorAll('#history-table tr');
    const csv: string[] = [];
    rows.forEach((row) => {
      const cols = row.querySelectorAll('td, th');
      const rowData: string[] = [];
      cols.forEach((col) => {
        rowData.push(`"${col.textContent?.replace(/"/g, '""') || ''}"`);
      });
      csv.push(rowData.join(','));
    });
    downloadFile('filename.csv', 'text/csv', ['\ufeff', csv.join('\n')]);
  };

  const channelOptions = useMemo(() => {
    const widgetGroup = i18n.t('history.labels.widget_channels');
    const allGroup = i18n.t('history.labels.all_channels');
    const widgetOptions = store.controls
      .filter((control) => control.group === widgetGroup)
      .map((control) => {
        const id = `${control.deviceId}/${control.controlId}/${control.widget.id}`;
        return {
          value: id,
          isDisabled: store.selectedControls.includes(id),
          label: control.name,
        };
      });
    const allOptions = store.controls
      .filter((control) => control.group === allGroup)
      .map((control) => {
        const id = `${control.deviceId}/${control.controlId}`;
        return {
          value: id,
          isDisabled: store.selectedControls.includes(id),
          label: control.name,
        };
      });

    return [{ label: widgetGroup, options: widgetOptions }, { label: allGroup, options: allOptions }]
      .filter((group) => group.options.length);
  }, [store.controls, store.selectedControls]);

  return (
    <PageLayout
      title={t('history.title')}
      actions={!!store.chartConfig.length && (
        <Button
          variant="secondary"
          label={t('history.buttons.download')}
          disabled={store.loadPending}
          onClick={downloadHistoryTable}
        />
      )}
      errors={store.errors}
      isLoading={!channelOptions.length}
      hasRights={authStore.hasRights(UserRole.User)}
    >
      <div ref={(element) => store.setChartContainerRef(element)}>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            store.loadData(params.has('fullscreen'));
          }}
        >
          {store.selectedControls.map((control, index) => (
            <div className="history-channelWrapper" key={`${control || 'new'}-${index}`}>
              <Dropdown
                id={`history-control-${index}`}
                className="history-channel"
                value={control}
                options={channelOptions}
                isDisabled={store.disableUi}
                placeholder={t('history.labels.choose')}
                isSearchable
                onChange={(option: Option<string>) => {
                  store.setSelectedControlValue(index, option?.value || null);
                }}
              />
              {!(index === 0 && store.selectedControls.length === 1) && (
                <Button
                  variant="danger"
                  label={t('history.buttons.delete')}
                  disabled={store.disableUi}
                  onClick={() => store.removeControlAt(index)}
                />
              )}
              {store.chunksN > 1 && store.charts[index] && store.loadPending && (
                <Progress
                  value={(store.charts[index].progress.value / store.chunksN) * 100}
                  caption={`${store.charts[index].progress.value}/${store.chunksN}`}
                />
              )}
            </div>
          ))}

          {!(store.selectedControls.length === 1 && !store.selectedControls[store.selectedControls.length - 1]) && (
            <Button
              className="history-addChannel"
              variant="primary"
              label={t('history.buttons.add')}
              disabled={store.disableUi}
              onClick={() => store.addControlSlot()}
            />
          )}

          <div className="history-dateFilter">
            <div className="history-dateWrapper">
              <label htmlFor="history-start" className="history-label">
                {t('history.labels.start')}
                <DateTimePicker
                  id="history-start"
                  className="history-date"
                  value={store.selectedStartDate}
                  disabled={store.disableUi}
                  onChange={(value: Date) => store.setSelectedStartDateFromInput(value)}
                />
              </label>
            </div>

            <div className="history-dateWrapper">
              <label htmlFor="history-end" className="history-label">
                {t('history.labels.end')}
                <DateTimePicker
                  id="history-end"
                  className="history-date"
                  value={store.selectedEndDate}
                  disabled={store.disableUi}
                  disabledDates={{ before: store.selectedStartDate }}
                  onChange={(value: Date) => store.setSelectedEndDateFromInput(value)}
                />
              </label>
            </div>

            <Button
              variant="secondary"
              label={t('history.buttons.today')}
              disabled={!store.selectedControls[0] || store.disableUi}
              onClick={() => store.resetDates()}
            />
          </div>

          <div className="history-loadActions">
            {store.loadPending
              ? (
                <Button
                  label={t('history.buttons.stop')}
                  onClick={() => store.stopLoadingData()}
                />
              )
              : (
                <Button
                  type="submit"
                  label={t('history.buttons.load')}
                  isLoading={store.disableUi}
                  disabled={!store.selectedControls[0] || store.disableUi}
                  onClick={() => store.prepareLoad()}
                />
              )
            }
          </div>
        </form>

        {!store.loadPending && store.chartConfig.length > 0 && (
          <Chart
            data={store.chartConfig}
            layout={store.layoutConfig}
            config={{
              displayModeBar: true,
              locale: i18n.language,
              displaylogo: false,
            }}
            onRelayout={(event) => store.onRelayout(event)}
          />
        )}

        {!store.chartConfig.length && !store.loadPending && (
          <div>{t('history.labels.nothing')}</div>
        )}

        {!!store.dataPointsMultiple.length && (
          <Table id="history-table" className="history-table">
            <TableRow isHeading>
              <TableCell>
                {t('history.labels.date')}
              </TableCell>
              {store.charts.map((channel, i) => (
                <TableCell key={channel.channelName + i}>
                  {channel.channelName}
                </TableCell>
              ))}
            </TableRow>
            {store.dataPointsMultiple.map((row, i) => (
              <TableRow key={row.date + i}>
                <TableCell>
                  {format(
                    new Date(row.date),
                    row.showMs ? 'PPpp.SSS' : 'PPpp',
                    { locale: i18n.language === 'ru' ? ru : enUS }
                  )}
                </TableCell>
                {row.value.map((cellValue, index) => (
                  <TableCell key={`${row.date}-${index}`}>{cellValue}</TableCell>
                ))}
              </TableRow>
            ))}
          </Table>
        )}
      </div>
    </PageLayout>
  );
});

export default HistoryPage;
