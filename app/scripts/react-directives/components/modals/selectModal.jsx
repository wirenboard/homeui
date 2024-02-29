import React, { useEffect, useState } from 'react';
import { Button } from '../../common';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  ModalCancelButton,
} from './modals';

export const SelectModal = ({
  id,
  active,
  title,
  selectButtonLabel,
  options,
  onSelect,
  onCancel,
}) => {
  const [selectedValue, setSelectedValue] = useState(undefined);
  useEffect(() => {
    if (options?.length) {
      setSelectedValue(options[0].value);
    }
  }, [options]);
  const onChange = event => setSelectedValue(event.target.value);
  return (
    <Modal id={id} active={active} onCancel={onCancel}>
      <ModalHeader>
        <ModalTitle id={id} text={title} />
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
          label={selectButtonLabel}
          type={'success'}
          onClick={() => onSelect(selectedValue)}
        />
        <ModalCancelButton onClick={onCancel} />
      </ModalFooter>
    </Modal>
  );
};
