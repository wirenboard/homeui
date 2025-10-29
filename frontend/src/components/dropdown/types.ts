export interface Option<T = string | boolean | number | null | unknown> {
  label: string;
  value: T;
}

export interface DropdownProps<T = string | boolean | number | null | unknown> {
  id?: string;
  className?: string;
  options: Option<T>[];
  value: T;
  placeholder?: string;
  multiselect?: boolean;
  isLoading?: boolean;
  isSearchable?: boolean;
  isClearable?: boolean;
  isDisabled?: boolean;
  isButton?: boolean;
  isInvalid?: boolean;
  minWidth?: string;
  noOptionsMessage?: string;
  onChange: (_val: Option<T> | Option<T>[]) => void;
  size?: 'default' | 'small';
  ariaLabel?: string;
}
