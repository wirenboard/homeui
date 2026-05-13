import { useId } from 'react';

export const Checkbox = ({ label, value, onChange, disabled }) => {
  const id = useId();
  return (
    <div className="checkbox">
      <label htmlFor={id} disabled={disabled}>
        <input type="checkbox" id={id} checked={value} disabled={disabled} onChange={onChange} />
        {label}
      </label>
    </div>
  );
};
