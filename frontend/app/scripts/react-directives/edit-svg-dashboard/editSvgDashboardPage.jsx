import { observer } from 'mobx-react-lite';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useFilePicker } from 'use-file-picker';
import { BootstrapRow, Button } from '../common';
import ConfirmModal from '../components/modals/confirmModal';
import { PageWrapper, PageBody } from '../components/page-wrapper/pageWrapper';
import { MakeFormFields, FormCheckbox, FormSelect } from '../forms/forms';
import SvgView from './svgView';
import VisualBindingsEditor from './visualBindingsEditor';

const JsonBindingsEditor = lazy(() => import('./jsonBindingsEditor'));

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
                <Button label={t('edit-svg-dashboard.buttons.preview')} onClick={onPreview} />
              )}
              {isNew ? (
                <Button label={t('edit-svg-dashboard.buttons.cancel')} onClick={onCancel} />
              ) : (
                <Button
                  type="danger"
                  label={t('edit-svg-dashboard.buttons.remove')}
                  onClick={onRemove}
                />
              )}

              <Button
                type="primary"
                label={t('edit-svg-dashboard.buttons.save')}
                disabled={!isValidDashboard}
                onClick={onSave}
              />
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
      type={buttonType}
      onClick={() => openFileSelector()}
    />
  );
});

const LeftPanel = observer(({ svgStore, onSelectElement }) => {
  return (
    <div className="col-md-8 svg-edit-left-panel">
      {svgStore.hasSvg ? (
        <SvgView svg={svgStore.svg} className="svg-view" onSelectElement={onSelectElement} />
      ) : (
        <SvgFileSelector setSvg={(content) => svgStore.setSvg(content)} buttonType="primary" />
      )}
    </div>
  );
});

const CommonParametersForm = observer(({ commonParametersStore, svgStore, children }) => {
  const { t } = useTranslation();
  return (
    <>
      <legend className="flex-rows">
        <span className="flex-max-grow">{t(commonParametersStore.title)}</span>
        {svgStore.hasSvg && (
          <div className="pull-right button-group">
            <SvgFileSelector setSvg={(content) => svgStore.setSvg(content)} buttonType="primary" />
            <Button
              title={t('edit-svg-dashboard.buttons.download-svg')}
              icon="glyphicon glyphicon-download-alt"
              onClick={() => svgStore.exportSvg(commonParametersStore.params['name'].value)}
            />
          </div>
        )}
      </legend>
      {MakeFormFields(Object.entries(commonParametersStore.params))}
      {children}
    </>
  );
});

export const SwipeParametersForm = observer(({ store }) => {
  if (!store || !store.hasProperties) {
    return null;
  }
  return (
    <div>
      <FormCheckbox key={store.params.enable.id} store={store.params.enable} />
      {store.params.enable.value && (
        <>
          <FormSelect store={store.params.left} isClearable={true} />
          <FormSelect store={store.params.right} isClearable={true} />
        </>
      )}
    </div>
  );
});

const RightPanel = observer(({ pageStore, toJsonEditMode }) => {
  const { t } = useTranslation();
  return (
    <div className="col-md-4 svg-edit-right-panel">
      <div>
        {pageStore.svgStore.hasSvg && (
          <>
            <legend className="flex-rows">
              <span className="flex-max-grow">{t('edit-svg-dashboard.labels.bindings-title')}</span>
              <Button label={t('edit-svg-dashboard.buttons.edit-json')} onClick={toJsonEditMode} />
            </legend>
            <label>{t('edit-svg-dashboard.labels.select-caption')}</label>
            <VisualBindingsEditor store={pageStore.bindingsStore.editable} />
          </>
        )}
        <CommonParametersForm
          commonParametersStore={pageStore.commonParameters}
          svgStore={pageStore.svgStore}
        >
          <SwipeParametersForm store={pageStore.swipeParameters} />
        </CommonParametersForm>
      </div>
    </div>
  );
});

const VisualEditMode = ({ pageStore }) => {
  return (
    <BootstrapRow additionalStyles="visual-editor">
      <LeftPanel
        svgStore={pageStore.svgStore}
        onSelectElement={(el) => pageStore.bindingsStore.onSelectSvgElement(el)}
      />
      <RightPanel
        pageStore={pageStore}
        toJsonEditMode={() => pageStore.bindingsStore.startJsonEditing()}
      />
    </BootstrapRow>
  );
};

const EditSvgDashboardPage = observer(({ pageStore }) => {
  return (
    <PageWrapper
      error={pageStore.pageWrapperStore.error}
      className="svg-edit-page"
      accessLevelStore={pageStore.accessLevelStore}
    >
      <PageBody loading={pageStore.pageWrapperStore.loading}>
        <ConfirmModal {...pageStore.confirmModalState} />
        <EditSvgDashboardHeader
          isNew={pageStore.isNew}
          isValidDashboard={pageStore.isValid}
          onToDashboardsList={() => pageStore.onShowDashboardsList()}
          onPreview={() => pageStore.onPreview()}
          onRemove={() => pageStore.onRemoveDashboard()}
          onSave={() => pageStore.onSaveDashboard()}
          onCancel={() => pageStore.onRemoveDashboard()}
        />
        {pageStore.bindingsStore.jsonEditMode ? (
          <Suspense>
            <JsonBindingsEditor bindingsStore={pageStore.bindingsStore} />
          </Suspense>
        ) : (
          <VisualEditMode pageStore={pageStore} />
        )}
      </PageBody>
    </PageWrapper>
  );
});

function CreateEditSvgDashboardPage({ pageStore }) {
  return <EditSvgDashboardPage pageStore={pageStore} />;
}

export default CreateEditSvgDashboardPage;
