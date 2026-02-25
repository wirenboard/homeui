import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import PlusIcon from '@/assets/icons/plus.svg';
import { Button } from '@/components/button';
import { Table, TableRow, TableCell } from '@/components/table';
import { type ObjectStore, comparePropertyOrder } from '@/stores/json-schema-editor';
import { ParamError } from './param-error';
import { type ArrayEditorProps, type TableCellWithEditorProps } from './types';

const TableCellWithEditor = observer(({
  paramStore,
  translator,
  editorBuilder,
  width,
}: TableCellWithEditorProps) => {
  const errorId = useId();
  const inputId = useId();
  return (
    <TableCell width={width}>
      <div
        className={classNames('wb-jsonEditor-objectProperty')}
      >
        {editorBuilder({ store: paramStore.store, paramId: paramStore.key, translator, inputId, errorId })}
        {paramStore.store.hasErrors && (
          <ParamError
            id={errorId}
            error={paramStore.store.error}
            translator={translator}
          />
        )}
      </div>
    </TableCell>
  );
});

const ObjectArrayTableEditor = observer(({ store, translator, editorBuilder } : ArrayEditorProps) => {
  const { t, i18n } = useTranslation();
  if (!editorBuilder) {
    return null;
  }
  const showAddButton = !store.schema.options?.wb?.read_only &&
    (store.schema.maxItems === undefined ||
     store.schema.minItems === undefined ||
     store.schema.maxItems !== store.schema.minItems);
  const indexColumnWidth = 20;
  const columnSize = 50;
  return (
    <>
      <Table style={{ color: 'var(--wb-color-text-primary)' }}>
        <TableRow isHeading>
          <TableCell key="index_header" width={indexColumnWidth}/>
          {Object.entries(store.schema.items.properties)
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
              {index + 1}
            </TableCell>
            {(itemStore as ObjectStore).params.map((paramStore) => (
              <TableCellWithEditor
                key={`${paramStore.key}-${index}`}
                width={paramStore.store.schema.options?.grid_columns
                  ? paramStore.store.schema.options?.grid_columns * columnSize
                  : undefined}
                paramStore={paramStore}
                translator={translator}
                editorBuilder={editorBuilder}
              />
            ))}
          </TableRow>
        ))}
      </Table>
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
