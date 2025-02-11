import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '@/components/dropdown';
import { Input } from '@/components/input';
import { Cell } from '@/stores/device';
import { notificationsStore } from '@/stores/notifications';
import './styles.css';

export const CellValue = observer(({ cell, isDoubleColumn }: { cell: Cell; isDoubleColumn: boolean }) => {
  const { t } = useTranslation();
  const { showNotification } = notificationsStore;

  const copyToClipboard = async () => {
    const text = `${cell.value}${cell.units ? ` ${t(`units.${cell.units}`, cell.units)}` : ''}`;
    await navigator.clipboard.writeText(text);
    showNotification({ text: `'${text}' ${t('widgets.labels.copy')}` });
  };

  const getIntegerValue = (value?: number | null) => value?.toString().split('.')[0] || '';

  const getFractionalValue = (value?: number | null, step?: number | null) => {
    if (value === null) return '';

    const digits = step?.toString().split('.')[1]?.length || 0;
    const fraction = digits > 0
      ? value.toFixed(digits).split('.')[1]
      : value.toString().split('.')[1];

    return fraction ? `.${fraction}` : '';
  };

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
        <div className={classNames('deviceCell-value', {
          'deviceCell-value-fractional': isDoubleColumn,
        })} onClick={copyToClipboard}
        >
          {cell.isEnum
            ? <div className="deviceCell-text">{cell.getEnumName(cell.value)}</div>
            : (
              <>
                <div className={classNames('deviceCell-int', {
                  'deviceCell-int-fractional': isDoubleColumn,
                })}
                ><span>{getIntegerValue(cell.value)}</span>
                </div>
                {isDoubleColumn && (
                  <div className="deviceCell-decimal">{getFractionalValue(cell.value, cell.step)}</div>
                )}
              </>
            )}
        </div>
      )}
    </>
  );
});
