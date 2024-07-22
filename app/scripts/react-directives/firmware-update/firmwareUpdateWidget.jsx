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
import { Checkbox } from '../common';
import { MODAL_MODE_UPDATE, MODAL_MODE_UPDATE_RESET, MODAL_MODE_FACTORY_RESET } from './modal';

async function SubmitRequest(store) {
  store.onUploadStart();
  const form = new FormData();
  form.append('factory_reset', 'true');
  const requestOptions = {
    method: 'POST',
    body: form,
  };
  try {
    const response = await fetch(store.resetDestination, requestOptions);
    if (response.status !== 200) {
      const text = await response.text();
      store.onUploadError({ uploadResponse: { data: text } });
    } else {
      store.onUploadFinish();
    }
  } catch (e) {
    store.onUploadError({ uploadResponse: { data: e.message } });
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

const UploadButton = ({ label, style, onClick, disabled }) => {
  const uploady = useUploady();
  const onClickInternal = () => {
    uploady.showFileUpload();
    onClick?.();
  };
  const { t } = useTranslation();

  return (
    <button
      type="file"
      disabled={disabled}
      className={'btn btn-' + style}
      onClick={onClickInternal}
    >
      {t(label)}
    </button>
  );
};

const BackupDownloadModalPage = () => {
  return <Trans i18nKey="system.update.backup_first_page" />;
};

const BackupDownloadButtons = ({ onDownloadClick, hide }) => {
  const { t } = useTranslation();

  return (
    <>
      <button type="button" className="btn btn-success" onClick={onDownloadClick}>
        {t('system.buttons.download_backup')}
      </button>
      <UploadButton label="system.buttons.select_anyway" style="default" onClick={hide} />
    </>
  );
};

const AfterDownloadModalPage = () => <Trans i18nKey="system.update.backup_second_page" />;

const AfterDownloadModalButtons = ({ hide }) => (
  <UploadButton label="system.buttons.select" style="success" onClick={hide} />
);

const DownloadBackupModal = ({ id, active, isFirstPage, onCancel, onDownloadClick }) => {
  const { t } = useTranslation();

  return (
    <Modal id={id} active={active} onCancel={onCancel}>
      <ModalHeader>
        <ModalTitle id={id} text={t('system.update.backup_modal_title')}></ModalTitle>
      </ModalHeader>
      <ModalBody>
        {isFirstPage ? <BackupDownloadModalPage /> : <AfterDownloadModalPage />}
      </ModalBody>
      <ModalFooter>
        {isFirstPage ? (
          <BackupDownloadButtons onDownloadClick={onDownloadClick} hide={onCancel} />
        ) : (
          <AfterDownloadModalButtons hide={onCancel} />
        )}
      </ModalFooter>
    </Modal>
  );
};

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
        <Checkbox
          label={t('system.update.expandrootfs')}
          onChange={expandRootFsHandler}
          value={expandRootFs}
        />
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
      {store.logRows.length > 0 && <FirmwareUpdateLog logRows={store.logRows} />}
      {store.isDone && <DoneButton onDoneClick={store.onDoneClick} doneLabel={store.doneLabel} />}
    </>
  );
});

