import { ObjectStore, Translator } from '@/stores/json-schema-editor';
import { ObjectParamEditor } from './object-param-editor';
import './styles.css';

interface JsonSchemaEditorProps {
  store: ObjectStore;
  translator: Translator;
}

export const JsonSchemaEditor = ({ store, translator }: JsonSchemaEditorProps) => {
  return (
    <div className="wb-jsonEditor">
      <ObjectParamEditor store={store} translator={translator}/>
    </div>
  );
};
