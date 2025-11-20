import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import CopyIcon from '@/assets/icons/copy.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import WarnIcon from '@/assets/icons/warn.svg';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { Switch } from '@/components/switch';
import { Table, TableRow, TableCell } from '@/components/table';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { RulesStore } from '@/stores/rules';
import './styles.css';

const RulesPage = observer(({ rulesStore }: { rulesStore: RulesStore }) => {
  const { t } = useTranslation();
  const { rules } = rulesStore;
  const [isLoading, setIsLoading] = useState(true);
  const [isRulesUpdating, setIsRulesUpdating] = useState(false);
  const [deletedRulePath, setDeletedRulePath] = useState(null);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    rulesStore.getList()
      .catch((err) => {
        if (err.data === 'MqttConnectionError') {
          setErrors([{ variant: 'danger', text: t('rules.errors.mqtt-connection') }]);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const createRule = () => location.assign('/#!/rules/new');

  const copyRule = async (path: string) => {
    setIsRulesUpdating(true);
    await rulesStore.copyRule(path);
    setIsRulesUpdating(false);
  };

  const changeRuleState = async (path: string, isEnabled: boolean) => {
    setIsRulesUpdating(true);
    await rulesStore.changeState(path, !isEnabled);
    setIsRulesUpdating(false);
  };

  return (
    <PageLayout
      title={t('rules.title')}
      hasRights={authStore.hasRights(UserRole.Admin)}
      isLoading={isLoading}
      errors={errors}
      actions={
        errors.length ? null : (
          <Button
            variant="success"
            label={t('rules.buttons.create')}
            onClick={createRule}
          />
        )
      }
    >
      <Table isLoading={isRulesUpdating}>
        {rules.map((rule) => (
          <TableRow url={`#!/rules/edit/${rule.virtualPath}`} key={rule.virtualPath}>
            <TableCell ellipsis>
              <div className="rules-name">{rule.virtualPath}</div>
            </TableCell>
            <TableCell width={40} visibleOnHover preventClick>
              <Tooltip text={t('rules.buttons.copy')} placement="top">
                <Button
                  className="rules-icon"
                  size="small"
                  variant="secondary"
                  icon={<CopyIcon />}
                  aria-label={`${t('rules.buttons.copy')} ${rule.virtualPath}`}
                  onClick={() => copyRule(rule.virtualPath)}
                />
              </Tooltip>
            </TableCell>
            <TableCell width={40} visibleOnHover preventClick>
              <Tooltip text={t('rules.buttons.delete')} placement="top">
                <Button
                  className="rules-icon"
                  size="small"
                  variant="secondary"
                  icon={<TrashIcon />}
                  aria-label={`${t('rules.buttons.delete')} ${rule.virtualPath}`}
                  onClick={() => setDeletedRulePath(rule.virtualPath)}
                />
              </Tooltip>
            </TableCell>
            <TableCell width={20}>
              {!!rule.error && (
                <Tooltip text={t('rules.labels.with-errors')} placement="top">
                  <div className="rules-iconWrapper">
                    <WarnIcon className="rules-iconError" role="alert" />
                  </div>
                </Tooltip>
              )}
            </TableCell>
            <TableCell width={34} preventClick>
              <Tooltip text={rule.enabled ? t('rules.labels.switch-off') : t('rules.labels.switch-on')} placement="top">
                <Switch
                  id={rule.virtualPath}
                  value={rule.enabled}
                  onChange={() => changeRuleState(rule.virtualPath, rule.enabled)}
                />
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </Table>

      <Confirm
        isOpened={!!deletedRulePath}
        heading={t('rules.labels.delete-title')}
        variant="danger"
        closeCallback={() => setDeletedRulePath(null)}
        confirmCallback={async () => {
          await rulesStore.deleteRule(deletedRulePath);
          setDeletedRulePath(null);
        }}
      >
        <Trans
          i18nKey="rules.prompt.delete"
          values={{
            name: deletedRulePath,
          }}
          components={[<b key="rule-name" />]}
          shouldUnescape
        />
      </Confirm>
    </PageLayout>
  );
});

export default RulesPage;
