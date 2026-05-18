import Uploady, {
  useRequestPreSend,
  useItemStartListener,
  useItemFinishListener,
  useItemProgressListener,
  useItemErrorListener,
} from '@rpldy/uploady';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { Progress } from '@/components/progress';
import { DownloadBackupModal } from './components/download-backup-modal';
import { FactoryResetModal } from './components/factory-reset-modal';
import {
  ModalMode,
  type FirmwareUpdateProps,
  type FirmwareUpdateWidgetProps,
  type UploadProgressProps,
  type UploadWidgetProps,
} from './types';
import './styles.css';

const UploadProgress = observer(({ store }: UploadProgressProps) => {
  const { t } = useTranslation();

  const alertVariant = store.error || store.stateType === 'danger' ? 'danger' : 'success';

  return !store.isDone ? (
    <Progress value={store.progressPercents} caption={t(store.stateMsg)} />
  ) : (
    <Alert
      className="firmwareUpdate-doneAlert"
      size="small"
      variant={alertVariant}
      onClose={store.onDoneClick}
    >
      {t(store.stateMsg)}
    </Alert>
  );
});

const UploadWidget = observer(({ store, mode, onSetMode }: UploadWidgetProps) => {
  const { t } = useTranslation();

  if (store.inProgress && store.activeMode === mode) {
    return <UploadProgress store={store} />;
  }

  if (mode === 'reset') {
    return (
      <div>
        <ul>
          <li>{t('system.factory_reset.warning1')}</li>
          {store.factoryResetFitsState.canDoFactoryReset && (<li>{t('system.factory_reset.warning2')}</li>)}
        </ul>

        <div className="firmwareUpdate-actions">
          <Button
            type="button"
            variant="danger"
            aria-haspopup="dialog"
            aria-label={t('system.buttons.select_and_reset')}
            label={t('system.buttons.select')}
            onClick={() => {
              onSetMode(ModalMode.UpdateReset);
            }}
          />
          {store.factoryResetFitsState.canDoFactoryReset && (
            <Button
              type="button"
              variant="danger"
              aria-haspopup="dialog"
              label={t('system.buttons.reset')}
              onClick={() => {
                onSetMode(ModalMode.FactoryReset);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <ul>
          <li>
            <a href="https://fw-releases.wirenboard.com/?prefix=fit_image" target="_blank">
              {t('system.update.help')}
            </a>
          </li>
        </ul>
      </div>
      <Button
        type="button"
        label={t('system.buttons.select')}
        onClick={() => {
          onSetMode(ModalMode.Update);
        }}
      />

      {!store.isRootfsExpanded && (
        <Checkbox
          className="firmwareUpdate-rootfsCheckbox"
          title={t('system.update.expandrootfs')}
          checked={store.expandRootfs}
          onChange={(val) => store.setExpandRootfs(val)}
        />
      )}
    </div>
  );
});

const FirmwareUpdateWidget = observer(({ store, mode, className }: FirmwareUpdateWidgetProps) => {
  const { t } = useTranslation();
  const [ modalMode, setModalMode ] = useState(null);

  // clear all timeouts in store when this widget unmounts
  useEffect(() => {
    return () => store.clearTimeouts();
  });

  useItemStartListener(() => {
    store.activeMode = mode;
    store.onUploadStart();
  });
  useItemProgressListener(store.onUploadProgress);
  useItemFinishListener(store.onUploadFinish);
  useItemErrorListener(store.onUploadError);

  useRequestPreSend(() => {
    const params: any = {};
    // filled by WB Cloud in auth tunnel's auth.js
    if (Object.hasOwn(window, 'wbCloudProxyInfo')) {
      params.from_cloud = true;
    }
    if (mode === 'reset') {
      params.factory_reset = true;
    } else {
      params.expand_rootfs = store.isRootfsExpanded ? false : store.expandRootfs;
    }
    return {
      options: { params }, // will be merged with the rest of the options
    };
  });

  if (mode === 'reset') {
    return (
      <>
        <Card heading={t('system.factory_reset.title')} className={className} variant="secondary">
          {store.receivedFirstStatus
            ? (
              <UploadWidget mode={mode} store={store} onSetMode={(m) => setModalMode(m)} />
            ) : (
              <Alert variant="warn" size="small">{t('system.errors.unavailable')}</Alert>
            )}
        </Card>

        {!!modalMode && (
          <FactoryResetModal
            isOpened={!!modalMode}
            mode={modalMode}
            store={store}
            onCancel={() => setModalMode(null)}
          />
        )}

      </>
    );
  }

  return (
    <>
      <Card heading={t('system.update.title')} className={className} variant="secondary">
        {store.receivedFirstStatus
          ? (
            <UploadWidget mode={mode} store={store} onSetMode={(m) => setModalMode(m)} />
          ) : (
            <Alert variant="warn" size="small">{t('system.errors.unavailable')}</Alert>
          )}
      </Card>
      {!!modalMode && (
        <DownloadBackupModal
          isOpened={!!modalMode}
          onCancel={() => setModalMode(null)}
        />)}
    </>
  );
});

export const FirmwareUpdate = ({ store, mode, className }: FirmwareUpdateProps) => (
  <Uploady
    accept=".fit"
    multiple={false}
    method="POST"
    destination={{ url: '/fwupdate/upload' }}
    autoUpload
  >
    <FirmwareUpdateWidget store={store} mode={mode} className={className} />
  </Uploady>
);
