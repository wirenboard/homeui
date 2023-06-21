import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  ModalCancelButton,
} from '../components/modals/modals';

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
