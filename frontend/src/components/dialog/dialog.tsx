import {
  FloatingPortal,
  FloatingOverlay,
  FloatingFocusManager,
  useFloating,
  useDismiss,
  useRole,
  useInteractions
} from '@floating-ui/react';
import classNames from 'classnames';
import { PropsWithChildren, useId } from 'react';
import CloseIcon from '@/assets/icons/close.svg';
import { DialogProps } from './types';
import './styles.css';

export const Dialog = ({
  children,
  className,
  heading,
  headerActions,
  showCloseButton = true,
  withPadding = true,
  isOverlayCloseDisabled,
  isOpened,
  onClose,
}: PropsWithChildren<DialogProps>) => {
  const headingId = useId();

  const { context, refs } = useFloating({
    open: isOpened,
    onOpenChange: (open) => {
      if (!open) onClose?.();
    },
  });

  const dismiss = useDismiss(context, { outsidePress: !isOverlayCloseDisabled });
  const role = useRole(context, { role: 'dialog' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!isOpened) return null;

  return (
    <FloatingPortal>
      <FloatingOverlay className="dialog-overlay" lockScroll>
        <FloatingFocusManager context={context} modal>
          <div
            role="dialog"
            {...getFloatingProps({
              ref: refs.setFloating,
              className: classNames('dialog', className),
              'aria-labelledby': headingId,
              'aria-modal': true,
              onClick: (e) => e.stopPropagation(),
            })}
          >
            <header className="dialog-header">
              <h3 id={headingId} className="dialog-title">
                {heading}
              </h3>
              <div>
                {headerActions}
                {showCloseButton && (
                  <button className="dialog-close" onClick={() => onClose?.()}>
                    <CloseIcon />
                  </button>
                )}
              </div>
            </header>

            <div className={classNames({ 'dialog-content': withPadding })}>
              {children}
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
};
