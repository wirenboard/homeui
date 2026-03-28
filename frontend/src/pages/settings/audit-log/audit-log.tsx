import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Table, TableCell, TableRow } from '@/components/table';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { AuditLogEntryEvent, auditLogStore } from './page-store';
import './styles.css';

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 1) {
    return [];
  }

  const pages = new Set<number>();
  pages.add(0);
  pages.add(total - 1);

  for (let i = Math.max(0, current - 2); i <= Math.min(total - 1, current + 2); i++) {
    pages.add(i);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | '...')[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('...');
    }
    result.push(sorted[i]);
  }

  return result;
}

function formatDescription(entry: { login: string; scope: string; event: AuditLogEntryEvent }) {
  if (entry.scope === 'auth') {
    const ip = entry.event.ip || '';
    const userAgent = entry.event.ua_pretty || entry.event.ua || '';
    return `${entry.event.text || ''} ${entry.login}, ip ${ip}, ${userAgent}`;
  }

  return entry.event.text || '';
}

const AuditLogPage = observer(() => {
  const { t } = useTranslation();

  useEffect(() => {
    auditLogStore.load();
  }, []);

  return (
    <PageLayout
      title={t('audit-log.title')}
      hasRights={authStore.hasRights(UserRole.Admin)}
      isLoading={false}
    >
      <div
        className={auditLogStore.isLoading
          ? 'audit-log-content audit-log-content_loading'
          : 'audit-log-content'}
      >
        <Table>
          <TableRow isHeading>
            <TableCell width="15%">{t('audit-log.labels.time')}</TableCell>
            <TableCell width="12%">{t('audit-log.labels.user')}</TableCell>
            <TableCell width="10%">{t('audit-log.labels.type')}</TableCell>
            <TableCell width="63%">{t('audit-log.labels.description')}</TableCell>
          </TableRow>

          {auditLogStore.entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{new Date(entry.timestamp * 1000).toLocaleString()}</TableCell>
              <TableCell ellipsis>{entry.login}</TableCell>
              <TableCell ellipsis>{entry.scope}</TableCell>
              <TableCell ellipsis>{formatDescription(entry)}</TableCell>
            </TableRow>
          ))}
        </Table>

        {auditLogStore.error && (
          <div className="audit-log-empty">{t('audit-log.labels.error')}</div>
        )}

        {!auditLogStore.isLoading && auditLogStore.entries.length === 0 && (
          <div className="audit-log-empty">{t('audit-log.labels.empty')}</div>
        )}
      </div>

      <div className="audit-log-pagination">
        <Button
          label={`← ${t('audit-log.labels.prev-page')}`}
          variant="secondary"
          disabled={auditLogStore.isLoading || auditLogStore.page === 0}
          onClick={() => auditLogStore.loadPage(auditLogStore.page - 1)}
        />

        {buildPageNumbers(auditLogStore.page, auditLogStore.totalPages).map((item, index) => (
          item === '...'
            ? (
              <span key={`ellipsis-${index}`} className="audit-log-ellipsis">...</span>
            )
            : (
              <Button
                key={item}
                label={String(item + 1)}
                variant={item === auditLogStore.page ? 'primary' : 'secondary'}
                disabled={auditLogStore.isLoading}
                onClick={() => auditLogStore.loadPage(item)}
              />
            )
        ))}

        <Button
          label={`${t('audit-log.labels.next-page')} →`}
          variant="secondary"
          disabled={auditLogStore.isLoading || auditLogStore.page >= auditLogStore.totalPages - 1}
          onClick={() => auditLogStore.loadPage(auditLogStore.page + 1)}
        />
      </div>
    </PageLayout>
  );
});

export default AuditLogPage;
