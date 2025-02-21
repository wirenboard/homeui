import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import CopyIcon from '@/assets/icons/copy.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import WarnIcon from '@/assets/icons/warn.svg';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { Switch } from '@/components/switch';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { RulesStore } from '@/stores/rules';
import './styles.css';

const RulesPage = observer(({ rulesStore, hasRights }: { rulesStore: RulesStore; hasRights: boolean }) => {
  const { t } = useTranslation();
  const { rules } = rulesStore;
  const [isLoading, setIsLoading] = useState(true);
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

  return (
    <PageLayout
      title={t('rules.title')}
      hasRights={hasRights}
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
      {rules.map((rule) => (
        <a className="rules-item" href={`#!/rules/edit/${rule.virtualPath}`} key={rule.virtualPath}>
          <div className="rules-itemTitle">
            {rule.virtualPath}
            {!!rule.error && (
              <Tooltip text={t('rules.labels.with-errors')} placement="top">
                <WarnIcon className="rules-iconError" role="alert" />
              </Tooltip>
            )}
          </div>

          <Tooltip text={t('rules.buttons.copy')} placement="top">
            <Button
              className="rules-icon"
              size="small"
              variant="secondary"
              icon={<CopyIcon />}
              aria-label={`${t('rules.buttons.copy')} ${rule.virtualPath}`}
              onClick={async (ev) => {
                ev.preventDefault();
                await rulesStore.copyRule(rule.virtualPath);
              }}
            />
          </Tooltip>

          <Tooltip text={t('rules.buttons.delete')} placement="top">
            <Button
              className="rules-icon"
              size="small"
              variant="secondary"
              icon={<TrashIcon />}
              aria-label={`${t('rules.buttons.delete')} ${rule.virtualPath}`}
              onClick={(ev) => {
                ev.preventDefault();
                setDeletedRulePath(rule.virtualPath);
              }}
            />
          </Tooltip>

          <Tooltip text={rule.enabled ? t('rules.labels.switch-off') : t('rules.labels.switch-on')} placement="top">
            <Switch
              id={rule.virtualPath}
              value={rule.enabled}
              onChange={() => rulesStore.changeState(rule.virtualPath, !rule.enabled)}
            />
          </Tooltip>
        </a>
      ))}
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
