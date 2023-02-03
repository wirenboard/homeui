import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common';
import FocusLock from 'react-focus-lock';

function GetLabelId(modalId) {
  return modalId + 'Label';
}

const ModalCancelButton = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <button type="button" className="btn btn-default" data-dismiss="modal" onClick={onClick}>
      {t('network-connections.buttons.cancel')}
    </button>
  );
};

const ModalHeader = ({ children }) => {
  return <div className="modal-header">{children}</div>;
};

const ModalBody = ({ children }) => {
  return <div className="modal-body">{children}</div>;
};

const ModalFooter = ({ children }) => {
  return <div className="modal-footer">{children}</div>;
};

const ModalTitle = ({ id, text }) => {
  return (
    <h4 className="modal-title" id={GetLabelId(id)}>
      {text}
    </h4>
  );
};

const Modal = ({ id, active, onCancel, children }) => {
  // The idea is taken from https://usehooks.com/useOnClickOutside
  const ref = useRef();
  useEffect(() => {
    if (active) {
      const handleClick = event => {
        if (ref && ref.current && !ref.current.contains(event.target)) {
          onCancel();
        }
      };
      const handleEsc = event => {
        if (event.key === 'Escape') {
          onCancel();
        }
      };
      document.addEventListener('keydown', handleEsc, true);
      document.addEventListener('mousedown', handleClick, true);
      document.addEventListener('touchstart', handleClick, true);
      var backdrop = document.createElement('div');
      backdrop.classList.add('modal-backdrop');
      backdrop.classList.add('in');
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

export const ConfirmModal = ({ id, active, text, buttons, onCancel }) => {
  return (
    <Modal id={id} active={active} onCancel={onCancel}>
      <ModalBody>
        <ModalTitle id={id} text={text}></ModalTitle>
      </ModalBody>
      <ModalFooter>
        {buttons.map((bt, index) => {
          return (
            <Button key={index} label={bt.label} type={bt.type || 'default'} onClick={bt.onClick} />
          );
        })}
        <ModalCancelButton onClick={onCancel} />
      </ModalFooter>
    </Modal>
  );
};

export const SelectModal = ({ id, active, title, options, onSelect, onCancel }) => {
  const { t } = useTranslation();
  const [selectedValue, setSelectedValue] = useState(options.length ? options[0].value : undefined);
  const onChange = event => setSelectedValue(event.target.value);
  return (
    <Modal id={id} active={active} onCancel={onCancel}>
      <ModalHeader>
        <ModalTitle id={id} text={title}></ModalTitle>
      </ModalHeader>
      <ModalBody>
        <select className="form-control" value={selectedValue} onChange={onChange}>
          {options.map(({ title, value }, index) => (
            <option key={index} value={value}>
              {title}
            </option>
          ))}
        </select>
      </ModalBody>
      <ModalFooter>
        <Button
          label={t('network-connections.buttons.add')}
          type={'success'}
          onClick={() => onSelect(selectedValue)}
        />
        <ModalCancelButton onClick={onCancel} />
      </ModalFooter>
    </Modal>
  );
};
