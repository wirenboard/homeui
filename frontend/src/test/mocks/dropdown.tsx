export const DropdownMock = ({ options, onChange, placeholder }: any) => (
  <div data-testid="add-dropdown">
    <span>{placeholder}</span>
    {options?.map((opt: any) => (
      <button key={opt.value} onClick={() => onChange(opt)}>
        {opt.label}
      </button>
    ))}
  </div>
);

export { DropdownMock as Dropdown };
