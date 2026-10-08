import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, type Option } from '@/components/dropdown';
import { FieldLabel } from '@/components/form/field-label';
import { FormField } from '@/components/form/form-field';
import i18n from '@/i18n/config';
import { cellType } from '@/stores/devices';
import type { UnitFieldProps } from '../types';

// Единицы конвенции, которых нет ни у типов ячеек, ни в словарях units.
const EXTRA_UNITS = ['%', 'ppb', 'ms', 'K', 'kW', 'dBA'];

// Коды единиц из типов ячеек и словарей units всех языков.
const UNIT_CODES = Array.from(new Set([
  ...EXTRA_UNITS,
  ...Array.from(cellType.values()).map((entry) => entry.units).filter(Boolean),
  ...Object.keys(i18n.store.data)
    .flatMap((lng) => Object.keys(i18n.getResourceBundle(lng, i18n.options.defaultNS as string)?.units ?? {})),
]));

export const UnitField = ({ value, onChange }: UnitFieldProps) => {
  const { t } = useTranslation();
  const id = useId();
  const options: Option<string>[] = UNIT_CODES.map((unit) => {
    const label = t(`units.${unit}`, unit);
    return { label: label === unit ? unit : `${label} (${unit})`, value: unit };
  });

  return (
    <FormField>
      <FieldLabel title={t('configurator.labels.unit')} inputId={id} />
      <Dropdown
        id={id}
        options={options}
        value={value || null}
        placeholder={t('configurator.labels.unit-placeholder')}
        isSearchable
        isClearable
        isCreatable
        menuPortal
        onChange={(option: Option<string>) => onChange(option?.value ?? '')}
      />
    </FormField>
  );
};
