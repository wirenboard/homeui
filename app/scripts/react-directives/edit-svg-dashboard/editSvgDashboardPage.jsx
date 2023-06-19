import React from 'react';
import { Spinner, BootstrapRow, ErrorBar } from '../common';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Button } from '../common';
import SvgView from './svgView';
import { MakeFormFields } from '../forms/forms';
import JsonBindingsEditor from './jsonBindingsEditor';
import VisualBindingsEditor from './visualBindingsEditor';
import { useFilePicker } from 'use-file-picker';
import ConfirmModal from '../components/modals/confirmModal';

const EditSvgDashboardHeader = observer(
  ({ onToDashboardsList, onPreview, onRemove, onSave, onCancel, isValidDashboard, isNew }) => {
    const { t } = useTranslation();
    const title = isNew
      ? t('edit-svg-dashboard.labels.create')
      : t('edit-svg-dashboard.labels.edit');
    return (
      <h1 className="page-header">
        <BootstrapRow>
          <div className="col-md-12">
            <span>{title}</span>
            <div className="pull-right button-group">
              {!isNew && (
                <>
                  <Button
                    label={t('edit-svg-dashboard.buttons.to-dashboards-list')}
                    onClick={onToDashboardsList}
                  />
                  <Button label={t('edit-svg-dashboard.buttons.preview')} onClick={onPreview} />
                </>
              )}
              <Button
                type="success"
                label={t('edit-svg-dashboard.buttons.save')}
                onClick={onSave}
                disabled={!isValidDashboard}
              ></Button>
              {isNew ? (
                <Button label={t('edit-svg-dashboard.buttons.cancel')} onClick={onCancel} />
              ) : (
                <Button
                  type="danger"
                  label={t('edit-svg-dashboard.buttons.remove')}
                  onClick={onRemove}
                />
              )}
            </div>
          </div>
        </BootstrapRow>
      </h1>
    );
  }
);

const SvgFileSelector = observer(({ setSvg, buttonType }) => {
  const [openFileSelector] = useFilePicker({
    accept: '.svg',
    multiple: false,
    onFilesSuccessfulySelected: ({ filesContent }) => {
      setSvg(filesContent[0].content);
    },
  });
  const { t } = useTranslation();
  return (
    <Button
      label={t('edit-svg-dashboard.buttons.load-svg')}
      onClick={() => openFileSelector()}
      type={buttonType}
    />
  );
});

const LeftPanel = observer(({ svgStore, onSelectElement }) => {
  return (
    <div className="col-md-8 svg-edit-left-panel">
      {svgStore.hasSvg ? (
        <SvgView svg={svgStore.svg} onSelectElement={onSelectElement} className="svg-view" />
      ) : (
        <SvgFileSelector setSvg={content => svgStore.setSvg(content)} buttonType="success" />
      )}
    </div>
  );
});

const CommonParametersForm = observer(({ commonParametersStore, svgStore }) => {
  const { t } = useTranslation();
  return (
    <>
      <legend className="flex-rows">
        <span className="flex-max-grow">{t(commonParametersStore.title)}</span>
        {svgStore.hasSvg && (
          <div className="pull-right button-group">
            <SvgFileSelector setSvg={content => svgStore.setSvg(content)} />
            <Button
              title={t('edit-svg-dashboard.buttons.download-svg')}
              onClick={() => svgStore.exportSvg(commonParametersStore.params['name'].value)}
              icon="glyphicon glyphicon-download-alt"
            ></Button>
          </div>
        )}
      </legend>
      {MakeFormFields(Object.entries(commonParametersStore.params))}
    </>
  );
});

const RightPanel = observer(({ pageStore, toJsonEditMode }) => {
  const { t } = useTranslation();
  return (
    <div className="col-md-4 svg-edit-right-panel">
      <div>
        <CommonParametersForm
          commonParametersStore={pageStore.commonParameters}
          svgStore={pageStore.svgStore}
        />
        {pageStore.svgStore.hasSvg && (
          <>
            <legend className="flex-rows">
              <span className="flex-max-grow">{t('edit-svg-dashboard.labels.bindings-title')}</span>
              <Button label={t('edit-svg-dashboard.buttons.edit-json')} onClick={toJsonEditMode} />
            </legend>
            <VisualBindingsEditor store={pageStore.bindingsStore.editable} />
          </>
        )}
      </div>
    </div>
  );
});

const VisualEditMode = ({ pageStore }) => {
  return (
    <BootstrapRow additionalStyles="visual-editor">
      <LeftPanel
        svgStore={pageStore.svgStore}
        onSelectElement={el => pageStore.bindingsStore.onSelectSvgElement(el)}
      ></LeftPanel>
      <RightPanel
        pageStore={pageStore}
        toJsonEditMode={() => pageStore.bindingsStore.startJsonEditing()}
      ></RightPanel>
    </BootstrapRow>
  );
};

const EditSvgDashboardPage = observer(({ pageStore }) => {
  return (
    <div className="svg-edit-page">
      <ErrorBar msg={pageStore.error} />
      <ConfirmModal {...pageStore.confirmModalState} />
      {pageStore.loading ? (
        <Spinner />
      ) : (
        <>
          <EditSvgDashboardHeader
            onToDashboardsList={() => pageStore.onShowDashboardsList()}
            onPreview={() => pageStore.onPreview()}
            onRemove={() => pageStore.onRemoveDashboard()}
            onSave={() => pageStore.onSaveDashboard()}
            onCancel={() => pageStore.onRemoveDashboard()}
            isValidDashboard={pageStore.isValid}
            isNew={pageStore.isNew}
          />
          {pageStore.bindingsStore.jsonEditMode ? (
            <JsonBindingsEditor bindingsStore={pageStore.bindingsStore} />
          ) : (
            <VisualEditMode pageStore={pageStore} />
          )}
        </>
      )}
    </div>
  );
});

function CreateEditSvgDashboardPage({ pageStore }) {
  return <EditSvgDashboardPage pageStore={pageStore}></EditSvgDashboardPage>;
}

export default CreateEditSvgDashboardPage;
