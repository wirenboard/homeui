import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { Dropdown } from '@/components/dropdown';
import { Input } from '@/components/input';
import { Password } from '@/components/password';
import './styles.css';

export const EditUserModal = ({ onSave, user, onCancel }) => {
  const { t } = useTranslation();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState('user');
  const [isReadOnlyAdmin, setIsReadOnlyAdmin] = useState(false);

  const options = [
    { value: 'user', label: t('users.labels.user') },
    { value: 'operator', label: t('users.labels.operator') },
    { value: 'admin', label: t('users.labels.admin') },
  ];

  useEffect(() => {
    if (user) {
      setLogin(user.login || '');
      setType(user.readOnly ? 'admin' : user.type);

      if (user.readOnly) {
        setIsReadOnlyAdmin(true);
      }
    }
  }, []);

  return (
    <Confirm
      width={450}
      heading={t('users.labels.user')}
      acceptLabel={t('users.buttons.save')}
      confirmCallback={() => onSave({ login, password, type })}
      closeCallback={onCancel}
      isDisabled={!login || !password}
      isOpened
    >
      <label className="editUser-field">
        {t('users.labels.login')}
        <Input value={login} autoComplete="username" onChange={(val: string) => setLogin(val)} />
      </label>

      <label className="editUser-field">
        {t('users.labels.password')}
        <Password
          value={password}
          autoComplete="new-password"
          showIndicator
          onChange={(val: string) => setPassword(val)}
        />
      </label>

      <label className="editUser-field">
        {t('users.labels.type')}
        <Dropdown
          options={options}
          value={type}
          isDisabled={isReadOnlyAdmin}
          onChange={({ value }) => setType(value as string)}
        />
      </label>
    </Confirm>
  );
};
