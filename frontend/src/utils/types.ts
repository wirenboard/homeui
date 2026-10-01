export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Keys extends keyof T
    ? Required<Pick<T, Keys>> & Omit<T, Keys>
    : never;

// Result of JSON.rawJSON, JSON.stringify outputs its text as is
export interface RawJson {
  readonly rawJSON: string;
}

export interface JsonParseContext {
  source?: string;
}

export type JsonReviver = (key: string, value: unknown, context?: JsonParseContext) => unknown;
