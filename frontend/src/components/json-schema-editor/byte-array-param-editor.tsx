import { observer } from 'mobx-react-lite';
import { Input } from '@/components/input';
import type { ByteArrayEditorProps } from './types';

const ByteArrayEditor = observer(({
  store,
  inputId,
  descriptionId,
  errorId,
}: ByteArrayEditorProps) => {
  return (
    <Input
      id={inputId}
      value={store.editString}
      ariaDescribedby={descriptionId}
      ariaInvalid={store.hasErrors}
      ariaErrorMessage={errorId}
      onChange={(value) => store.setEditString(String(value))}
    />
  );
});

export default ByteArrayEditor;
