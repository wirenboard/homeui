import React, { useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation, Trans } from 'react-i18next';
import Uploady, {
  useRequestPreSend,
  useUploady,
  useItemStartListener,
  useItemFinishListener,
  useItemProgressListener,
  useItemErrorListener,
} from '@rpldy/uploady';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
} from '../components/modals/modals';
import {Checkbox} from '../common';
import {MODAL_MODE_UPDATE, MODAL_MODE_UPDATE_RESET, MODAL_MODE_FACTORY_RESET} from './modal';

async function SubmitRequest(store) {
  store.onUploadStart();
  const form = new FormData();
  form.append('factory_reset', 'true');
  const requestOptions = {
    method: 'POST',
    body: form,
  };
  const response = await fetch(store.reset_destination, requestOptions);
  if (response.status !== 200) {
    const text = await response.text();
    store.onUploadError({ uploadResponse: { data: text } });
  } else {
    store.onUploadFinish();
  }
}

const DoneButton = ({ onDoneClick, doneLabel }) => {
  const { t } = useTranslation();

  return (
    <button className="btn btn-lg btn-default" onClick={onDoneClick}>
      {t(doneLabel)}
    </button>
  );
};

const FirmwareUpdateLog = ({ logRows }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  });

  return (
    <>
      <pre id="firmwareLog" className="well well-sm pre-scrollable">
        {logRows.join('\n')}

        <div ref={bottomRef} />
      </pre>
    </>
  );
};

const ResetButton = ({ label, style, onClick, store }) => {
  const onClickInternal = () => {
    SubmitRequest(store);
    if (onClick) onClick();
  };
  const { t } = useTranslation();

  return (
    <button type="file" className={'btn btn-' + style} onClick={onClickInternal}>
      {t(label)}
    </button>
  );
};

const UploadButton = ({ label, style, onClick }) => {
  const uploady = useUploady();
  const onClickInternal = () => {
    uploady.showFileUpload();
    if (onClick) onClick();
  };
  const { t } = useTranslation();

  return (
    <button type="file" className={'btn btn-' + style} onClick={onClickInternal}>
      {t(label)}
    </button>
  );
};

const BackupDownloadModalPage = ({ mode }) => {
  return (
    <>
      {mode === MODAL_MODE_UPDATE ? (
        <Trans i18nKey="system.update.backup_first_page" />
      ) : mode === MODAL_MODE_UPDATE_RESET ? (
        <Trans />
      ) : mode === MODAL_MODE_FACTORY_RESET ? (
        <Trans />
      ) : (
        <span>(unknown mode {mode})</span>
      )}
    </>
  );
};

const BackupDownloadButtons = ({ store }) => {
  const { t } = useTranslation();

  return (
    <>
      <button disabled={!store.enableButtons} type="button" className="btn btn-success" onClick={store.onDownloadClick}>
        {t('system.buttons.download_backup')}
      </button>
      {store.mode === MODAL_MODE_UPDATE ? (
        <UploadButton disabled={!store.enableButtons} label="system.buttons.select_anyway" style="default" onClick={store.hide} />
      ) : store.mode === MODAL_MODE_UPDATE_RESET ? (
        <UploadButton disabled={!store.enableButtons} label="system.buttons.select_anyway" style="default" onClick={store.hide} />
      ) : store.mode === MODAL_MODE_FACTORY_RESET ? (
        <ResetButton disabled={!store.enableButtons} label="system.buttons.select_anyway" style="default" onClick={store.hide} />
      ) : (
        <span>(unknown mode {store.mode})</span>
      )}
    </>
  );
};

const AfterDownloadModalPage = () => <Trans i18nKey="system.update.backup_second_page" />;

const AfterDownloadModalButtons = ({ store }) => (
  <>
    {store.mode === MODAL_MODE_UPDATE ? (
      <UploadButton disabled={!store.enableButtons} label="system.buttons.select" style="success" onClick={store.hide} />
    ) : store.mode === MODAL_MODE_UPDATE_RESET ? (
      <UploadButton disabled={!store.enableButtons} label="system.buttons.select" style="success" onClick={store.hide} />
    ) : store.mode === MODAL_MODE_FACTORY_RESET ? (
      <ResetButton disabled={!store.enableButtons} label="system.buttons.reset" style="danger" onClick={store.hide} />
    ) : (
      <span>(unknown mode {store.mode})</span>
    )}
  </>
);

const ResetConfirmation = ({ mode, onChange }) => {
  return (
    <>
      {mode === MODAL_MODE_UPDATE_RESET || mode === MODAL_MODE_FACTORY_RESET ? (
        <div>
          <Trans i18nKey="system.factory_reset.backup_first_page" />
          <input onChange={onChange} type="text" />
        </div>
      ) : null}
    </>
  );
};

