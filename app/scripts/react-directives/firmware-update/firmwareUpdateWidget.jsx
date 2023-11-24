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
import {Checkbox} from "../common";

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

const ResetEntrypoint = observer(({ onUploadClick, onResetClick }) => {
  const { t } = useTranslation();

  return (
    <div>
      <div>
        <ul className="notes">
          <li>
            <li>{t('system.factoryreset.warning1')}</li>
            <li>{t('system.factoryreset.warning2')}</li>
          </li>
        </ul>
      </div>
      <button type="button" className="btn btn-lg btn-danger" onClick={onUploadClick}>
        {t('system.buttons.select')}
      </button>
      &nbsp;
      <button type="button" className="btn btn-lg btn-danger" onClick={onResetClick}>
        {t('system.factoryreset.button')}
      </button>
    </div>
  );
});

const UploadEntrypoint = observer(({ expandRootFsHandler, showModal, expandRootFs }) => {
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
                  store.modalState.show();
                }}
                onResetClick={() => {
                  store.modalState.show();
                }}
              />
            </div>
          ) : (
            <UploadEntrypoint
              expandRootFsHandler={e => {
                store.setExpandRootfs(e.target.checked);
              }}
              showModal={() => {
                store.modalState.show();
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
      <DownloadBackupModal {...store.modalState} />
      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">
            {store.reset_mode ? (
              <span>
                <i className="glyphicon glyphicon-repeat"></i> {t('system.factoryreset.title')}
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
