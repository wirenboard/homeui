import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/card';
import { BooleanField, OptionsField, StringField } from '@/components/form';
import { RadioGroup } from '@/components/radio';
import { useParseHash } from '@/utils/url';
import type {
  ClickBindingFormProps,
  ParamBindingFormProps,
  VisibleBindingFormProps,
  VisualBindingsEditorProps,
} from './types';
import './styles.css';

const VisibleBindingForm = observer(({ store, devices }: VisibleBindingFormProps) => {
  const { t } = useTranslation();

  return (
    <Card
      variant="secondary"
      isBodyVisible={store.params.visible.enable}
      heading={
        <BooleanField
          title={t('edit-svg-dashboard.labels.visible-enable')}
          value={store.params.visible.enable}
          onChange={(checked) => store.setParamValue('visible', 'enable', checked)}
        />
      }
    >
      <>
        <OptionsField
          title={t('edit-svg-dashboard.labels.channel')}
          placeholder={t('edit-svg-dashboard.labels.select-channel-placeholder')}
          value={store.params.visible.channel}
          options={devices}
          error={!store.params.visible.channel ? t('validator.errors.empty') : null}
          isClearable
          isSearchable
          onChange={(value: string) => store.setParamValue('visible', 'channel', value)}
        />

        <div className="visualBindingsEditor-visibles">
          <OptionsField
            title={t('edit-svg-dashboard.labels.condition')}
            value={store.params.visible.condition}
            options={[
              { label: '==', value: '==' },
              { label: '!=', value: '!=' },
              { label: '>', value: '>' },
              { label: '<', value: '<' },
            ]}
            onChange={(value: string) => store.setParamValue('visible', 'condition', value)}
          />
          <StringField
            title={t('edit-svg-dashboard.labels.value')}
            value={store.params.visible.value}
            error={!store.params.visible.value ? t('validator.errors.empty') : null}
            onChange={(value: string) => store.setParamValue('visible', 'value', value)}
          />
        </div>
      </>
    </Card>
  );
});

const ClickBindingForm = observer(({
  title,
  store,
  dashboardsStore,
  clickParamName,
  writeParamName,
  devices,
  writeDefault,
}: ClickBindingFormProps) => {
  const { t } = useTranslation();
  const { id } = useParseHash();

  const dashboardOptions = useMemo(() => {
    return dashboardsStore?.dashboards ? Array.from(dashboardsStore.dashboards.values())
      .filter((dashboard) => dashboard.id !== id)
      .map((dashboard) => ({
        label: dashboard.name,
        value: dashboard.id,
      })) : [];
  }, [dashboardsStore?.dashboards, id]);

  const enabled = !!(store.params[clickParamName].enable || store.params[writeParamName].enable);

  const jsFunctionValidator = (value?: string) => {
    if (!value && typeof value !== 'number') {
      return t('validator.errors.empty');
    }
    try {
      new Function('val', `return ${value}`);
    } catch (err) {
      return t('validator.errors.syntax');
    }
    return null;
  };

  return (
    <Card
      variant="secondary"
      isBodyVisible={enabled}
      heading={
        <BooleanField
          title={title}
          value={enabled}
          onChange={(checked) => {
            if (checked) {
              store.setParamValue(clickParamName, 'enable', !writeDefault);
              store.setParamValue(writeParamName, 'enable', !!writeDefault);
            } else {
              store.setParamValue(clickParamName, 'enable', false);
              store.setParamValue(writeParamName, 'enable', false);
            }
          }}
        />
      }
    >
      <>
        <RadioGroup
          layout="horizontal"
          options={[
            { id: 'write-enable', label: t('edit-svg-dashboard.labels.write-enable'), value: 'write' },
            { id: 'click-enable', label:  t('edit-svg-dashboard.labels.click-enable'), value: 'click' },
          ]}
          value={store.params[writeParamName].enable ? 'write' : 'click'}
          onChange={(value) => {
            store.setParamValue(writeParamName, 'enable', value === 'write');
            store.setParamValue(clickParamName, 'enable', value === 'click');
          }}
        />

        {(store.params[writeParamName].enable && !store.params[clickParamName].enable) && (
          <BooleanField
            title={t('edit-svg-dashboard.labels.check')}
            value={store.params[writeParamName].check}
            onChange={(checked) => store.setParamValue(writeParamName, 'check', checked)}
          />
        )}
      </>

      {store.params[clickParamName].enable && (
        <OptionsField
          title={t('edit-svg-dashboard.labels.dashboard')}
          value={store.params[clickParamName].dashboard}
          placeholder={t('edit-svg-dashboard.labels.select-dashboard-placeholder')}
          options={dashboardOptions}
          error={!store.params[clickParamName].dashboard ? t('validator.errors.empty') : null}
          isClearable
          isSearchable
          onChange={(value: string) => store.setParamValue(clickParamName, 'dashboard', value)}
        />
      )}
      {store.params[writeParamName].enable && (
        <>
          <OptionsField
            title={t('edit-svg-dashboard.labels.channel')}
            placeholder={t('edit-svg-dashboard.labels.select-channel-placeholder')}
            value={store.params[writeParamName].channel}
            error={!store.params[writeParamName].channel ? t('validator.errors.empty') : null}
            options={devices}
            isSearchable
            onChange={(value: string) => store.setParamValue(writeParamName, 'channel', value)}
          />

          <div className="visualBindingsEditor-writeParams">
            <StringField
              title={t('edit-svg-dashboard.labels.on')}
              value={store.params[writeParamName].value.on}
              error={jsFunctionValidator(store.params[writeParamName].value.on)}
              onChange={(on: string) => {
                store.setParamValue(writeParamName, 'value', { ...store.params[writeParamName].value, on });
              }}
            />
            <StringField
              title={t('edit-svg-dashboard.labels.off')}
              value={store.params[writeParamName].value.off}
              error={jsFunctionValidator(store.params[writeParamName].value.off)}
              onChange={(off: string) => {
                store.setParamValue(writeParamName, 'value', { ...store.params[writeParamName].value, off });
              }}
            />
          </div>
        </>
      )}
    </Card>
  );
});

