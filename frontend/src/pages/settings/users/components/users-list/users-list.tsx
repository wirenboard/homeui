import { useTranslation } from 'react-i18next';
import EditIcon from '@/assets/icons/edit.svg';
import KeyIcon from '@/assets/icons/key.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Card } from '@/components/card';
import type { UsersListProps } from './types';
import './styles.css';

export const UsersList = ({
  users, passkeysDisabledHint, onlyOneAdmin, onEdit, onPasskeys, onDelete,
}: UsersListProps) => {
  const { t } = useTranslation();

  return (
    <div>
      {users.map((user) => (
        <Card
          key={user.id}
          className="usersList-card"
          heading={user.login}
          variant="secondary"
          actions={[
            { title: t('users.buttons.edit'), icon: EditIcon, isPopupAction: true, action: () => onEdit(user) },
            {
              title: t(passkeysDisabledHint || 'users.buttons.passkeys'),
              icon: KeyIcon,
              isPopupAction: true,
              disabled: !!passkeysDisabledHint,
              action: () => onPasskeys(user),
            },
            {
              title: t('users.buttons.delete'),
              icon: TrashIcon,
              isPopupAction: true,
              disabled: user.type === 'admin' && onlyOneAdmin,
              action: () => onDelete(user),
            },
          ]}
        >
          {t('users.labels.' + user.type)}
        </Card>
      ))}
    </div>
  );
};
