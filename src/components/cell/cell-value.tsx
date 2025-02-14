import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '@/components/dropdown';
import { Input } from '@/components/input';
import { Tooltip } from '@/components/tooltip';
import { Cell } from '@/stores/device';
import { copyToClipboard } from '@/utils/clipboard';
import './styles.css';

export const CellValue = observer(({ cell }: { cell: Cell }) => {
  const { t } = useTranslation();
  const [capturedValue, setCapturedValue] = useState<string>(null);

  const getCopiedText = useCallback(
    (val: string) => `${val}${cell.units ? ` ${t(`units.${cell.units}`, cell.units)}` : ''}`,
    [capturedValue]
  );

  const formattedValue = useMemo(() => {
    if (typeof cell.value === 'number') {
      const formatter = new Intl.NumberFormat('ru-RU', {
        style: 'decimal',
        minimumFractionDigits: 0,
      });

      return formatter.format(cell.value).replace(/\s/g, '\u2009').replace(',', '.');
    }
    return cell.value;
  }, [cell.value]);

  return (
    <>
      {cell.valueType === 'number' && !cell.readOnly && (
        cell.isEnum ? (
          <Dropdown
            className="deviceCell-select"
            size="small"
            options={cell.enumValues.map(({ name, value }) => ({ label: name, value }))}
            value={cell.value}
            ariaLabel={cell.name}
            onChange={(option) => cell.value = option.value}
          />
        ) : (
          <Input
            id={cell.id}
            type="number"
            size="small"
            className="deviceCell-mono"
            value={cell.value}
            isDisabled={cell.readOnly}
            min={cell.min}
            max={cell.max}
            step={cell.step}
            ariaLabel={cell.name}
            onChange={(value) => cell.value = value}
          />
        )
      )}

      {cell.readOnly && (
        <div
          className={classNames('deviceCell-value', 'deviceCell-mono')}
          onClick={() => {
            setCapturedValue(cell.isEnum
              ? cell.enumValues.find((item) => item.value === cell.value).name
              : cell.value);
            copyToClipboard(cell.isEnum
              ? cell.enumValues.find((item) => item.value === cell.value).name
              : getCopiedText(cell.value));
          }
          }
        >
          <Tooltip
            text={<span><b>'{getCopiedText(capturedValue)}'</b> {t('widgets.labels.copy')}</span>}
            placement="top"
            trigger="click"
          >
            {cell.isEnum
              ? <div className="deviceCell-text">{cell.getEnumName(cell.value)}</div>
              : (
                <div>
                  <span>{formattedValue}</span> {!!cell.units && (
                    <span className="deviceCell-units">{t(`units.${cell.units}`, cell.units)}</span>
                  )}
                </div>
              )}
          </Tooltip>
        </div>
      )}
    </>
  );
});