const ParamBindingForm = observer(({ store, paramName, devices }: ParamBindingFormProps) => {
  const { t } = useTranslation();

  return (
    <Card
      variant="secondary"
      isBodyVisible={store.params[paramName].enable}
      heading={
        <BooleanField
          title={paramName === 'read'
            ? t('edit-svg-dashboard.labels.read-enable')
            : t('edit-svg-dashboard.labels.style-enable')}
          value={store.params[paramName].enable}
          onChange={(checked) => store.setParamValue(paramName, 'enable', checked)}
        />
      }
    >
      <OptionsField
        title={t('edit-svg-dashboard.labels.channel')}
        value={store.params[paramName].channel}
        options={devices}
        error={!store.params[paramName].channel ? t('validator.errors.empty') : null}
        placeholder={t('edit-svg-dashboard.labels.select-channel-placeholder')}
        isSearchable
        onChange={(value: string) => store.setParamValue(paramName, 'channel', value)}
      />
      <StringField
        title={t('edit-svg-dashboard.labels.value')}
        description={paramName === 'read'
          ? t('edit-svg-dashboard.labels.read-value-desc')
          : t('edit-svg-dashboard.labels.style-value-desc')}
        value={store.params[paramName].value}
        error={!store.params[paramName].value ? t('validator.errors.empty') : null}
        view="textarea"
        onChange={(value: string) => store.setParamValue(paramName, 'value', value)}
      />
    </Card>
  );
});

export const VisualBindingsEditor = observer(({ store, dashboardsStore, devices }: VisualBindingsEditorProps) => {
  const { t } = useTranslation();

  return (
    <>
      <h6>
        {t('edit-svg-dashboard.labels.tag-name', { tag: t(store.elementCaption) })}
      </h6>
      <div className="visualBindingsEditor-container">
        {!!store.params.read && !!Object.keys(store.params.read).length && (
          <ParamBindingForm paramName="read" store={store} devices={devices} />
        )}
        {(store.params.click && store.params.write) && (
          <ClickBindingForm
            title={t('edit-svg-dashboard.labels.click')}
            store={store}
            dashboardsStore={dashboardsStore}
            devices={devices}
            clickParamName="click"
            writeParamName="write"
            writeDefault
          />
        )}
        {!!store.params.visible && !!Object.keys(store.params.visible).length && (
          <VisibleBindingForm store={store} devices={devices} />
        )}

        <ParamBindingForm paramName="style" store={store} devices={devices} />

        {(store.params['long-press'] && store.params['long-press-write']) && (
          <ClickBindingForm
            title={t('edit-svg-dashboard.labels.long-press')}
            store={store}
            dashboardsStore={dashboardsStore}
            devices={devices}
            clickParamName="long-press"
            writeParamName="long-press-write"
          />
        )}
      </div>
    </>
  );
});
