import { getUnixTime, format, fromUnixTime, parse } from 'date-fns';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/input';
import { Tooltip } from '@/components/tooltip';
import { type Cell } from '@/stores/devices';
import { copyToClipboard } from '@/utils/clipboard';
import { CellHistory } from './cell-history';
import './styles.css';

export const CellDateTime = observer(({ cell }: { cell: Cell }) => {
  const { t } = useTranslation();
  console.log(cell.value);
  return (
    <div className="deviceCell-textWrapper">
      <CellHistory cell={cell} />

      {cell.readOnly && (
        <Tooltip
          text={<span><b>'{cell.value}'</b> {t('widget.labels.copy')}</span>}
          placement="top-end"
          trigger="click"
        >
          <div className="deviceCell-text" onClick={() => copyToClipboard(cell.value as string)}>
            {format(fromUnixTime(cell.value as number || 0), 'yyyy-MM-dd HH:mm')}
          </div>
        </Tooltip>
      )}

      {(!cell.readOnly && !cell.isEnum) && (
        <Input
          id={cell.id}
          className="deviceCell-dateTime"
          type="datetime-local"
          value={typeof cell.value === 'number'
            ? format(fromUnixTime(cell.value as number), 'yyyy-MM-dd\'T\'HH:mm')
            : null}
          isDisabled={cell.readOnly}
          isInvalid={!!cell.error}
          size="small"
          ariaLabel={cell.name}
          isWithExplicitChanges
          onChange={(value: string) => {
            cell.value = value ? getUnixTime(parse(value, 'yyyy-MM-dd\'T\'HH:mm', new Date())) : 0;
          }}
        />
      )}
    </div>
  );
});
