// Store for the Audit Log page — loads and paginates audit log entries from the backend.
import { makeAutoObservable, runInAction } from 'mobx';
import { request } from '@/utils/request';

export interface AuditLogEntry {
  id: number;
  timestamp: number;
  login: string;
  scope: string;
  event: AuditLogEntryEvent;
}

export interface AuditLogEntryEvent {
  text?: string;
  ip?: string;
  ua?: string;
  ua_pretty?: string;
}

class AuditLogPageStore {
  public entries: AuditLogEntry[] = [];
  public isLoading = false;
  public page = 0;
  public pageSize = 20;
  public total = 0;
  public error = false;

  constructor() {
    makeAutoObservable(this);
  }

  get totalPages() {
    return Math.ceil(this.total / this.pageSize);
  }

  async load(page = 0) {
    runInAction(() => {
      this.isLoading = true;
      this.error = false;
    });
    const offset = page * this.pageSize;
    try {
      const { entries, total } = await request
        .get<{ entries: AuditLogEntry[]; total: number }>('/audit-log', {
          params: { limit: this.pageSize, offset },
        })
        .then(({ data }) => data);
      runInAction(() => {
        this.entries = entries;
        this.page = page;
        this.total = total;
      });
    } catch {
      runInAction(() => {
        this.error = true;
      });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async loadPage(page: number) {
    if (page < 0 || page >= this.totalPages || this.isLoading) {
      return;
    }
    await this.load(page);
  }
}

export const auditLogStore = new AuditLogPageStore();
