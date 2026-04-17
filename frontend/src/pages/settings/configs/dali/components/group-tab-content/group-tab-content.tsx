import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import { Loader } from '@/components/loader';
import type { GroupStore } from '@/stores/dali';
import type { ObjectParamStore } from '@/stores/json-schema-editor';
import { useAsyncAction } from '@/utils/async-action';
import './styles.css';

const MAX_SLOTS = 12;

const GroupParam = observer(({ store, param }: { store: GroupStore; param: ObjectParamStore }) => {
  const { t, i18n } = useTranslation();
  const [save, isSaving] = useAsyncAction(async () => {
    await store.saveParam(param.key);
  });

  const gridColumns = param.store.schema.options?.grid_columns;
  const style: CSSProperties = {};
  if (gridColumns) {
    style.flexGrow = 1;
    style.flexBasis = gridColumns === 12 ? '100%' : `${(gridColumns / 12) * 100 - 7}%`;
  }

  return (
    <div key={param.key} className="dali-groupParam" style={style}>
      <div className="dali-groupParam-header">
        <span>{store.translator.find(param.store.schema.title || param.key, i18n.language)}</span>
        <Button
          label={t('dali.buttons.set')}
          isLoading={isSaving}
          disabled={param.store.hasErrors}
          onClick={save}
        />
      </div>
      <div
        className={classNames('dali-groupParam-editor', {
          'wb-jsonEditor-objectEditorWithBorder': param.store.storeType === 'object',
        })}
      >
        <JsonSchemaEditor
          store={param.store}
          translator={store.translator}
        />
      </div>
    </div>
  );
});

export const GroupTabContent = observer(({ store }: { store: GroupStore }) => {
  if (store.isLoading) {
    return (
      <div className="dali-contentLoader">
        <Loader />
      </div>
    );
  }

  if (!store.objectStore) {
    return null;
  }

  const params = store.objectStore.params.filter((p) => !p.hidden);

  const rows: (typeof params)[] = [];
  let currentRow: typeof params = [];
  let slotsInRow = 0;
  for (const param of params) {
    const gridColumns = param.store.schema.options?.grid_columns ?? MAX_SLOTS + 1;
    if (slotsInRow === 0 || slotsInRow + gridColumns <= MAX_SLOTS) {
      slotsInRow += gridColumns;
      currentRow.push(param);
    } else {
      rows.push(currentRow);
      currentRow = [param];
      slotsInRow = gridColumns;
    }
  }
  if (currentRow.length) {
    rows.push(currentRow);
  }

  return (
    <>
      {rows.map((rowParams) => {
        const rowKey = rowParams.map((p) => p.key).join('-');
        const items = rowParams.map((param) => (
          <GroupParam key={param.key} store={store} param={param} />
        ));
        if (rowParams.length === 1) {
          return items[0];
        }
        return (
          <div key={rowKey} className="wb-jsonEditor-objectEditorRow">
            {items}
          </div>
        );
      })}
    </>
  );
});
