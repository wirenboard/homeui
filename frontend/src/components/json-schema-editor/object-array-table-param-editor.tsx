import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import PlusIcon from '@/assets/icons/plus.svg';
import { MOBILE_MAX_WIDTH } from '@/common/breakpoints';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Table, TableRow, TableCell } from '@/components/table';
import { type ObjectStore, comparePropertyOrder, type JsonSchema } from '@/stores/json-schema-editor';
import { ParamError } from './param-error';
import type { ArrayEditorProps, ParamEditorProps } from './types';

const ParamEditor = observer(({
  paramStore,
  rootStore,
  translator,
  editorBuilder,
  label,
}: ParamEditorProps) => {
  const errorId = useId();
  const inputId = useId();
  return (
    <div
      className={classNames('wb-jsonEditor-objectProperty')}
    >
      {label && (
        <label
          htmlFor={inputId}
          className={classNames('wb-jsonEditor-propertyLabel', {
            'wb-jsonEditor-propertyLabelError': paramStore.store.hasErrors,
          })}
        >
          {label}
        </label>
      )}
      {editorBuilder({ store: paramStore.store, rootStore, paramId: paramStore.key, translator, inputId, errorId })}
      {paramStore.store.hasErrors && (
        <ParamError
          id={errorId}
          error={paramStore.store.error}
          translator={translator}
        />
      )}
    </div>
  );
});

const ObjectArrayTableEditorDesktop = observer(({
  store,
  rootStore,
  translator,
  editorBuilder,
}: ArrayEditorProps) => {
  const { i18n } = useTranslation();
  const indexColumnWidth = 20;
  const columnSize = 50;
  return (
    <Table style={{ color: 'var(--wb-color-text-primary)' }}>
      <TableRow isHeading>
        <TableCell key="index_header" width={indexColumnWidth}/>
        {Object.entries((store.schema.items as JsonSchema).properties)
          .sort(comparePropertyOrder)
          .map(([_key, prop], index) => (
            <TableCell
              key={`header_${index}`}
              width={prop.options?.grid_columns ?
                prop.options?.grid_columns * columnSize : undefined}
            >
              {translator.find(prop.title, i18n.language)}
            </TableCell>
          ))}
      </TableRow>
      {store.items.map((itemStore, index) => (
        <TableRow key={index}>
          <TableCell key={`index_${index}`} width={indexColumnWidth}>
            {index}
          </TableCell>
          {(itemStore as ObjectStore).params.map((paramStore) => (
            <TableCell
              key={`${paramStore.key}-${index}`}
              width={paramStore.store.schema.options?.grid_columns
                ? paramStore.store.schema.options?.grid_columns * columnSize
                : undefined}
            >
              <ParamEditor
                paramStore={paramStore}
                rootStore={rootStore}
                translator={translator}
                editorBuilder={editorBuilder}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </Table>
  );
});

const ObjectArrayTableEditorMobile = observer(({
  store,
  rootStore,
  translator,
  editorBuilder,
}: ArrayEditorProps) => {
  const { i18n } = useTranslation();
  return (
    <div className="wb-jsonEditor-arrayEditor">
      {store.items.map((itemStore, index) => (
        <Card
          key={index}
          heading={`#${index}`}
          variant="secondary"
          withError={itemStore.hasErrors}
        >
          <div className="wb-jsonEditor-objectEditor">
            {(itemStore as ObjectStore).params.map((paramStore) => (
              <ParamEditor
                key={paramStore.key}
                // A non-compact boolean shows its own title, like in EditorCommonWrapper
                label={paramStore.store.storeType !== 'boolean' || paramStore.store.schema.options?.compact
                  ? translator.find(paramStore.store.schema.title || paramStore.key, i18n.language)
                  : undefined}
                paramStore={paramStore}
                rootStore={rootStore}
                translator={translator}
                editorBuilder={editorBuilder}
              />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
});

const ObjectArrayTableEditor = observer(({ store, rootStore, translator, editorBuilder } : ArrayEditorProps) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: MOBILE_MAX_WIDTH });
  if (!editorBuilder) {
    return null;
  }
  const showAddButton = !store.schema.options?.wb?.read_only &&
    (store.schema.maxItems === undefined ||
     store.schema.minItems === undefined ||
     store.schema.maxItems !== store.schema.minItems);
  // A single column fits a phone screen as a table
  const Editor = isMobile && Object.keys((store.schema.items as JsonSchema).properties).length > 1
    ? ObjectArrayTableEditorMobile
    : ObjectArrayTableEditorDesktop;
  return (
    <>
      <Editor store={store} rootStore={rootStore} translator={translator} editorBuilder={editorBuilder} />
      {showAddButton && (
        <Button
          label={t('common.buttons.add')}
          icon={<PlusIcon />}
          size="small"
          className="wb-jsonEditor-addButton"
          onClick={() => store.addItem()}
        />
      )}
    </>
  );
});

export default ObjectArrayTableEditor;
