'use strict';

import React from 'react';
import Select from 'react-select';

const BootstrapLikeSelect = ({
  options,
  selectedOption,
  placeholder,
  onChange,
  isClearable,
  hasErrors,
  className,
}) => {
  const withGroups = options.some(el => 'options' in el);
  const borderColor = hasErrors ? '#b94a48' : '#ccc';
  const customStyles = {
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: provided => ({
      ...provided,
      color: 'black',
      paddingLeft: '0px',
      paddingRight: '0px',
      width: '15px',
    }),
    clearIndicator: provided => ({
      ...provided,
      color: 'black',
      paddingLeft: '0px',
      paddingRight: '0px',
      width: '15px',
    }),
    indicatorsContainer: provided => ({
      ...provided,
      height: '32px',
    }),
    control: provided => ({
      ...provided,
      borderRadius: '0px',
      borderColor: borderColor,
      boxShadow: 'unset',
      height: '32px',
      minHeight: '32px',
      ':hover': {
        borderColor: borderColor,
      },
    }),
    groupHeading: provided => {
      return {
        ...provided,
        textTransform: 'unset',
        fontSize: 'unset',
        color: 'black',
        fontWeight: 'bold',
      };
    },
    option: (provided, { data }) => {
      if (withGroups) {
        provided.paddingLeft = '20px';
      }
      if (data?.hidden) {
        provided.display = 'none';
      }
      return provided;
    },
  };
  return (
    <Select
      options={options}
      isSearchable={true}
      isClearable={isClearable}
      value={selectedOption}
      styles={customStyles}
      placeholder={placeholder}
      onChange={onChange}
      className={className}
    />
  );
};

export default BootstrapLikeSelect;
