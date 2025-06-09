import { ObjectParamEditor } from './object-param-editor';
import type { JsonSchemaEditorProps } from './types';
import './styles.css';

export const JsonSchemaEditor = ({ store, translator }: JsonSchemaEditorProps) => {
  return (
    <div className="wb-jsonEditor">
      <ObjectParamEditor store={store} translator={translator}/>
    </div>
  );
};
