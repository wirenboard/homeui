export interface Option<T = string | boolean | number | null | string[]> {
  label: string;
  value?: T;
  hidden?: boolean;
  tag?: string;
  options?: Option<T>[];
}

export interface DropdownProps<T = string | boolean | number | null | string[]> {
  id?: string;
  className?: string;
  options: Option<T>[];
  value: T | T[];
  placeholder?: string;
  onChange: (_val: Option<T> | Option<T>[]) => void;
  size?: 'default' | 'small';
  ariaLabel?: string;
  isDisabled?: boolean;
  isButton?: boolean;
  isSearchable?: boolean;
  isClearable?: boolean;
  isInvalid?: boolean;
  minWidth?: string;
  noOptionsMessage?: string;
  multiselect?: boolean;
  menuPortal?: boolean;
  captureMenuScroll?: boolean;
  isLoading?: boolean;
  isCreatable?: boolean;
  createOptionPosition?: 'first' | 'last';
  isValidNewOption?: (_inputValue: string, _selectValue: Option<T>[]) => boolean;
  formatCreateLabel?: (_inputValue: string) => string;
}
