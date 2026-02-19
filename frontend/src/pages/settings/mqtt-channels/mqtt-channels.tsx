import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/input';
import { Table, TableCell, TableRow } from '@/components/table';
import { Tag } from '@/components/tag';
import { PageLayout } from '@/layouts/page';
import type { MqttChannelsPageProps, MqttChannelsSortColumn, SortDirection } from './types';
import './styles.css';

const MqttChannelsPage = observer(({ store }: MqttChannelsPageProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<MqttChannelsSortColumn>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleSort = (column: MqttChannelsSortColumn) => {
    if (sortColumn === column) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection('asc');
  };

  const getSortProps = (column: MqttChannelsSortColumn) => ({
    onSort: () => toggleSort(column),
    isActive: column === sortColumn,
    direction: column === sortColumn ? sortDirection : undefined,
  });

  const compareStrings = (first: string, second: string) => first.localeCompare(second);
  const compareValues = (first: unknown, second: unknown) => {
    if (typeof first === 'number' && typeof second === 'number') {
      return first - second;
    }
    return compareStrings(String(first ?? ''), String(second ?? ''));
  };

  const getTopic = (cell: typeof store.filteredCells[number]) => `/devices/${cell.deviceId}/controls/${cell.controlId}`;
  const getStatus = (cell: typeof store.filteredCells[number]) => (cell.error ? 'error' : 'ok');

  const sortedCells = [...store.filteredCells];
  sortedCells.sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    const primaryComparison = (() => {
      switch (sortColumn) {
        case 'type':
          return compareStrings(a.type, b.type);
        case 'topic':
          return compareStrings(getTopic(a), getTopic(b));
        case 'value':
          return compareValues(a.value, b.value);
        case 'status':
          return compareStrings(getStatus(a), getStatus(b));
        case 'id':
        default:
          return compareStrings(a.id, b.id);
      }
    })();

    if (primaryComparison !== 0) {
      return primaryComparison * multiplier;
    }

    return compareStrings(a.id, b.id) * multiplier;
  });

  return (
    <PageLayout
      title={t('mqtt.title')}
      hasRights
    >
      <Input
        value={search}
        className="mqtt-search"
        placeholder={t('mqtt.labels.search')}
        autoFocus
        onChange={(val: string) => setSearch(val)}
      />

      <Table isFullWidth>
        <TableRow isHeading>
          <TableCell sort={getSortProps('id')}>
            {t('mqtt.labels.device')}/{t('mqtt.labels.control')}
          </TableCell>
          <TableCell sort={getSortProps('type')}>
            {t('mqtt.labels.type')}
          </TableCell>
          <TableCell sort={getSortProps('topic')}>
            {t('mqtt.labels.topic')}
          </TableCell>
          <TableCell sort={getSortProps('value')}>
            {t('mqtt.labels.value')}
          </TableCell>
          <TableCell sort={getSortProps('status')} width={110} align="right">
            {t('mqtt.labels.status')}
          </TableCell>
        </TableRow>

        {sortedCells
          .filter((item) => item.id?.includes(search)
            || item.type?.includes(search)
            || String(item.value)?.includes(search))
          .map((cell) => (
            <TableRow key={cell.id}>
              <TableCell verticalAlign="top">
                {cell.id}
              </TableCell>
              <TableCell verticalAlign="top">
                {cell.type}
              </TableCell>
              <TableCell verticalAlign="top">
                {getTopic(cell)}
              </TableCell>
              <TableCell verticalAlign="top">
                <div className="mqtt-value">
                  {String(cell.value)}
                </div>
              </TableCell>
              <TableCell align="right" verticalAlign="top">
                {cell.error ? (
                  <a href="https://github.com/wirenboard/conventions?tab=readme-ov-file#errors" target="_blank">
                    <Tag variant="danger">
                      {t('mqtt.labels.error', { error: cell.error.at(0) })}
                    </Tag>
                  </a>
                ) : (
                  <Tag variant="success">OK</Tag>
                )}
              </TableCell>
            </TableRow>
          ))}
      </Table>
    </PageLayout>
  );
});

export default MqttChannelsPage;
