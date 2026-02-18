import Select from 'react-select';

const BootstrapLikeSelect = ({
  options,
  selectedOption,
  placeholder,
  onChange,
  isClearable,
  className,
  disabled,
  formatOptionLabel,
}) => {
  const withGroups = options.some((el) => 'options' in el);
  const customStyles = {
    option: (provided, { data }) => {
      if (data?.hidden) {
        provided.display = 'none';
      }
      return provided;
    },
  };
  const customClasses = {
    option: () => {
      return withGroups ? 'with-groups' : '';
    },
  };
  return (
    <Select
      classNamePrefix="wb-react-select"
      options={options}
      isSearchable={true}
      isClearable={isClearable}
      value={selectedOption}
      styles={customStyles}
      placeholder={placeholder}
      className={'wb-react-select' + (className ? ' ' + className : '')}
      classNames={customClasses}
      isDisabled={disabled}
      formatOptionLabel={formatOptionLabel}
      onChange={onChange}
    />
  );
};

export default BootstrapLikeSelect;
