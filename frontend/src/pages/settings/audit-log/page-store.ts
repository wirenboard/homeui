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
  action?: string;
  login?: string;
  name?: string;
  old_id?: string;
  new_id?: string;
  old_name?: string;
  new_name?: string;
  widget_name?: string;
  dashboard_name?: string;
  path?: string;
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
  public filterUser: string | null = null;
  public filterScope: string | null = null;
  public availableUsers: string[] = [];
  public availableScopes: string[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  get totalPages() {
    return Math.ceil(this.total / this.pageSize);
  }

  async loadOptions() {
    try {
      const { users, scopes } = await request
        .get<{ users: string[]; scopes: string[] }>('/audit-log/options')
        .then(({ data }) => data);
      runInAction(() => {
        this.availableUsers = users;
        this.availableScopes = scopes;
      });
    } catch {
      // Silently ignore options loading errors.
    }
  }

  async load(page = 0) {
    if (page === 0) {
      this.loadOptions();
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = false;
    });
    const offset = page * this.pageSize;
    const params: Record<string, unknown> = { limit: this.pageSize, offset };

    if (this.filterUser) {
      params.login = this.filterUser;
    }

    if (this.filterScope) {
      params.scope = this.filterScope;
    }

    try {
      const { entries, total } = await request
        .get<{ entries: AuditLogEntry[]; total: number }>('/audit-log', {
          params,
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

  setFilterUser(value: string | null) {
    this.filterUser = value;
    this.load(0);
  }

  setFilterScope(value: string | null) {
    this.filterScope = value;
    this.load(0);
  }
}

export const auditLogStore = new AuditLogPageStore();
