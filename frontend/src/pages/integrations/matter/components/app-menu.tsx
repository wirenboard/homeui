import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { AppMenuAction, type AppMenuProps } from '../types';
import { vendorHex } from '../utils';

/**
 * The two things that can be done to one connected app, and the two numbers that identify
 * it when its name does not.
 *
 * Unpairing lives in here rather than beside every row because it cannot be undone from
 * this page: the app keeps the bridge in its own list until somebody deletes it there,
 * and a button one row off is a click somebody will make. Renaming sits above it, with a
 * line between them, so the irreversible one is not where an errant click lands.
 */
export const AppMenu = ({ appName, fabric, onChoose }: AppMenuProps) => {
  const { t } = useTranslation();
  const [isOpen, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    // On the document and not on the menu: a click anywhere else has to close it,
    // including on another row's menu button, which would otherwise leave two open.
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const choose = (action: AppMenuAction) => {
    setOpen(false);
    onChoose(action);
  };

  return (
    <div className={isOpen ? 'matter-appMenu matter-appMenuOpen' : 'matter-appMenu'} ref={root}>
      <Button
        size="small"
        variant="secondary"
        label="···"
        aria-label={t('matter.buttons.app-actions', { app: appName })}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setOpen(!isOpen)}
      />

      {isOpen && (
        <div className="matter-appMenuPopup" role="menu">
          <div className="matter-appMenuHead">
            <span className="matter-appMenuName">{appName}</span>
            <span className="matter-appMenuIds">
              {t('matter.labels.app-ids', {
                vendor: vendorHex(fabric.vendor_id),
                index: fabric.index,
              })}
            </span>
          </div>

          <button
            type="button"
            role="menuitem"
            className="matter-appMenuItem"
            onClick={() => choose(AppMenuAction.Rename)}
          >
            {t('matter.buttons.rename')}
          </button>

          <button
            type="button"
            role="menuitem"
            className="matter-appMenuItem matter-appMenuItemDanger"
            onClick={() => choose(AppMenuAction.Unpair)}
          >
            {t('matter.buttons.unpair')}
          </button>
        </div>
      )}
    </div>
  );
};
