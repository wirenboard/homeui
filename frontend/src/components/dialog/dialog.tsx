import classNames from 'classnames';
import { useRef, useEffect, PropsWithChildren } from 'react';
import CloseIcon from '@/assets/icons/close.svg';
import { DialogProps } from './types';
import './styles.css';

export const Dialog = ({
  children,
  className,
  heading,
  withPadding = true,
  isOpened,
  onClose,
}: PropsWithChildren<DialogProps>) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (dialogRef.current) {
      if (isOpened) {
        dialogRef.current.showModal();
      } else {
        dialogRef.current.close();
      }
    }

    return () => {
      if (dialogRef.current) {
        dialogRef.current.close();
      }
    };
  }, [dialogRef, isOpened]);

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
