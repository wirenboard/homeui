import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { CellAlert } from '@/components/cell/cell-alert';
import { CellButton } from '@/components/cell/cell-button';
import { CellColorpicker } from '@/components/cell/cell-colorpicker';
import { CellRange } from '@/components/cell/cell-range';
import { CellSwitch } from '@/components/cell/cell-switch';
import { CellText } from '@/components/cell/cell-text';
import { CellValue } from '@/components/cell/cell-value';
import { CellComponent } from '@/stores/device';
import { CellError } from '@/stores/device/cell-type';
import { notificationsStore } from '@/stores/notifications';
import { CellProps } from './types';
import './styles.css';

const DangerIcon = lazy(() => import('@/assets/icons/danger.svg'));

export const CellContent = observer(({ cell, name, isDoubleColumn = false }: CellProps) => {
  const { t } = useTranslation();
  const { showNotification } = notificationsStore;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(cell.id);
    showNotification({ text: `'${cell.id}' ${t('widgets.labels.copy')}` });
  };

  const renderCellContent = () => {
    switch (cell.displayType) {
      case CellComponent.Text:
        return <CellText cell={cell} />;
      case CellComponent.Alert:
        return <CellAlert cell={cell} />;
      case CellComponent.Switch:
        return <CellSwitch cell={cell} />;
      case CellComponent.Button:
        return <CellButton cell={cell} />;
      case CellComponent.Range:
        return <CellRange cell={cell} />;
      case CellComponent.Colorpicker:
        return <CellColorpicker cell={cell} />;
      case CellComponent.Value:
        return <CellValue cell={cell} isDoubleColumn={isDoubleColumn} />;
      default:
        return null;
    }
  };

  return (
    <div className={classNames(
      'deviceCell',
      {
        'deviceCell-columns': cell.displayType === CellComponent.Range,
        'deviceCell-error': cell.error && (cell.error.includes(CellError.Read) || cell.error.includes(CellError.Write)),
      }
    )}
    >
      {!['alarm', 'button'].includes(cell.displayType) && (
        <div
          className="deviceCell-name"
          onClick={copyToClipboard}
        >
          {cell.error?.includes(CellError.Period) && (
            <Suspense>
              <DangerIcon title={t('widgets.errors.poll')} className="deviceCell-periodError" />
            </Suspense>
          )}
          {name || cell.name}
          {!!cell.units && <div className="deviceCell-units">({t(`units.${cell.units}`, cell.units)})</div>}
        </div>
      )}
      {renderCellContent()}
    </div>
  );
});
