import { type ObjectStore, type Translator } from '@/stores/json-schema-editor';
import { formatError } from '@/utils/format-error';

export enum ItemType {
  Gateway = 'gateway',
  Bus = 'bus',
  Device = 'device',
  Group = 'group',
}

export abstract class BaseItemStore {
  public objectStore: ObjectStore | null = null;
  public translator: Translator | null = null;
  public isLoading = true;
  public label: string;
  public error: string | null = null;
  readonly id: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.label = name;
  }

  setError(error: unknown) {
    this.error = error ? formatError(error) : null;
  }
}
