import React, { useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import Uploady, { useUploady, useItemStartListener, useItemFinishListener, useItemProgressListener, useItemErrorListener } from "@rpldy/uploady";
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from '../common';

const download = async (url) => {
    const link = document.createElement('a')

    link.setAttribute('href', url)
    link.setAttribute('download', true)
    link.style.display = 'none'

    document.body.appendChild(link)

    link.click()

    document.body.removeChild(link)
}

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

const UploadEntrypoint  = observer(({store}) => {
  const { t } = useTranslation();

  const closeModal = () => {
    store.modalState.hide();
  }

  const buttonsFinal = <>
    <UploadButton label="system.buttons.select" style="success" onClick={closeModal} />
  </>;

  const onDownloadBackupClick = () => {
    download("/fwupdate/download/rootfs");
    store.modalState.show({buttons: buttonsFinal, title: t("system.update.backup_modal_title"), text: t("system.update.backup_second_page")});
  };

  const buttonsInitial = <>
    <button type="button" className="btn btn-success" onClick={onDownloadBackupClick}>
      {t("system.buttons.download_backup")}
    </button>
    <UploadButton label="system.buttons.select_anyway" style="default" onClick={closeModal}/>
  </>;


  const onPageButtonClick = () => {
    store.modalState.show({buttons: buttonsInitial, title: t("system.update.backup_modal_title"), text: t("system.update.backup_first_page")});
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

const DownloadBackupModal = ({ id, active, text, title, buttons, onCancel }) => {
  return (
    <Modal id={id} active={active} onCancel={onCancel}>
      <ModalHeader>
        <ModalTitle id={id} text={title}></ModalTitle>
      </ModalHeader>
      <ModalBody>
        {text}
      </ModalBody>
      <ModalFooter>
        {buttons}
      </ModalFooter>
    </Modal>
  );
};

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
    accept=".fit"
    multiple={false}
    method="POST"
    destination={{url: "/fwupdate/upload"}}>
    <FirmwareUpdateWidget store={store} />
  </Uploady>
)

export default CreateFirmwareUpdateWidget;
