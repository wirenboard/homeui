import classNames from 'classnames';
import { type MouseEvent, type PropsWithChildren, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import CloseIcon from '@/assets/icons/close-circle.svg';
import { Confirm } from '@/components/confirm';
import type { DrawerProps, ResponsiveWidth } from './types';
import './styles.css';

function resolveWidth(width: number | ResponsiveWidth): number {
  if (typeof width === 'number') return width;
  const vw = window.innerWidth;
  const breakpoints = Object.keys(width).map(Number).sort((a, b) => b - a);
  for (const bp of breakpoints) {
    if (vw >= bp) return width[bp];
  }
  return width[breakpoints[breakpoints.length - 1]];
}

function useResponsiveWidth(width: number | ResponsiveWidth): number {
  const [resolved, setResolved] = useState(() => resolveWidth(width));

  useEffect(() => {
    if (typeof width === 'number') {
      setResolved(width);
      return;
    }
    const breakpoints = Object.keys(width).map(Number).sort((a, b) => a - b);
    const queries = breakpoints.map((bp) => window.matchMedia(`(min-width: ${bp}px)`));

    const update = () => setResolved(resolveWidth(width));
    update();
    queries.forEach((mq) => mq.addEventListener('change', update));
    return () => queries.forEach((mq) => mq.removeEventListener('change', update));
  }, [width]);

  return resolved;
}

export const Drawer = ({
  children,
  className,
  heading,
  width = 550,
  headerActions,
  footerActions,
  showCloseButton = true,
  isOverlayCloseDisabled,
  isDirty,
  isOpened,
  onClose,
}: PropsWithChildren<DrawerProps>) => {
  const { t } = useTranslation();
  const headingId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  const resolvedWidth = useResponsiveWidth(width);

  useEffect(() => {
    if (!isOpened) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpened]);

  useEffect(() => {
    if (!isOpened) return;
    drawerRef.current?.focus();
  }, [isOpened]);

  const attemptClose = useCallback(() => {
    if (isDirty) {
      setIsConfirmingClose(true);
    } else {
      onClose?.();
    }
  }, [isDirty, onClose]);

  const confirmClose = useCallback(() => {
    setIsConfirmingClose(false);
    onClose?.();
  }, [onClose]);

  const cancelClose = useCallback(() => {
    setIsConfirmingClose(false);
  }, []);

  useEffect(() => {
    if (!isOpened) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const overlays = document.querySelectorAll('.drawer-overlay');
      if (overlays[overlays.length - 1] === drawerRef.current?.closest('.drawer-overlay')) {
        attemptClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpened, attemptClose]);

  const handleOverlayClick = useCallback((e: MouseEvent) => {
    if (!isOverlayCloseDisabled && e.target === e.currentTarget) {
      attemptClose();
    }
  }, [isOverlayCloseDisabled, attemptClose]);

  if (!isOpened) return null;

  return createPortal(
    <div className="drawer-overlay" onClick={handleOverlayClick}>
      <div
        ref={drawerRef}
        role="dialog"
        className={classNames('drawer', className)}
        aria-labelledby={headingId}
        aria-modal="true"
        style={{ width: `${resolvedWidth}px` }}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="drawer-header">
          <h3 id={headingId} className="drawer-title">
            {heading}
          </h3>
          <div className="drawer-headerActions">
            {headerActions}
            {showCloseButton && (
              <button className="drawer-close" aria-label={t('common.buttons.close')} onClick={attemptClose}>
                <CloseIcon />
              </button>
            )}
          </div>
        </header>

        <div className="drawer-content">
          {children}
        </div>

        {footerActions && (
          <div className="drawer-footer">
            {footerActions}
          </div>
        )}

        <Confirm
          isOpened={isConfirmingClose}
          acceptLabel={t('drawer.labels.discard')}
          confirmCallback={confirmClose}
          closeCallback={cancelClose}
          isOverlayCloseDisabled
        >
          <p>{t('drawer.labels.unsaved-changes')}</p>
        </Confirm>
      </div>
    </div>,
    document.body,
  );
};
