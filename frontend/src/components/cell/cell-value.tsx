import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, type Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import { Tooltip } from '@/components/tooltip';
import { type Cell } from '@/stores/device';
import { CellFormat } from '@/stores/device/cell-type';
import { copyToClipboard } from '@/utils/clipboard';
import { transformNumber } from '@/utils/one-wire-number';
import { CellHistory } from './cell-history';
import './styles.css';

export const CellValue = observer(({ cell }: { cell: Cell }) => {
  const { t } = useTranslation();
  const [capturedValue, setCapturedValue] = useState<string>(null);
  const [minimumFractionDigits, setMinimumFractionDigits] = useState(0);

  const getCopiedText = useCallback((val: string) => val, []);

  const formattedValue = useMemo(() => {
    if (cell.type === CellFormat.OneWireId) {
      return transformNumber(cell.value as number);
    }
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

    if (countDecimals(cell.value as number) > minimumFractionDigits) {
      setMinimumFractionDigits(countDecimals(cell.value as number));
    }
  }, [cell.value, minimumFractionDigits]);

  return (
    <>
      {cell.valueType === 'number' && !cell.readOnly && (
        cell.isEnum ? (
          <div className="deviceCell-withSelect">
            <CellHistory cell={cell} />
            <Dropdown
              size="small"
              isInvalid={!!cell.error}
              options={cell.enumValues.map(({ name, value }) => ({ label: name, value }))}
              value={cell.value as string | number}
              ariaLabel={cell.name}
              onChange={(option: Option<string>) => cell.value = option.value}
            />
          </div>
        ) : (
          <>
            <CellHistory cell={cell} />
            <Input
              id={cell.id}
              type="number"
              size="small"
              isInvalid={!!cell.error}
              className="deviceCell-text"
              value={cell.value as number}
              isDisabled={cell.readOnly}
              min={cell.min}
              max={cell.max}
              step={cell.step}
              ariaLabel={cell.name}
              isWithExplicitChanges
              onChange={(value) => cell.value = value}
            />
          </>
        )
      )}

      {cell.readOnly && (
        <>
          <CellHistory cell={cell} />

          <div
            className={classNames('deviceCell-value', 'deviceCell-text')}
            onClick={() => {
              let value = cell.value;
              if (cell.isEnum) {
                value = cell.enumValues.find((item) => item.value === cell.value).name;
              } else if (cell.type === CellFormat.OneWireId) {
                value = transformNumber(cell.value as number);
              }
              setCapturedValue(value as string);
              copyToClipboard(cell.isEnum ? value as string : getCopiedText(value as string));
            }
            }
          >
            <Tooltip
              text={<span><b>'{getCopiedText(capturedValue)}'</b> {t('widget.labels.copy')}</span>}
              placement="top"
              trigger="click"
            >
              {cell.isEnum
                ? <div className="deviceCell-text">{cell.getEnumName(cell.value as string)}</div>
                : (
                  <div>
                    <span dangerouslySetInnerHTML={{ __html: formattedValue }}></span> {!!cell.units && (
                      <span className="deviceCell-units">{t(`units.${cell.units}`, cell.units)}</span>
                    )}
                  </div>
                )}
            </Tooltip>
          </div>
        </>
      )}
    </>
  );
});
