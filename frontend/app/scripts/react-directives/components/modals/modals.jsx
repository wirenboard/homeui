import { useRef, useEffect } from 'react';
import FocusLock from 'react-focus-lock';
import { useTranslation } from 'react-i18next';

export const ModalHeader = ({ children }) => {
  return <div className="modal-header">{children}</div>;
};

export const ModalBody = ({ children }) => {
  return <div className="modal-body">{children}</div>;
};

export const ModalFooter = ({ children }) => {
  return <div className="modal-footer">{children}</div>;
};

export const ModalTitle = ({ id, text }) => {
  return (
    <h4 className="modal-title" id={GetLabelId(id)}>
      {text}
    </h4>
  );
};

const GetLabelId = (modalId) => {
  return modalId + 'Label';
};

export const Modal = ({ id, active, onCancel, children }) => {
  // The idea is taken from https://usehooks.com/useOnClickOutside
  const ref = useRef();
  useEffect(() => {
    if (active) {
      const handleClick = (event) => {
        if (ref && ref.current && !ref.current.contains(event.target)) {
          onCancel();
        }
      };
      const handleEsc = (event) => {
        if (event.key === 'Escape') {
          onCancel();
        }
      };
      if (onCancel) {
        document.addEventListener('keydown', handleEsc, true);
        document.addEventListener('mousedown', handleClick, true);
        document.addEventListener('touchstart', handleClick, true);
      }
      let backdrop = document.createElement('div');
      backdrop.classList.add('modal-backdrop');
      backdrop.classList.add('in');
      backdrop.style.zIndex = 1040;
      document.body.appendChild(backdrop);
      document.body.classList.add('modal-open');
      return () => {
        document.removeEventListener('keydown', handleEsc, true);
        document.removeEventListener('mousedown', handleClick, true);
        document.removeEventListener('touchstart', handleClick, true);
        document.body.removeChild(backdrop);
        document.body.classList.remove('modal-open');
      };
    }
  }, [ref, active, onCancel]);

  return (
    <div
      className={active ? 'modal in' : 'modal'}
      id={id}
      tabIndex="-1"
      role="dialog"
      aria-labelledby={GetLabelId(id)}
      style={{ display: active ? 'block' : 'none' }}
    >
      <div ref={ref} className="modal-dialog" role="document">
        <FocusLock disabled={!active}>
          <div className="modal-content">{children}</div>
        </FocusLock>
      </div>
    </div>
  );
};

export const ModalCancelButton = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <button type="button" className="btn btn-default" data-dismiss="modal" onClick={onClick}>
      {t('network-connections.buttons.cancel')}
    </button>
  );
};
