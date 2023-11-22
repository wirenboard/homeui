import React, { useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation, Trans } from 'react-i18next';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
} from '../components/modals/modals';
import {Checkbox} from "../common";

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

async function SubmitRequest(store) {
  store.onUploadStart();
  const form = new FormData();
  form.append('factory_reset', store.factoryReset);
  const requestOptions = {
    method: 'POST',
    body: form,
  };
  const response = await fetch(store.destination, requestOptions);
  if (response.status !== 200) {
    store.onUploadError({ uploadResponse: { data: response.text() } });
  } else {
    store.onUploadFinish();
  }
}

const UploadButton = ({ label, style, onClick }) => {
  const onClickInternal = () => {
    SubmitRequest();
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

const ResetEntrypoint = observer(({ factoryResetHandler, showModal, factoryReset }) => {
  const { t } = useTranslation();

  return (
    <div>
      <button type="button" className="btn btn-lg btn-success" onClick={showModal}>
        {t('system.buttons.select')}
      </button>
      <div style={{ margin: '10px' }}>
        <Checkbox id="id_factory_reset" label={t('system.update.factoryreset')} onChange={factoryResetHandler} value={factoryReset} />
      </div>
    </div>
  );
});

const ServiceUnavailable = () => {
  const { t } = useTranslation();

  return <span className="label label-warning">{t('system.errors.unavailable')}</span>;
};

const ResetProgress = observer(({ store }) => {
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

const ResetWidget = observer(({ store }) => {
  return (
    <>
      {store.inProgress ? (
        <ResetProgress store={store} />
      ) : (
        <ResetEntrypoint
          factoryResetHandler={e => {
            store.setFactoryReset(e.target.checked);
          }}
          showModal={() => {
            store.modalState.show();
          }}
          factoryReset={store.factoryReset}
        />
      )}
    </>
  );
});

const FactoryResetWidget = observer(({ store }) => {
  const { t } = useTranslation();

  // clear all timeouts in store when this widget unmounts
  useEffect(() => {
    return () => store.clearTimeouts();
  });

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
          {store.receivedFirstStatus ? <ResetWidget store={store} /> : <ServiceUnavailable />}
        </div>
      </div>
    </>
  );
});

const CreateFactoryResetWidget = ({ store }) => (
  <FactoryResetWidget store={store} />
);

export default CreateFactoryResetWidget;
