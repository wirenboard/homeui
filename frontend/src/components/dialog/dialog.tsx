import { useRef, useEffect, PropsWithChildren, useState } from 'react';
import { DialogProps } from './types';
import './styles.css';

export const Dialog = ({
  isOpened,
  heading,
  onClose,
  closedby,
  children,
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
    <dialog className="dialog" ref={dialogRef} onClose={onClose}>
      {heading && <h3 className="dialog-title">{heading}</h3>}
      {isOpened && (<div className="dialog-content" ref={contentRef}>{children}</div>)}
    </dialog>
  );
};
