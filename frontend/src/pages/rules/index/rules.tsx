import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import CopyIcon from '@/assets/icons/copy.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import WarnIcon from '@/assets/icons/warn.svg';
import { documentation } from '@/common/links';
import { Button, ButtonLink } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { Switch } from '@/components/switch';
import { Table, TableRow, TableCell } from '@/components/table';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { rulesStore } from '@/stores/rules';
import './styles.css';

const RulesPage = observer(() => {
  const { t, i18n } = useTranslation();
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
      infoLink={documentation[i18n.language]?.rules}
      hasRights={authStore.hasRights(UserRole.Admin)}
      isLoading={isLoading}
      errors={errors}
      actions={
        errors.length ? null : (
          <ButtonLink
            to="/rules/new"
            variant="primary"
            label={t('rules.buttons.create')}
          />
        )
      }
    >
      <Table isLoading={isRulesUpdating}>
        {rules.map((rule) => (
          <TableRow
            url={`/rules/${rule.virtualPath.split('/').map(encodeURIComponent).join('/')}`}
            aria-label={t('rules.labels.open-rule', { path: rule.virtualPath })}
            key={rule.virtualPath}
          >
            <TableCell width="100%" ellipsis>
              <div className="rules-name" id={`rulepath-${rule.virtualPath}`}>{rule.virtualPath}</div>
            </TableCell>
            <TableCell width={26} align="center" preventClick>
              {!!rule.error && (
                <Tooltip text={t('rules.labels.with-errors')} placement="top">
                  <div className="rules-iconWrapper">
                    <WarnIcon className="rules-iconError" role="alert" />
                  </div>
                </Tooltip>
              )}
            </TableCell>
            <TableCell width={30} preventClick>
              <Tooltip text={t('rules.buttons.copy')} placement="top">
                <Button
                  className="rules-icon"
                  size="small"
                  icon={<CopyIcon />}
                  aria-label={`${t('rules.buttons.copy')} ${rule.virtualPath}`}
                  onClick={() => copyRule(rule.virtualPath)}
                />
              </Tooltip>
            </TableCell>
            <TableCell width={30} preventClick>
              <Tooltip text={t('rules.buttons.delete')} placement="top">
                <Button
                  className="rules-icon"
                  size="small"
                  variant="danger"
                  icon={<TrashIcon />}
                  aria-label={`${t('rules.buttons.delete')} ${rule.virtualPath}`}
                  aria-haspopup="dialog"
                  onClick={() => setDeletedRulePath(rule.virtualPath)}
                />
              </Tooltip>
            </TableCell>
            <TableCell width={34} preventClick>
              <Tooltip
                text={rule.enabled ? t('rules.labels.switch-off') : t('rules.labels.switch-on')}
                id={`ruleDisable-${rule.virtualPath}`}
                aria-label={rule.enabled ? t('rules.labels.switch-off') : t('rules.labels.switch-on')}
                placement="top"
              >
                <Switch
                  id={rule.virtualPath}
                  value={rule.enabled}
                  ariaLabelledby={`rulepath-${rule.virtualPath} ruleDisable-${rule.virtualPath}`}
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
