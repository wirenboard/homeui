import { getUnixTime, format, fromUnixTime } from 'date-fns';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { DateTimePicker } from '@/components/datetime-picker';
import { Tooltip } from '@/components/tooltip';
import { type Cell } from '@/stores/devices';
import { copyToClipboard } from '@/utils/clipboard';
import { CellHistory } from './cell-history';
import './styles.css';

export const CellDateTime = observer(({ cell }: { cell: Cell }) => {
  const { t, i18n } = useTranslation();
  const dateFormat = i18n.language === 'ru' ? 'dd.MM.yyyy HH:mm' : 'dd/MM/yyyy HH:mm';

  return (
    <div className="deviceCell-textWrapper">
      <CellHistory cell={cell} />

      {cell.readOnly
        ? (
          <Tooltip
            text={<span><b>'{cell.value}'</b> {t('widget.labels.copy')}</span>}
            placement="top-end"
            trigger="click"
          >
            <div className="deviceCell-text" onClick={() => copyToClipboard(cell.value as string)}>
              {format(fromUnixTime(cell.value as number || 0), dateFormat)}
            </div>
          </Tooltip>
        )
        : (
          <DateTimePicker
            size="small"
            value={fromUnixTime(cell.value as number)}
            isInvalid={!!cell.error}
            ariaLabel={cell.name}
            withSeconds
            onChange={(value: Date) => {
              cell.value = value ? getUnixTime(value) : 0;
            }}
          />
        )}
    </div>
  );
});
