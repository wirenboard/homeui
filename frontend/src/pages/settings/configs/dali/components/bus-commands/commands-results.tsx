import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Table, TableCell, TableRow } from '@/components/table';
import type { BusCommandsStore } from '@/stores/dali';
import { NOT_SENT_MARKER, type ResultRow } from '@/stores/dali/bus-commands-store';

interface CommandsResultsProps {
  store: BusCommandsStore;
}

const formatResult = (row: ResultRow, t: (key: string) => string): string => {
  if (row.status === 'ok') {
    if (row.response) {
      return `0x${row.response.raw.toString(16).toUpperCase()} (${row.response.value})`;
    }
    return t('dali.labels.commands-sent');
  }
  if (row.error === NOT_SENT_MARKER) {
    return t('dali.labels.commands-not-sent');
  }
  return row.error ?? '';
};

export const CommandsResults = observer(({ store }: CommandsResultsProps) => {
  const { t } = useTranslation();

  if (!store.results?.length) {
    return null;
  }

  return (
    <div className="dali-busCommands-results">
      <Table isFullWidth>
        {store.results.map((row, i) => {
          const result = formatResult(row, t);
          return (
            <TableRow
              key={i}
              className={classNames({
                'dali-busCommands-resultRowError': row.status === 'error',
              })}
            >
              <TableCell>
                <code className="dali-busCommands-resultCell">{row.command}</code>
                <span className="dali-busCommands-resultArrow"> → </span>
                <code className="dali-busCommands-resultCell">{result}</code>
              </TableCell>
            </TableRow>
          );
        })}
      </Table>
    </div>
  );
});
