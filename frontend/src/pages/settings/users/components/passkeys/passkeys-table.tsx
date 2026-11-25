import { useTranslation } from 'react-i18next';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Table, TableCell, TableRow } from '@/components/table';
import type { PasskeysViewProps } from './types';

export const PasskeysTable = ({ rows, onDelete }: PasskeysViewProps) => {
  const { t } = useTranslation();

  return (
    <Table>
      <TableRow isHeading>
        <TableCell width="25%">{t('users.labels.passkey-name')}</TableCell>
        <TableCell width="25%">{t('users.labels.passkey-domain')}</TableCell>
        <TableCell width="25%">{t('users.labels.passkey-created')}</TableCell>
        <TableCell width="25%">{t('users.labels.passkey-last-used')}</TableCell>
        <TableCell width={70} />
      </TableRow>
      {rows.map(({ credential, domain, createdAt, lastUsedAt }) => (
        <TableRow key={credential.id}>
          <TableCell ellipsis>{credential.name}</TableCell>
          <TableCell ellipsis>{domain}</TableCell>
          <TableCell>{createdAt}</TableCell>
          <TableCell>{lastUsedAt}</TableCell>
          <TableCell align="right">
            <Button
              size="small"
              variant="danger"
              icon={<TrashIcon />}
              aria-label={t('users.buttons.delete-passkey')}
              onClick={() => onDelete(credential)}
            />
          </TableCell>
        </TableRow>
      ))}
    </Table>
  );
};
