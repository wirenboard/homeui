import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  FloatingPortal,
  offset,
  shift,
  useHover,
  useDismiss,
  useRole,
  useInteractions,
  useClick,
  useFloating,
  useFocus
} from '@floating-ui/react';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { TooltipProps } from './types';
import './styles.css';

export const Tooltip = ({ children, text, trigger = 'hover', placement = 'top' }: PropsWithChildren<TooltipProps>) => {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip({
        fallbackAxisSideDirection: 'start',
      }),
      shift(),
      arrow({
        element: arrowRef,
      }),
    ],
  });

  const role = useRole(context, { role: 'tooltip' });
  const hover = useHover(context, { move: false, enabled: trigger === 'hover' });
  const focus = useFocus(context, { enabled: trigger === 'hover' });
  const click = useClick(context, { enabled: trigger === 'click' });
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    role,
    hover,
    focus,
    click,
    dismiss,
  ]);

  useEffect(() => {
    if (trigger === 'click') {
      setTimeout(() => {
        setIsOpen(false);
      }, 2000);
    }
  }, [isOpen]);

  return (
    <>
      <div className="wb-tooltip-container" ref={refs.setReference} {...getReferenceProps()}>{children}</div>
      <FloatingPortal root={document.getElementById('floating-container')}>
        {isOpen && (
          <div
            className="wb-tooltip"
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <FloatingArrow ref={arrowRef} context={context} fill="currentColor" />
            <span className="wb-tooltip-text">{text}</span>
          </div>
        )}
      </FloatingPortal>
    </>
  );
};
