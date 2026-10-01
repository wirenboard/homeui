import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import PlusIcon from '@/assets/icons/plus.svg';
import { Button } from '@/components/button';
import { type BooleanStore } from '@/stores/json-schema-editor';
import BooleanEditor from './boolean-param-editor';
import type { BooleanArrayEditorProps } from './types';

const BooleanArrayEditor = observer(({ store, translator } : BooleanArrayEditorProps) => {
  const { t } = useTranslation();
  const showAddButton = !store.schema.options?.wb?.read_only &&
    (store.schema.maxItems === undefined ||
     store.schema.minItems === undefined ||
     store.schema.maxItems !== store.schema.minItems);
  return (
    <div className="wb-jsonEditor-arrayEditor wb-jsonEditor-arrayEditor-horizontal">
      {store.items.map((item, index) => (
        <BooleanEditor
          key={index}
          store={item as BooleanStore}
          translator={translator}
          titleOverride={String(index)}
        />
      ))}
      {showAddButton && (
        <Button
          label={t('common.buttons.add')}
          icon={<PlusIcon />}
          size="small"
          className="wb-jsonEditor-addButton"
          onClick={() => store.addItem()}
        />
      )}
    </div>
  );
});

export default BooleanArrayEditor;
