import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Dropdown, type Option } from '@/components/dropdown';
import { findType } from '@/stores/configurator';
import { devicesStore } from '@/stores/devices';
import type { UnitRolesProps } from '../types';
import { fits } from '../units';
import { roleLabel, UNESCAPED } from '../utils';

// Каналы ролей у строк будущего устройства; каналы своего устройства в списке первыми.
export const UnitRoles = observer(({ rows, deviceId, onBind }: UnitRolesProps) => {
  const { t } = useTranslation();
  const all = devicesStore.topicsWithoutSystem;
  const isOwn = (group: Option<string>) => 'options' in group
    && group.options.some((option) => String(option.value).startsWith(`${deviceId}/`));
  const options = [
    ...all.filter(isOwn).map((group) => ({
      ...group, label: `${group.label} · ${t('configurator.labels.this-device')}`,
    })),
    ...all.filter((group) => !isOwn(group)),
  ];

  return rows.map((row, at) => (
    <div key={at} className="configurator-wbRoles">
      {rows.length > 1 && <span className="configurator-choiceLabel">{row.name}</span>}
      {findType(row.type).roles
        .filter(([role, isRequired]) => isRequired || row.bind[role])
        .map(([role, isRequired]) => {
          const cell = row.bind[role] ? devicesStore.cells.get(row.bind[role]) : null;
          return (
            <div key={role}>
              <div className="configurator-role">
                <span className="configurator-choiceLabel">{roleLabel(role)}</span>
                <Dropdown
                  options={options}
                  value={row.bind[role] ?? null}
                  placeholder={t(`configurator.labels.${isRequired ? 'choose-channel' : 'none'}`)}
                  ariaLabel={t('configurator.labels.channel-for-role', { ...UNESCAPED, role: roleLabel(role) })}
                  isInvalid={isRequired && !row.bind[role]}
                  isCreatable
                  isSearchable
                  isClearable
                  menuPortal
                  onChange={(option: Option<string>) => onBind(at, role, option?.value || null)}
                />
              </div>
              {cell && !fits(cell, role) && (
                <Alert variant="warn" size="small" className="configurator-alertInline">
                  {t('configurator.labels.role-mismatch', { ...UNESCAPED, role: roleLabel(role) })}
                </Alert>
              )}
            </div>
          );
        })}
    </div>
  ));
});
