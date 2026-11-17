import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ArrowDownIcon from '@/assets/icons/arrow-down.svg';
import ArrowUpIcon from '@/assets/icons/arrow-up.svg';
import PlusIcon from '@/assets/icons/plus.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { type ObjectStore } from '@/stores/json-schema-editor';
import { type ArrayEditorProps, type ArrayItemProps } from './types';

const ArrayItem = observer(({ index, store, rootStore, translator, editorBuilder }: ArrayItemProps) => {
  const { t } = useTranslation();
  const [isBodyVisible, setIsBodyVisible] = useState(true);
  const actions = [
    {
      title: t('common.buttons.move-down'),
      action: () => store.moveDownItem(index),
      icon: ArrowDownIcon,
      disabled: index === store.items.length - 1,
    },
    {
      title: t('common.buttons.move-up'),
      action: () => store.moveUpItem(index),
      icon: ArrowUpIcon,
      disabled: index === 0,
    },
    {
      title: t('common.buttons.remove'),
      action: () => store.removeItem(index),
      icon: TrashIcon,
    },
  ];

  const item = store.items[index];

  let title = '';
  if (item?.storeType === 'object') {
    // Don't want to implement full json-editor's headerTemplate logic here, just a simple version
    title = (item as ObjectStore)?.getParamByKey('name')?.store.value as string;
    if (title === undefined || title === '') {
      title = (item as ObjectStore)?.getParamByKey('title')?.store.value as string;
    }
    return (
      <Card
        heading={title && String(title)}
        variant="secondary"
        withError={item.hasErrors}
        isBodyVisible={isBodyVisible}
        toggleBody={() => setIsBodyVisible(!isBodyVisible)}
        actions={actions}
      >
        {editorBuilder({ store: item, rootStore, translator })}
      </Card>
    );
  }
  return editorBuilder({ store: item, rootStore, translator });
});

const ArrayEditor = observer(({ store, rootStore, translator, editorBuilder } : ArrayEditorProps) => {
  const { t } = useTranslation();
  if (!editorBuilder) {
    return null;
  }
  const showAddButton = !store.schema.options?.wb?.read_only &&
    (store.schema.maxItems === undefined ||
     store.schema.minItems === undefined ||
     store.schema.maxItems !== store.schema.minItems);

  return (
    <div className="wb-jsonEditor-arrayEditor">
      {store.items.map((_item, i) => (
        <ArrayItem
          key={i}
          index={i}
          store={store}
          rootStore={rootStore}
          translator={translator}
          editorBuilder={editorBuilder}
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

export default ArrayEditor;
