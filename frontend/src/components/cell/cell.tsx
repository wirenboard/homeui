import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { CellAlert } from '@/components/cell/cell-alert';
import { CellButton } from '@/components/cell/cell-button';
import { CellColorpicker } from '@/components/cell/cell-colorpicker';
import { CellHistory } from '@/components/cell/cell-history';
import { CellRange } from '@/components/cell/cell-range';
import { CellSwitch } from '@/components/cell/cell-switch';
import { CellText } from '@/components/cell/cell-text';
import { CellValue } from '@/components/cell/cell-value';
import { Tooltip } from '@/components/tooltip';
import { CellComponent } from '@/stores/device';
import { CellError } from '@/stores/device/cell-type';
import { copyToClipboard } from '@/utils/clipboard';
import { type CellProps } from './types';
import './styles.css';

const DangerIcon = lazy(() => import('@/assets/icons/danger.svg'));

export const CellContent = observer(({ cell, name, isCompact, extra, hideHistory }: CellProps) => {
  const { t } = useTranslation();

  const renderCellContent = () => {
    switch (cell.displayType) {
      case CellComponent.Text:
        return <CellText cell={cell} isCompact={isCompact} hideHistory={hideHistory} />;
      case CellComponent.Alert:
        return <CellAlert cell={cell} hideHistory={hideHistory} />;
      case CellComponent.Switch:
        return <CellSwitch cell={cell} inverted={extra?.invert} hideHistory={hideHistory} />;
      case CellComponent.Button:
        return <CellButton cell={cell} name={name} hideHistory={hideHistory} />;
      case CellComponent.Range:
        return <CellRange cell={cell} />;
      case CellComponent.Colorpicker:
        return <CellColorpicker cell={cell} hideHistory={hideHistory} />;
      case CellComponent.Value:
        return <CellValue cell={cell} hideHistory={hideHistory} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={classNames(
        'deviceCell',
        {
          'deviceCell-columns': cell.displayType === CellComponent.Range,
          'deviceCell-error': cell.error?.some((error) => [CellError.Read, CellError.Write].includes(error)),
          'deviceCell-errorPeriod': cell.error && cell.error.includes(CellError.Period),
          'deviceCell-reversed': isCompact && ![CellComponent.Alert, CellComponent.Button].includes(cell.displayType),
        }
      )}
    >
      {!isCompact && ![CellComponent.Alert, CellComponent.Button].includes(cell.displayType) && (
        <Tooltip
          text={<span><b>'{cell.id}'</b> {t('widget.labels.copy')}</span>}
          placement="top-start"
          trigger="click"
        >
          <div
            className="deviceCell-name"
            onClick={() => copyToClipboard(cell.id)}
          >
            {cell.error?.includes(CellError.Period) && (
              <Suspense>
                <Tooltip
                  text={t('widget.errors.poll')}
                  placement="top-start"
                >
                  <DangerIcon className="deviceCell-periodErrorIcon" />
                </Tooltip>
              </Suspense>
            )}
            {name || cell.name}

            {cell.displayType === CellComponent.Range && !hideHistory && (
              <CellHistory cell={cell} />
            )}
          </div>
        </Tooltip>
      )}
      {isCompact && !hideHistory && cell.displayType === CellComponent.Range && (
        <CellHistory cell={cell} />
      )}
      {renderCellContent()}
    </div>
  );
});
