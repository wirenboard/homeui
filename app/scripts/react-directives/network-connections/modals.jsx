import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from '../common';

export const ModalCancelButton = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <button type="button" className="btn btn-default" data-dismiss="modal" onClick={onClick}>
      {t('network-connections.buttons.cancel')}
    </button>
  );
};

export const ConfirmModal = ({ id, active, text, buttons, onCancel }) => {
  return (
    <Modal id={id} active={active} onCancel={onCancel}>
      <ModalBody>
        <ModalTitle id={id} text={text}></ModalTitle>
      </ModalBody>
      <ModalFooter>
        {buttons?.length &&
          buttons.map((bt, index) => {
            return (
              <Button
                key={index}
                label={bt.label}
                type={bt.type || 'default'}
                onClick={bt.onClick}
              />
            );
          })}
        <ModalCancelButton onClick={onCancel} />
      </ModalFooter>
    </Modal>
  );
};

export const SelectModal = ({ id, active, title, options, onSelect, onCancel }) => {
  const { t } = useTranslation();
  const [selectedValue, setSelectedValue] = useState(
    options?.length ? options[0].value : undefined
  );
  const onChange = event => setSelectedValue(event.target.value);
  return (
    <Modal id={id} active={active} onCancel={onCancel}>
      <ModalHeader>
        <ModalTitle id={id} text={title}></ModalTitle>
      </ModalHeader>
      <ModalBody>
        <select className="form-control" value={selectedValue} onChange={onChange}>
          {options?.length &&
            options.map(({ title, value }, index) => (
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
