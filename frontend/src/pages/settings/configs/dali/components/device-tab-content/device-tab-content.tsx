import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { MOBILE_MAX_WIDTH } from '@/common/breakpoints';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { FormButtonGroup } from '@/components/form';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import { Loader } from '@/components/loader';
import { Tooltip } from '@/components/tooltip';
import type { DeviceStore } from '@/stores/dali';
import { useAsyncAction } from '@/utils/async-action';
import { DeviceControlsDesktop, DeviceControlsMobile, GearErrorStatus } from '../device-controls';
import { ResetConfirm } from './reset-confirm';
import type { InstanceConfig, ResetMode } from './types';
import './styles.css';

// Events sent under any other scheme carry no sender address (IEC 62386-103
// Table 8), so the daemon cannot tell whose controls to update.
export const ATTRIBUTABLE_EVENT_SCHEME = 2;

export const wrongSchemeInstances = (config: object | undefined): string[] =>
  Object.entries(config ?? {})
    .filter(([key, value]) => /^instance\d+$/.test(key)
      && typeof (value as InstanceConfig)?.event_scheme === 'number'
      && (value as InstanceConfig).event_scheme !== ATTRIBUTABLE_EVENT_SCHEME)
    .map(([key]) => key);

export const DeviceTabContent = observer(({ store }: { store: DeviceStore }) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: MOBILE_MAX_WIDTH });
  const [identify, isIdentifying] = useAsyncAction(async () => {
    await store.identify();
  });

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const [fixEventSchemes, isFixingSchemes] = useAsyncAction(async () => {
    const config = JSON.parse(JSON.stringify(store.objectStore.value));
    for (const key of wrongSchemeInstances(config)) {
      config[key].event_scheme = ATTRIBUTABLE_EVENT_SCHEME;
    }
    store.objectStore.setValue(config);
    await store.save();
  });

  const [runReset, isResetting] = useAsyncAction(async (mode: ResetMode) => {
    if (mode === 'settings') {
      await store.resetSettings();
      setIsResetDialogOpen(false);
    } else {
      await store.reset();
      setIsResetDialogOpen(false);
    }
  });

  const isBusy = store.isLoading || isIdentifying || isResetting;

  const identifyButton = (
    <Tooltip text={t('dali.labels.identify-tooltip')}>
      <Button
        label={t('dali.buttons.identify')}
        isLoading={isIdentifying}
        disabled={isBusy}
        onClick={identify}
      />
    </Tooltip>
  );
  const resetButton = (
    <Button
      label={t('dali.buttons.reset')}
      variant="danger"
      disabled={isBusy}
      onClick={() => setIsResetDialogOpen(true)}
    />
  );
  const saveButton = (
    <Button
      label={t('common.buttons.save')}
      disabled={isBusy || !store.objectStore?.isDirty || store.objectStore.hasErrors}
      onClick={() => store.save()}
    />
  );

  const toolbarHeading = (
    <div className="dali-tabToolbar-heading">
      <h2 className="dali-contentTitle">
        {store.label}
        {store.parent && (
          <span className="dali-contentTitleContext">{t('dali.labels.bus', { num: store.parent.index })}</span>
        )}
      </h2>
      <GearErrorStatus mqttId={store.mqttId} />
    </div>
  );

  const settingsForm = (
    <>
      {!store.isLoading && wrongSchemeInstances(store.objectStore?.value).length > 0 && (
        <Alert variant="warn">
          <div className="dali-schemeWarning">
            <span>{t('dali.labels.event-scheme-warning')}</span>
            <Button
              label={t('dali.buttons.fix-event-schemes')}
              variant="warn"
              isLoading={isFixingSchemes}
              onClick={fixEventSchemes}
            />
          </div>
        </Alert>
      )}
      {store.isLoading ? (
        <div className="dali-contentLoader">
          <Loader />
        </div>
      ) : store.objectStore && (
        <JsonSchemaEditor
          store={store.objectStore}
          translator={store.translator}
        />
      )}
    </>
  );

  const resetConfirm = (
    <ResetConfirm
      isOpened={isResetDialogOpen}
      isLoading={isResetting}
      isDirty={!!store.objectStore?.isDirty}
      closeCallback={() => setIsResetDialogOpen(false)}
      onConfirm={runReset}
    />
  );

  if (isMobile) {
    return (
      <>
        <div className="dali-tabToolbar">
          {toolbarHeading}
          <div className="dali-tabToolbar-actions">
            <FormButtonGroup>
              {identifyButton}
              <Button label={t('dali.buttons.reload-settings')} disabled={isBusy} onClick={() => store.load(true)} />
              {resetButton}
              {saveButton}
            </FormButtonGroup>
          </div>
        </div>
        <div className="dali-tabBody">{settingsForm}</div>
        <DeviceControlsMobile mqttId={store.mqttId} isDisabled={store.isLoading} />
        {resetConfirm}
      </>
    );
  }

  return (
    <>
      <div className="dali-tabToolbar">
        {toolbarHeading}
        <div className="dali-tabToolbar-actions">
          <FormButtonGroup>
            {identifyButton}
            {resetButton}
          </FormButtonGroup>
        </div>
      </div>
      <DeviceControlsDesktop mqttId={store.mqttId} isDisabled={store.isLoading}>
        <div className="dali-settingsHeader">
          <h3 className="dali-settingsTitle">{t('dali.labels.device-settings')}</h3>
          <FormButtonGroup>
            <Button label={t('dali.buttons.reload')} disabled={isBusy} onClick={() => store.load(true)} />
            {saveButton}
          </FormButtonGroup>
        </div>
        {settingsForm}
      </DeviceControlsDesktop>
      {resetConfirm}
    </>
  );
});
