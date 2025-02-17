import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [minimumFractionDigits, setMinimumFractionDigits] = useState(0);

  const getCopiedText = useCallback((val: string) => val, []);

  const formattedValue = useMemo(() => {
    if (typeof cell.value === 'number') {
      return new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits })
        .format(cell.value)
        .replace(/\s/g, '<span class="deviceCell-space"></span>')
        .replace(',', '.');
    }
    return cell.value;
  }, [cell.value, minimumFractionDigits]);

  // to avoid a jumping interface, we keep the number of decimal
  useEffect(() => {
    const countDecimals = (num: number) => {
      if (!Number.isFinite(num)) return 0;
      const str = num.toString();
      if (str.includes('.')) {
        return str.split('.')[1].length;
      }
      return 0;
    };

    if (countDecimals(cell.value) > minimumFractionDigits) {
      setMinimumFractionDigits(countDecimals(cell.value));
    }
  }, [cell.value, minimumFractionDigits]);

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
            const value = cell.isEnum
              ? cell.enumValues.find((item) => item.value === cell.value).name
              : cell.value;
            setCapturedValue(value);
            copyToClipboard(cell.isEnum ? value : getCopiedText(value));
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
                  <span dangerouslySetInnerHTML={{ __html: formattedValue }}></span> {!!cell.units && (
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
