// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dropdown } from './dropdown';

const options = [
  { value: 'wb-adc/A1', label: 'A1 [wb-adc/A1]' },
  { value: 'wb-adc/A2', label: 'A2 [wb-adc/A2]' },
];

describe('Dropdown with isCreatable', () => {
  test('displays a value missing from options as-is instead of an empty field', async () => {
    render(<Dropdown options={options} value="+/+" isCreatable isSearchable onChange={vi.fn()} />);
    expect(await screen.findByText('+/+')).toBeDefined();
  });

  test('without isCreatable a value missing from options renders nothing (strict select)', () => {
    render(
      <Dropdown options={options} value="+/+" placeholder="Choose..." isSearchable onChange={vi.fn()} />,
    );
    expect(screen.queryByText('+/+')).toBeNull();
    expect(screen.getByText('Choose...')).toBeDefined();
  });

  test('typed free-form value can be committed through the create option', async () => {
    const onChange = vi.fn();
    render(<Dropdown options={options} value="" isCreatable isSearchable onChange={onChange} />);

    // CreatableSelect is lazy-loaded, wait for the input to appear
    await waitFor(() => {
      expect(document.querySelector('input[aria-autocomplete="list"]')).toBeTruthy();
    });
    const input = document.querySelector('input[aria-autocomplete="list"]')!;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '+/+' } });

    const createOption = await waitFor(() => {
      const option = document.querySelector('.dropdown__option');
      expect(option).toBeTruthy();
      return option!;
    });
    expect(createOption.textContent).toContain('+/+');
    fireEvent.click(createOption);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ value: '+/+' }));
  });

  test('value present in options still resolves to its label', async () => {
    render(<Dropdown options={options} value="wb-adc/A2" isCreatable isSearchable onChange={vi.fn()} />);
    expect(await screen.findByText('A2 [wb-adc/A2]')).toBeDefined();
  });

  test('multiselect displays values missing from options instead of dropping them', async () => {
    render(
      <Dropdown
        options={options}
        value={['wb-adc/A1', '+/+']}
        multiselect
        isCreatable
        isSearchable
        onChange={vi.fn()}
      />,
    );
    expect(await screen.findByText('A1 [wb-adc/A1]')).toBeDefined();
    expect(await screen.findByText('+/+')).toBeDefined();
  });

  test('multiselect without isCreatable still drops values missing from options', async () => {
    render(
      <Dropdown
        options={options}
        value={['wb-adc/A1', '+/+']}
        multiselect
        isSearchable
        onChange={vi.fn()}
      />,
    );
    expect(await screen.findByText('A1 [wb-adc/A1]')).toBeDefined();
    expect(screen.queryByText('+/+')).toBeNull();
  });
});
