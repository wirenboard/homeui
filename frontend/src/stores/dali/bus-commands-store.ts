import { runInAction, makeObservable, observable, action, computed } from 'mobx';
import { daliBusProxy } from '@/services';
import { formatError } from '@/utils/format-error';
import type {
  ListCommandsEntry,
  SendCommandResponseValue,
  SendCommandResultItem,
} from './types';

export const NOT_SENT_MARKER = '__not_sent__';

export interface ResultRow {
  command: string;
  status: 'ok' | 'error';
  response?: SendCommandResponseValue;
  error?: string;
}

export class BusCommandsStore {
  public text: string = '';
  public results: ResultRow[] | null = null;
  public runError: string | null = null;
  public truncated: boolean = false;
  public isRunning: boolean = false;

  public catalog: ListCommandsEntry[] | null = null;
  public isCatalogLoading: boolean = false;
  public catalogError: string | null = null;
  public isCatalogModalOpen: boolean = false;

  readonly busId: string;

  constructor(busId: string) {
    this.busId = busId;

    makeObservable(this, {
      text: observable,
      results: observable.shallow,
      runError: observable,
      truncated: observable,
      isRunning: observable,
      catalog: observable.shallow,
      isCatalogLoading: observable,
      catalogError: observable,
      isCatalogModalOpen: observable,
      hasRunnableCommands: computed,
      setText: action,
      run: action,
      loadCatalog: action,
      openCatalog: action,
      closeCatalog: action,
    });
  }

  get hasRunnableCommands(): boolean {
    return this.parseCommands().length > 0;
  }

  parseCommands(): string[] {
    return this.text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  setText(value: string) {
    this.text = value;
  }

  async run() {
    const commands = this.parseCommands();
    if (!commands.length || this.isRunning) {
      return;
    }

    runInAction(() => {
      this.isRunning = true;
      this.runError = null;
      this.truncated = false;
    });

    try {
      const result = await daliBusProxy.SendCommand({ busId: this.busId, commands });
      const rows: ResultRow[] = commands.map((command, i) => {
        const item: SendCommandResultItem | undefined = result[i];
        if (item === undefined) {
          return { command, status: 'error', error: NOT_SENT_MARKER };
        }
        return {
          command,
          status: item.status,
          response: item.response,
          error: item.error,
        };
      });
      runInAction(() => {
        this.results = rows;
        this.truncated = result.length < commands.length;
      });
    } catch (error) {
      runInAction(() => {
        this.runError = formatError(error);
      });
    } finally {
      runInAction(() => {
        this.isRunning = false;
      });
    }
  }

  async loadCatalog() {
    if (this.catalog !== null || this.isCatalogLoading) {
      return;
    }

    runInAction(() => {
      this.isCatalogLoading = true;
      this.catalogError = null;
    });

    try {
      const entries = await daliBusProxy.ListCommands({});
      runInAction(() => {
        this.catalog = entries;
      });
    } catch (error) {
      runInAction(() => {
        this.catalogError = formatError(error);
      });
    } finally {
      runInAction(() => {
        this.isCatalogLoading = false;
      });
    }
  }

  openCatalog() {
    this.isCatalogModalOpen = true;
    this.loadCatalog();
  }

  closeCatalog() {
    this.isCatalogModalOpen = false;
  }
}
