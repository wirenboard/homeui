import classNames from 'classnames';
import { useRef, useEffect, PropsWithChildren, useState } from 'react';
import CloseIcon from '@/assets/icons/close.svg';
import { DialogProps } from './types';
import './styles.css';

export const Dialog = ({
  children,
  className,
  heading,
  withPadding = true,
  isOpened,
  closedby,
  onClose,
}: PropsWithChildren<DialogProps>) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [allowClose, setAllowClose] = useState(false);

  useEffect(() => {
    if (dialogRef.current) {
      if (isOpened) {
        dialogRef.current.showModal();
        setAllowClose(true);
      } else {
        setAllowClose(false);
        dialogRef.current.close();
      }
    }

    return () => {
      if (dialogRef.current) {
        setAllowClose(false);
        dialogRef.current.close();
      }
    };
  }, [dialogRef, isOpened]);

  if (closedby === 'any') {
    const handleClick = (event: MouseEvent) => {
      if (allowClose && contentRef.current && !contentRef.current.contains(event.target as HTMLElement)) {
        event.stopPropagation();
        event.preventDefault();
        dialogRef.current?.close();
      }
    };
    useEffect(() => {
      document.addEventListener('click', handleClick);

      return () => {
        document.removeEventListener('click', handleClick);
      };
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className={classNames('dialog', className)}
      onClose={onClose}
    >
      {isOpened && (
        <>
          <header className="dialog-header">
            <h3 className="dialog-title">{heading}</h3>
            <button className="dialog-close" onClick={() => dialogRef.current.close()}>
              <CloseIcon />
            </button>
          </header>
          <div
            ref={contentRef}
            className={classNames({
              'dialog-content': withPadding,
            })}
          >
            {children}
          </div>
        </>
      )}
    </dialog>
  );
};
