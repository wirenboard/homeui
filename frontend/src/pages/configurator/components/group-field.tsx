import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, type Option } from '@/components/dropdown';
import { FieldLabel } from '@/components/form/field-label';
import { FormField } from '@/components/form/form-field';
import { configuratorStore } from '@/stores/configurator';
import type { GroupFieldProps } from '../types';

export const GroupField = observer(({ value, onChange }: GroupFieldProps) => {
  const { t } = useTranslation();
  const id = useId();
  const groups = Array.from(new Set(configuratorStore.devices.map((device) => device.group.trim()).filter(Boolean)));
  const options: Option<string>[] = groups
    .sort((a, b) => a.localeCompare(b))
    .map((group) => ({ label: group, value: group }));

  return (
    <FormField>
      <FieldLabel title={t('configurator.labels.group')} inputId={id} />
      <Dropdown
        id={id}
        options={options}
        value={value || null}
        placeholder={t('configurator.labels.no-group')}
        isSearchable
        isClearable
        isCreatable
        menuPortal
        onChange={(option: Option<string>) => {
          onChange(option?.value.trim() ?? '');
        }}
      />
    </FormField>
  );
});
