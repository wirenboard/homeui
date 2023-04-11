import React, { useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation, Trans } from 'react-i18next';
import Uploady, { useUploady, useItemStartListener, useItemFinishListener, useItemProgressListener, useItemErrorListener } from "@rpldy/uploady";
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from '../modals';


const DoneButton = ({store}) => {
  const { t } = useTranslation();

  return <button
        className="btn btn-lg btn-default"
        onClick={store.onDoneClick}
    >
      {t(store.doneLabel)}
    </button>
};

const FirmwareUpdateLog = ({store}) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  });

  return <>
    <pre
        id="firmwareLog"
        className="well well-sm pre-scrollable"
    >
      {store.logRows.join("\n")}

      <div ref={bottomRef} />
    </pre>
  </>;
};

const UploadButton = ({label, style, onClick}) => {
  const uploady = useUploady();
  const onClickInternal = () => {
    uploady.showFileUpload();
    if (onClick) onClick();
  }
  const { t } = useTranslation();

  return <button
      type="file"
      className={ "btn btn-" + style }
      onClick={onClickInternal}
  >
      {t(label)}
  </button>
};

const BackupDownloadModalPage = () => {
  // Trans formatting technique is taken from here:
  // https://github.com/i18next/react-i18next/issues/928#issuecomment-896653165
  return (
    <Trans i18nKey="system.update.backup_first_page">
      <p><b /></p>
      <p><b /></p>
      <p></p>
    </Trans>
  )
};

const BackupDownloadButtons = ({onDownloadClick, hide}) => {
  const { t } = useTranslation();

  return <>
    <button type="button" className="btn btn-success" onClick={onDownloadClick}>
      {t("system.buttons.download_backup")}
    </button>
    <UploadButton label="system.buttons.select_anyway" style="default" onClick={hide}/>
  </>;
}

const AfterDownloadModalPage = () => (
  <Trans i18nKey="system.update.backup_second_page">
    <p><b /><b /></p>
  </Trans>
)

const AfterDownloadModalButtons = ({hide}) => (
  <UploadButton label="system.buttons.select" style="success" onClick={hide} />
);

const DownloadBackupModal = ({ id, active, isFirstPage, onCancel, onDownloadClick }) => {
  const { t } = useTranslation();

  return (
    <Modal id={id} active={active} onCancel={onCancel}>
      <ModalHeader>
        <ModalTitle id={id} text={ t('system.update.backup_modal_title') }></ModalTitle>
      </ModalHeader>
      <ModalBody>
        { isFirstPage ? <BackupDownloadModalPage /> : <AfterDownloadModalPage /> }
      </ModalBody>
      <ModalFooter>
        { isFirstPage ? <BackupDownloadButtons onDownloadClick={onDownloadClick} hide={onCancel} /> : <AfterDownloadModalButtons hide={onCancel} /> }
      </ModalFooter>
    </Modal>
  );
};

const UploadEntrypoint  = observer(({store}) => {
  const { t } = useTranslation();

  const onPageButtonClick = () => {
    store.modalState.show();
  };

  return <div>
    <button type="button" className="btn btn-lg btn-success" onClick={onPageButtonClick}>
      {t('system.buttons.select')}
    </button>
    <span style={{margin: "auto 10px"}}>
      <a href="http://fw-releases.wirenboard.com/?prefix=fit_image">
        {t('system.update.help')}
      </a>
    </span>
  </div>
});

const ServiceUnavailable = () => {
  const { t } = useTranslation();

  return <span className="label label-warning">
      {t('system.errors.unavailable')}
  </span>;
};

const UploadProgress = observer(({store}) => {
  const { t } = useTranslation();
  return <>
    <div className="progress">
        <div
            className={"progress-bar progress-bar-"+store.stateType}
            style={{width: store.progressPercents.toString() + "%"}}
        >
            <span>{t(store.stateMsg)}</span>
        </div>
    </div>
    { store.logRows.length > 0 ? <FirmwareUpdateLog store={store} /> : null }
    { store.isDone ? <DoneButton store={store} /> : null }
  </>
});

const UploadWidget = observer(({store}) => {
  return <>
    { store.inProgress ? <UploadProgress store={store} /> : <UploadEntrypoint store={store} />}
  </>;
});

const FirmwareUpdateWidget = observer(({store}) => {
  const { t } = useTranslation();

  // clear all timeouts in store when this widget unmounts
  useEffect(() => {
    return () => store.clearTimeouts();
  });

  useItemStartListener(store.onUploadStart);
  useItemProgressListener(store.onUploadProgress);
  useItemFinishListener(store.onUploadFinish);
  useItemErrorListener(store.onUploadError);

  return <>
    <DownloadBackupModal {...store.modalState} />
    <div className="panel panel-default">
      <div className="panel-heading">
          <h3 className="panel-title">
              <i className="glyphicon glyphicon-upload"></i> {t('system.update.title')}
          </h3>
      </div>
      <div className="panel-body">
          { store.receivedFirstStatus ? <UploadWidget store={store}/> : <ServiceUnavailable /> }
      </div>
  </div>
  </>
});

const CreateFirmwareUpdateWidget = ({store}) => (
  <Uploady
    autoUpload
    accept={store.accept}
    multiple={false}
    method="POST"
    destination={{url: store.destination}}>
    <FirmwareUpdateWidget store={store} />
  </Uploady>
)

export default CreateFirmwareUpdateWidget;