const DownloadBackupModal = ({ store }) => {
  const { t } = useTranslation();

  return (
    <Modal id={store.id} active={store.active} onCancel={store.onCancel}>
      <ModalHeader>
        <div>{store.mode}</div>
        <ModalTitle id={store.id} text={t('system.update.backup_modal_title')}></ModalTitle>
      </ModalHeader>
      <ModalBody>
        {store.isFirstPage ? <BackupDownloadModalPage mode={store.mode} /> : <AfterDownloadModalPage />}
        <ResetConfirmation mode={store.mode} onChange={store.onConfirmationTextChange} />
      </ModalBody>
      <ModalFooter>
        {store.isFirstPage ? (
          <BackupDownloadButtons store={store} />
        ) : (
          <AfterDownloadModalButtons store={store} />
        )}
      </ModalFooter>
    </Modal>
  );
};

const ResetEntrypoint = observer(({ onUploadClick, onResetClick }) => {
  const { t } = useTranslation();

  return (
    <div>
      <div>
        <ul className="notes">
          <li>
            <li>{t('system.factory_reset.warning1')}</li>
            <li>{t('system.factory_reset.warning2')}</li>
          </li>
        </ul>
      </div>
      <button type="button" className="btn btn-lg btn-danger" onClick={onUploadClick}>
        {t('system.buttons.select')}
      </button>
      &nbsp;
      <button type="button" className="btn btn-lg btn-danger" onClick={onResetClick}>
        {t('system.buttons.reset')}
      </button>
    </div>
  );
});

const UpdateEntrypoint = observer(({ expandRootFsHandler, showModal, expandRootFs }) => {
  const { t } = useTranslation();

  return (
    <div>
      <div>
        <ul className="notes">
          <li>
            <a href="http://fw-releases.wirenboard.com/?prefix=fit_image">
              {t('system.update.help')}
            </a>
          </li>
        </ul>
      </div>
      <button type="button" className="btn btn-lg btn-success" onClick={showModal}>
        {t('system.buttons.select')}
      </button>
      <div style={{ margin: '10px' }}>
        <Checkbox id="id_fu_expand_rootfs" label={t('system.update.expandrootfs')} onChange={expandRootFsHandler} value={expandRootFs} />
      </div>
    </div>
  );
});

const ServiceUnavailable = () => {
  const { t } = useTranslation();

  return <span className="label label-warning">{t('system.errors.unavailable')}</span>;
};

const UploadProgress = observer(({ store }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="progress">
        <div
          className={'progress-bar progress-bar-' + store.stateType}
          style={{ width: store.progressPercents.toString() + '%' }}
        >
          <span>{t(store.stateMsg)}</span>
        </div>
      </div>
      {store.logRows.length > 0 ? <FirmwareUpdateLog logRows={store.logRows} /> : null}
      {store.isDone ? (
        <DoneButton onDoneClick={store.onDoneClick} doneLabel={store.doneLabel} />
      ) : null}
    </>
  );
});

const UploadWidget = observer(({ store }) => {
  return (
    <>
      {store.inProgress ? (
        <UploadProgress store={store} />
      ) : (
        <>
          {store.reset_mode ? (
            <div>
              <ResetEntrypoint
                onUploadClick={() => {
                  store.modalState.show(MODAL_MODE_UPDATE_RESET);
                }}
                onResetClick={() => {
                  store.modalState.show(MODAL_MODE_FACTORY_RESET);
                }}
              />
            </div>
          ) : (
            <UpdateEntrypoint
              expandRootFsHandler={e => {
                store.setExpandRootfs(e.target.checked);
              }}
              showModal={() => {
                store.modalState.show(MODAL_MODE_UPDATE);
              }}
              expandRootFs={store.expandRootfs}
            />
          )}
        </>

      )}
    </>
  );
});

const FirmwareUpdateWidget = observer(({ store }) => {
  const { t } = useTranslation();

  // clear all timeouts in store when this widget unmounts
  useEffect(() => {
    return () => store.clearTimeouts();
  });

  useItemStartListener(store.onUploadStart);
  useItemProgressListener(store.onUploadProgress);
  useItemFinishListener(store.onUploadFinish);
  useItemErrorListener(store.onUploadError);

  useRequestPreSend(({ items, options }) => {
    if (store.reset_mode) {
      return {
        options: { factory_reset: true }, // will be merged with the rest of the options
      };
    }
    return {
      options: { expand_rootfs: store.expandRootfs }, // will be merged with the rest of the options
    };
  });

  return (
    <>
      <DownloadBackupModal store={store} />
      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">
            {store.reset_mode ? (
              <span>
                <i className="glyphicon glyphicon-repeat"></i> {t('system.factory_reset.title')}
              </span>
            ) : (
              <span>
                <i className="glyphicon glyphicon-upload"></i> {t('system.update.title')}
              </span>
            )}
          </h3>
        </div>
        <div className="panel-body">
          {store.receivedFirstStatus ? <UploadWidget store={store} /> : <ServiceUnavailable />}
        </div>
      </div>
    </>
  );
});

const CreateFirmwareUpdateWidget = ({ store }) => (
  <Uploady
    autoUpload
    accept={store.accept}
    multiple={false}
    method="POST"
    destination={{ url: store.upload_destination }}
  >
    <FirmwareUpdateWidget store={store} />
  </Uploady>
);

export default CreateFirmwareUpdateWidget;
