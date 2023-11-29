import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { PageWrapper, PageTitle, PageBody } from '../components/page-wrapper/pageWrapper';
import { Button, LineEdit } from '../common';
import { useTranslation } from 'react-i18next';
import ScriptEditor from './scriptEditor';

const ScriptEditorPage = observer(({ store }) => {
  const { t } = useTranslation();
  var titleRef = useRef();
  var editorRef = useRef();
  useEffect(() => {
    if (store.focusElement === 'title' && titleRef.current) {
      titleRef.current.focus();
      store.setFocusElement(null);
      return;
    }
    if (store.focusElement === 'editor' && editorRef.current) {
      editorRef.current.focus();
      store.setFocusElement(null);
    }
  });
  return (
    <PageWrapper
      error={store.pageWrapperStore.error}
      className={'script-editor-page'}
      accessLevelStore={store.accessLevelStore}
    >
      <PageTitle title={store.isNew ? '' : store.pageWrapperStore.title}>
        {store.isNew && (
          <div className="pull-left" style={{ width: '70%' }}>
            <LineEdit
              ref={titleRef}
              value={store.pageWrapperStore.title}
              onChange={e => store.setFileName(e.target.value)}
            />
          </div>
        )}
        <Button
          type="success"
          label={t('edit-svg-dashboard.buttons.save')}
          onClick={() => store.save()}
          additionalStyles={'pull-right'}
          disabled={!store.canSave}
        />
      </PageTitle>
      <PageBody loading={store.pageWrapperStore.loading} renderChildren={true}>
        <ScriptEditor
          ref={editorRef}
          text={store.ruleText}
          errorLine={store.errorLine}
          onChange={value => store.setRuleText(value)}
          visible={!store.pageWrapperStore.loading}
        />
      </PageBody>
    </PageWrapper>
  );
});

function CreateScriptEditorPage({ store }) {
  return <ScriptEditorPage store={store} />;
}

export default CreateScriptEditorPage;
