import { type ExposeCheckStore } from './store';

export interface ExposeCheckProps {
  store: ExposeCheckStore;
}

export enum ExposeCheckStatus {
  Found = 'found',
  NotFound = 'not-found',
}

type Host = string;
type Port = string;
type Protocol = 'ssh' | 'mqtt' | 'http';

export type ExposeDetail = [Host, Port, Protocol];

export interface CheckResult {
  result: ExposeCheckStatus;
  details: ExposeDetail[];
}
