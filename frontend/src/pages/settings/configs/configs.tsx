import { observer } from 'mobx-react-lite';
import { useEffect, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableCell, TableRow } from '@/components/table';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { type ConfigListItem } from '@/stores/configs';
import { type ConfigsPageProps } from './types';
import './styles.css';

const ConfigsPage = observer(({ store }: ConfigsPageProps) => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    store.getList();
  }, []);

  const getUrl = (config: ConfigListItem) => {
    const encodePath = (path: string) => path.replace(/\//g, '~2F');

    return config.editor ? `/#!/${config.editor}` : `/#!/configs/edit/${encodePath(config.schemaPath)}`;
  };

  const copyToClipboard = async (ev: MouseEvent<HTMLDivElement>, text: string) => {
    ev.preventDefault();
    await navigator.clipboard.writeText(text);
  };

  return (
    <PageLayout
      title={t('configurations.title')}
      hasRights={authStore.hasRights(UserRole.Admin)}
      isLoading={!store.configs.length}
    >
      <Table>
        <TableRow isHeading>
          <TableCell>
            {t('configurations.labels.title')}
          </TableCell>
          <TableCell>
            {t('configurations.labels.file')}
          </TableCell>
        </TableRow>

        {store.configs.map((config) => (
          <TableRow key={config.configPath} url={getUrl(config)}>
            <TableCell>
              {config.titleTranslations?.[i18n.language] || config.title}
            </TableCell>
            <TableCell>
              <div
                className="configs-itemPath"
                onClick={(ev) => copyToClipboard(ev, config.configPath)}
              >
                <Tooltip
                  text={t('configurations.labels.copy')}
                  trigger="click"
                >
                  {config.configPath}
                </Tooltip>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </PageLayout>
  );
});

export default ConfigsPage;
