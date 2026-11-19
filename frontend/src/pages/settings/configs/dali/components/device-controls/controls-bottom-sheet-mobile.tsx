import classNames from 'classnames';
import { type TFunction } from 'i18next';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import ChevronUpIcon from '@/assets/icons/chevron-up.svg';
import type Cell from '@/stores/devices/cell';
import { isSelfLabelled, pinnedControlsLabel } from './pinned-controls-label';
import { ControlId } from './types';
import type { ControlsBottomSheetMobileProps } from './types';

const PEEK_LIMIT = 3;

const peekValue = (cell: Cell, t: TFunction): string => {
  if (cell.type === 'switch' || typeof cell.value === 'boolean') {
    return cell.value ? t('dali.labels.state-on') : t('dali.labels.state-off');
  }
  const value = cell.value === null || cell.value === undefined || cell.value === '' ? '—' : String(cell.value);
  return cell.units ? `${value} ${cell.units}` : value;
};

export const ControlsBottomSheetMobile = observer((
  { pinnedControls, levelReading, peekTitle, children }: ControlsBottomSheetMobileProps,
) => {
  const { t } = useTranslation();
  const [isSheetOpen, setSheetOpen] = useState(false);

  const sheet = (
    <div className={classNames('daliDeviceControls-sheet', { 'daliDeviceControls-sheetOpen': isSheetOpen })}>
      <button
        type="button"
        className="daliDeviceControls-peek"
        aria-expanded={isSheetOpen}
        onClick={() => setSheetOpen(!isSheetOpen)}
      >
        <span className="daliDeviceControls-peekValues">
          {peekTitle}
          {!peekTitle && pinnedControls
            .filter((cell) => !isSelfLabelled(cell) && cell.controlId !== ControlId.GoToScene)
            .slice(0, PEEK_LIMIT)
            .map((cell) => (
              <span className="daliDeviceControls-peekItem" key={cell.id}>
                {pinnedControlsLabel(cell, t)}:{' '}
                {cell.type === 'rgb' ? (
                  <span className="daliDeviceControls-peekSwatch" style={{ background: String(cell.value) }} />
                ) : (
                  <b>{peekValue(cell.controlId === ControlId.WantedLevel && levelReading ? levelReading : cell, t)}</b>
                )}
              </span>
            ))}
        </span>
        {isSheetOpen
          ? <ChevronDownIcon className="daliDeviceControls-peekChevron" />
          : <ChevronUpIcon className="daliDeviceControls-peekChevron" />}
      </button>
      {isSheetOpen && (
        <div className="daliDeviceControls-sheetBody">
          <div className="daliDeviceControls-grid">{children}</div>
        </div>
      )}
    </div>
  );
  // A flex item of the layout container, right above the console: the closed sheet shrinks the page,
  // the open body overlays it.
  const layout = document.querySelector('.defaultLayout-container');
  return layout ? createPortal(sheet, layout) : sheet;
});
