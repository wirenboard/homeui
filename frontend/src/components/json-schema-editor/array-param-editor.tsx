import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ArrowDownIcon from '@/assets/icons/arrow-down.svg';
import ArrowUpIcon from '@/assets/icons/arrow-up.svg';
import PlusIcon from '@/assets/icons/plus.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Card } from '@/components/card';
import { ArrayStore, ObjectStore, Translator } from '@/stores/json-schema-editor';
import { Button } from '../button';
import type { ArrayEditorProps, EditorBuilderFunction } from './types';

const ArrayItem = observer((
  { index, store, translator, editorBuilder }:
  { index: number; store: ArrayStore; translator: Translator; editorBuilder: EditorBuilderFunction }
) => {
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

  // Don't want to implement full json-editor's headerTemplate logic here, just a simple version
  let title = (item as ObjectStore)?.getParamByKey('name')?.store.value;
  if (title === undefined || title === '') {
    title = (item as ObjectStore)?.getParamByKey('title')?.store.value;
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
      {editorBuilder({ store: item, translator })}
    </Card>
  );
});

const ArrayEditor = observer(({ store, translator, editorBuilder } : ArrayEditorProps) => {
  const { t } = useTranslation();
  if (!editorBuilder) {
    return null;
  }
  return (
    <div className="wb-jsonEditor-arrayEditor">
      {store.items.map((_item, i) => (
        <ArrayItem
          key={i}
          index={i}
          store={store}
          translator={translator}
          editorBuilder={editorBuilder}
        />
      ))}
      <Button
        label={t('common.buttons.add')}
        icon={<PlusIcon />}
        size="small"
        className="wb-jsonEditor-addButton"
        onClick={() => store.addItem()}
      />
    </div>
  );
});

export default ArrayEditor;
