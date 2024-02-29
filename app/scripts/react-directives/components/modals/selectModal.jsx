import React, { useEffect, useState } from 'react';
import { Button, BootstrapLikeSelect } from '../../common';
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
  const [selectedOption, setSelectedOption] = useState(undefined);
  useEffect(() => {
    if (options?.length) {
      if (options[0]?.options) {
        setSelectedOption(options[0].options[0]);
      } else {
        setSelectedOption(options[0]);
      }
    }
  }, [options]);
  return (
    <Modal id={id} active={active} onCancel={onCancel}>
      <ModalHeader>
        <ModalTitle id={id} text={title} />
      </ModalHeader>
      <ModalBody>
        <BootstrapLikeSelect
          options={options}
          selectedOption={selectedOption}
          onChange={option => setSelectedOption(option)}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          label={selectButtonLabel}
          type={'success'}
          onClick={() => onSelect(selectedOption.value)}
        />
        <ModalCancelButton onClick={onCancel} />
      </ModalFooter>
    </Modal>
  );
};
