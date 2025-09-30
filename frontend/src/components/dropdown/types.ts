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
  onChange: (_val: Option<T>) => void;
  multiselect?: boolean;
  isLoading?: boolean;
  isSearchable?: boolean;
  isClearable?: boolean;
  isDisabled?: boolean;
  isButton?: boolean;
  isInvalid?: boolean;
  minWidth?: string;
  onChange: (_val: Option | Option[]) => void;
  size?: 'default' | 'small';
  ariaLabel?: string;
}
