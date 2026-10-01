export interface RadioProps {
  id: string;
  checked: boolean;
  label: string;
  description?: string;
  isDisabled?: boolean;
  ariaLabel?: string;
  name?: string;
  onChange: (_val: any) => void;
}

export interface RadioOption {
  id: string;
  label: string;
  description?: string;
  value: string;
  isDisabled?: boolean;
  ariaLabel?: string;
}

export interface RadioGroupProps {
  options: RadioOption[];
  layout?: 'vertical' | 'horizontal';
  value: string;
  onChange: (value: string) => void;
  name?: string;
  isDisabled?: boolean;
}
