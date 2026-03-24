import { ObjectStore, Translator } from '@/stores/json-schema-editor';
import { formatError } from '@/utils/formatError';

export abstract class BaseItemStore {
  public objectStore: ObjectStore | null = null;
  public translator: Translator | null = null;
  public isLoading = true;
  public label: string;
  public error: string | null = null;
  readonly id: string;
  protected readonly daliProxy: any;

  constructor(daliProxy: any, id: string, name: string) {
    this.daliProxy = daliProxy;
    this.id = id;
    this.label = name;
  }

  setError(error: unknown) {
    if (!error) {
      this.error = null;
      return;
    }
    this.error = formatError(error);
  }
}
