export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Keys extends keyof T
    ? Required<Pick<T, Keys>> & Omit<T, Keys>
    : never;

export interface RpcError {
  message: string;
  code?: number;
  data?: string;
}
