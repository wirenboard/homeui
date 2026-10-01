import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import classNames from 'classnames';
import { useRef, type PropsWithChildren } from 'react';
import type { PopupProps } from './types';
import './styles.css';

export const Popup = ({
  children,
  className,
  content,
  isOpen,
  onOpenChange,
  placement = 'bottom-start',
}: PropsWithChildren<PopupProps>) => {
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip({ fallbackAxisSideDirection: 'start' }),
      shift({ padding: 8 }),
      arrow({ element: arrowRef, padding: 8 }),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  return (
    <>
      <div className="popup-trigger" ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </div>
      <FloatingPortal root={document.querySelector('.floating')}>
        {isOpen && (
          <div
            className={classNames('popup', className)}
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <FloatingArrow ref={arrowRef} context={context} className="popup-arrow" />
            {content}
          </div>
        )}
      </FloatingPortal>
    </>
  );
};
