import React from 'react';
import { observer } from 'mobx-react-lite';
import { PageWrapper, PageTitle, PageBody } from '../components/page-wrapper/pageWrapper';
import { useTranslation } from 'react-i18next';
import { Button } from '../common';
import SelectControlsModal from './selectControlsModal';
import ConfirmModal from '../components/modals/confirmModal';

import {
  Form,
  ShowParamCaptionContext,
  CustomEditorBuilderContext,
  MakeFormFields,
  FormStringEdit,
} from '../forms/forms';

export const RegistersForm = observer(({ pageStore, registersStore }) => {
  const { t } = useTranslation();
  return (
    <div>
      <legend
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '10px',
          alignItems: 'baseline',
          paddingBottom: '5px',
        }}
      >
        <span>{registersStore.name}</span>
        <Button label={t('mbgate.buttons.add')} onClick={() => pageStore.addControls()} />
      </legend>
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '10px' }}>
        <ShowParamCaptionContext.Provider value={true}>
          {MakeFormFields(Object.entries(registersStore.params))}
        </ShowParamCaptionContext.Provider>
      </div>
    </div>
  );
});

const MbGateSettingsPage = observer(({ pageStore }) => {
  const { t } = useTranslation();
  const buildRegistersForm = (param, key) => {
    if (key === 'registers') {
      return <RegistersForm pageStore={pageStore} registersStore={param} key={key} />;
    }
    if (key?.startsWith('topic')) {
      return (
        <div style={{ minWidth: '300px' }}>
          <FormStringEdit key={key} store={param} />
        </div>
      );
    }
    return null;
  };
  return (
    <PageWrapper
      error={pageStore.pageWrapperStore.error}
      className="mbgate-page"
      accessLevelStore={pageStore.accessLevelStore}
    >
      <SelectControlsModal state={pageStore.selectControlsModalState} />
      <ConfirmModal {...pageStore.selectControlsModalState.confirmModalState} />
      <PageTitle title={t('mbgate.title')}>
        <Button
          type="success"
          label={t('mbgate.buttons.save')}
          onClick={() => pageStore.save()}
          additionalStyles={'pull-right'}
          disabled={!pageStore.allowSave}
        />
      </PageTitle>
      <PageBody loading={pageStore.pageWrapperStore.loading}>
        <ShowParamCaptionContext.Provider value={false}>
          <CustomEditorBuilderContext.Provider value={buildRegistersForm}>
            <Form store={pageStore.paramsStore} />
          </CustomEditorBuilderContext.Provider>
        </ShowParamCaptionContext.Provider>
      </PageBody>
    </PageWrapper>
  );
});

function CreateMbGateSettingsPage({ pageStore }) {
  return <MbGateSettingsPage pageStore={pageStore} />;
}

export default CreateMbGateSettingsPage;