const UploadWidget = observer(({ store }) => {
  const { t } = useTranslation();

  if (store.inProgress) {
    return <UploadProgress store={store} />;
  }
  if (store.resetMode) {
    return (
      <ResetEntrypoint
        onUploadClick={() => {
          store.modalState.show(MODAL_MODE_UPDATE_RESET);
        }}
        onResetClick={() => {
          store.modalState.show(MODAL_MODE_FACTORY_RESET);
        }}
        canFactoryReset={store.factoryResetFitsState.canDoFactoryReset}
      />
    );
  }
  return (
    <UpdateEntrypoint
      expandRootFsHandler={e => {
        store.setExpandRootfs(e.target.checked);
      }}
      showModal={() => {
        store.modalState.show(MODAL_MODE_UPDATE);
      }}
      expandRootFs={store.expandRootfs}
    />
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
    const params = {};
    if (window.hasOwnProperty('wbCloudProxyInfo')) {  // filled by WB Cloud in auth tunnel's auth.js
      params.from_cloud = true;
    }
    if (store.resetMode) {
      params.factory_reset = true;
    } else {
      params.expand_rootfs = store.expandRootFs;
    }
    return {
      options: { params }, // will be merged with the rest of the options
    };
  });

  if (store.resetMode) {
    return (
      <>
        <FactoryResetModal state={store.modalState} store={store} />
        <div className="panel panel-default">
          <div className="panel-heading">
            <h3 className="panel-title">
              <i className="glyphicon glyphicon-repeat"></i> {t('system.factory_reset.title')}
            </h3>
          </div>
          <div className="panel-body">
            {store.receivedFirstStatus ? <UploadWidget store={store} /> : <ServiceUnavailable />}
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <DownloadBackupModal {...store.modalState} />
      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">
            <i className="glyphicon glyphicon-upload"></i> {t('system.update.title')}
          </h3>
        </div>
        <div className="panel-body">
          {store.receivedFirstStatus ? <UploadWidget store={store} /> : <ServiceUnavailable />}
        </div>
      </div>
    </>
  );
});

const ResetConfirmation = ({ mode, onChange, value }) => {
  if (mode !== MODAL_MODE_UPDATE_RESET && mode !== MODAL_MODE_FACTORY_RESET) {
    return null;
  }

  return (
    <div>
      <Trans i18nKey="system.factory_reset.modal_page" />
      <div>
        <hr />
        <Trans i18nKey="system.factory_reset.confirm_prompt" />
        &nbsp;
        <input onChange={onChange} type="text" value={value} />
      </div>
    </div>
  );
};

const FactoryResetModal = observer(({ state, store }) => {
  const { t } = useTranslation();

  return (
    <Modal id={state.id} active={state.active} onCancel={state.onCancel}>
      <ModalHeader>
        <ModalTitle id={state.id} text={t('system.factory_reset.modal_title')}></ModalTitle>
      </ModalHeader>
      <ModalBody>
        <ResetConfirmation
          mode={state.mode}
          onChange={e => {
            state.onConfirmationTextChange(e);
          }}
          value={state.enteredConfirmationText}
        />
      </ModalBody>
      <ModalFooter>
        {state.mode === MODAL_MODE_UPDATE_RESET ? (
          <UploadButton
            disabled={!state.enableButtons}
            label={t('system.buttons.select_and_reset')}
            style="danger"
            onClick={state.onCancel}
          />
        ) : state.mode === MODAL_MODE_FACTORY_RESET ? (
          <ResetButton
            store={store}
            label={t('system.buttons.reset')}
            style="danger"
            onClick={state.onCancel}
          />
        ) : null}
      </ModalFooter>
    </Modal>
  );
});

const ResetEntrypoint = observer(({ onUploadClick, onResetClick, canFactoryReset }) => {
  const { t } = useTranslation();

  return (
    <div>
      <div>
        <ul className="notes">
          <li>{t('system.factory_reset.warning1')}</li>
          {canFactoryReset && <li>{t('system.factory_reset.warning2')}</li>}
        </ul>
      </div>
      <button type="button" className="btn btn-lg btn-danger" onClick={onUploadClick}>
        {t('system.buttons.select')}
      </button>
      &nbsp;
      {canFactoryReset && (
        <button type="button" className="btn btn-lg btn-danger" onClick={onResetClick}>
          {t('system.buttons.reset')}
        </button>
      )}
    </div>
  );
});

const ResetButton = ({ label, style, onClick, store }) => {
  const onClickInternal = () => {
    SubmitRequest(store);
    onClick?.();
  };
  const { t } = useTranslation();

  return (
    <button
      type="file"
      disabled={!store.modalState.enableButtons}
      className={'btn btn-' + style}
      onClick={onClickInternal}
    >
      {t(label)}
    </button>
  );
};

const CreateFirmwareUpdateWidget = ({ store }) => (
  <Uploady
    autoUpload
    accept={store.accept}
    multiple={false}
    method="POST"
    destination={{ url: store.uploadDestination }}
  >
    <FirmwareUpdateWidget store={store} />
  </Uploady>
);

export default CreateFirmwareUpdateWidget;
